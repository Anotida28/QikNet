import crypto from 'crypto';
import { env } from '../env';
import { logger } from '../common/logger';
import { PaymentError } from '../common/errors';
import type { 
  PaynowInitiateRequest, 
  PaynowInitiateResponse, 
  PaynowPollResponse,
  PaynowCredentials 
} from './paynowTypes';

const PAYNOW_URL = 'https://www.paynow.co.zw/interface/remotetransaction';

/**
 * Get Paynow credentials based on currency.
 */
function getCredentials(currency: 'USD' | 'ZIG'): PaynowCredentials {
  if (currency === 'USD') {
    return {
      integrationId: env.PAYNOW_INTEGRATION_ID_USD,
      integrationKey: env.PAYNOW_INTEGRATION_KEY_USD,
    };
  }
  return {
    integrationId: env.PAYNOW_INTEGRATION_ID,
    integrationKey: env.PAYNOW_INTEGRATION_KEY,
  };
}

/**
 * Generate SHA512 hash in field order (not sorted).
 * This replicates the Python sample logic exactly.
 */
function generateHash(data: Record<string, string>, integrationKey: string): string {
  let hashString = '';
  
  for (const key of Object.keys(data)) {
    if (key.toLowerCase() !== 'hash') {
      const value = String(data[key]).trim();
      if (value !== '') {
        hashString += value;
      }
    }
  }
  
  hashString += integrationKey;
  
  return crypto.createHash('sha512').update(hashString, 'utf8').digest('hex').toUpperCase();
}

/**
 * Parse URL-encoded response from Paynow.
 */
function parsePaynowResponse(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  const pairs = text.split('&');
  
  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split('=');
    if (key) {
      result[key.toLowerCase()] = decodeURIComponent(valueParts.join('=') || '');
    }
  }
  
  return result;
}

/**
 * Initiate an EcoCash payment via Paynow.
 */
export async function initiateEcocashPrompt(
  request: PaynowInitiateRequest,
  currency: 'USD' | 'ZIG' = 'USD'
): Promise<PaynowInitiateResponse> {
  const credentials = getCredentials(currency);
  
  // Build data object maintaining field order (important for hash!)
  const data: Record<string, string> = {
    id: credentials.integrationId,
    reference: request.reference,
    amount: request.amount.toFixed(2),
    additionalinfo: request.additionalInfo || `QikNet WiFi - ${request.reference}`,
    returnurl: env.PAYNOW_RETURN_URL,
    resulturl: env.PAYNOW_RESULT_URL,
    authemail: request.email || env.PAYNOW_DEFAULT_EMAIL,
    phone: request.phone,
    method: 'ecocash',
    status: 'Message',
  };
  
  // Generate hash
  data.hash = generateHash(data, credentials.integrationKey);
  
  logger.info('Initiating Paynow payment', { 
    reference: request.reference, 
    phone: request.phone,
    amount: request.amount,
    currency 
  });
  
  try {
    const response = await fetch(PAYNOW_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(data).toString(),
    });
    
    if (!response.ok) {
      logger.error('Paynow HTTP error', { status: response.status });
      throw new PaymentError(`Paynow returned HTTP ${response.status}`);
    }
    
    const text = await response.text();
    logger.debug('Paynow raw response', { text });
    
    const parsed = parsePaynowResponse(text);
    
    // Check status
    const status = parsed.status?.toLowerCase();
    
    if (status === 'ok') {
      logger.info('Paynow payment initiated successfully', { 
        reference: request.reference,
        pollUrl: parsed.pollurl,
      });
      
      return {
        success: true,
        pollUrl: parsed.pollurl,
        instructions: parsed.instructions,
        browserUrl: parsed.browserurl,
        providerRef: parsed.paynowreference,
      };
    } else if (status === 'error') {
      logger.error('Paynow returned error', { error: parsed.error });
      return {
        success: false,
        error: parsed.error || 'Unknown Paynow error',
      };
    } else {
      // Unexpected status
      logger.warn('Unexpected Paynow status', { status, parsed });
      return {
        success: false,
        error: `Unexpected status: ${status}`,
      };
    }
  } catch (error) {
    if (error instanceof PaymentError) throw error;
    
    logger.error('Paynow request failed', { error });
    throw new PaymentError('Failed to connect to Paynow');
  }
}

/**
 * Poll a Paynow transaction for status updates.
 */
export async function pollTransaction(pollUrl: string): Promise<PaynowPollResponse> {
  logger.debug('Polling Paynow transaction', { pollUrl });
  
  try {
    const response = await fetch(pollUrl);
    
    if (!response.ok) {
      logger.error('Paynow poll HTTP error', { status: response.status });
      return {
        success: false,
        status: 'FAILED',
        error: `HTTP ${response.status}`,
      };
    }
    
    const text = await response.text();
    logger.debug('Paynow poll raw response', { text });
    
    const parsed = parsePaynowResponse(text);
    
    // Map Paynow status to our status
    const paynowStatus = parsed.status?.toLowerCase();
    
    // TODO: Verify exact status strings from Paynow documentation
    // These mappings are based on common Paynow responses
    let status: PaynowPollResponse['status'];
    
    switch (paynowStatus) {
      case 'paid':
      case 'awaiting delivery':
      case 'delivered':
        status = 'PAID';
        break;
      case 'created':
      case 'sent':
        status = 'PENDING';
        break;
      case 'cancelled':
        status = 'CANCELLED';
        break;
      case 'failed':
      case 'disputed':
      case 'refunded':
        status = 'FAILED';
        break;
      default:
        // Unknown status, treat as pending
        logger.warn('Unknown Paynow status', { paynowStatus });
        status = 'PENDING';
    }
    
    logger.info('Paynow poll result', { 
      pollUrl, 
      paynowStatus, 
      mappedStatus: status 
    });
    
    return {
      success: true,
      status,
      amount: parsed.amount ? parseFloat(parsed.amount) : undefined,
      reference: parsed.reference,
      paynowReference: parsed.paynowreference,
    };
  } catch (error) {
    logger.error('Paynow poll failed', { error, pollUrl });
    return {
      success: false,
      status: 'FAILED',
      error: 'Failed to poll Paynow',
    };
  }
}
