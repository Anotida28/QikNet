import { z } from 'zod';
import { getPlanPrice, isValidPlan, isValidCurrency, type PlanId, type Currency } from '../../plans';
import { generatePaymentReference, generateVoucherCode, calculateExpiry, formatExpiry } from '../../voucherLogic';
import { initiateEcocashPrompt, pollTransaction } from '../../paynow/paynowClient';
import { logger } from '../../common/logger';
import { BadRequestError, NotFoundError, PaymentError } from '../../common/errors';
import { validate, phoneSchema, planSchema, currencySchema, paymentMethodSchema } from '../../common/validate';
import * as paymentsRepo from './payments.repo';
import * as vouchersRepo from '../vouchers/vouchers.repo';

// Request validation schema
const initiatePaymentSchema = z.object({
  phone: phoneSchema,
  plan: planSchema,
  currency: currencySchema,
  method: paymentMethodSchema,
});

export interface InitiatePaymentRequest {
  phone: string;
  plan: string;
  currency: string;
  method: string;
}

export interface InitiatePaymentResponse {
  success: true;
  reference: string;
  message: string;
}

export interface PaymentStatusResponse {
  success: true;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
  voucher?: string;
  expiry?: string;
}

/**
 * Initiate a new EcoCash payment.
 */
export async function initiatePayment(
  request: InitiatePaymentRequest
): Promise<InitiatePaymentResponse> {
  // Validate request
  const data = validate(initiatePaymentSchema, request);
  
  // Get server-side price (never trust frontend amount)
  const amount = getPlanPrice(data.plan, data.currency as Currency);
  if (amount === undefined) {
    throw new BadRequestError(`Invalid plan or currency: ${data.plan}, ${data.currency}`);
  }
  
  // Generate unique reference
  const reference = generatePaymentReference();
  
  // Normalize phone number
  let phone = data.phone.replace(/\s+/g, '');
  if (phone.startsWith('0')) {
    phone = '+263' + phone.substring(1);
  } else if (!phone.startsWith('+')) {
    phone = '+263' + phone;
  }
  
  logger.info('Initiating payment', { reference, phone, plan: data.plan, amount, currency: data.currency });
  
  // Initiate Paynow payment
  const paynowResult = await initiateEcocashPrompt(
    { reference, phone, amount },
    data.currency as 'USD' | 'ZIG'
  );
  
  if (!paynowResult.success) {
    throw new PaymentError(paynowResult.error || 'Failed to initiate payment');
  }
  
  // Save payment to database
  await paymentsRepo.createPayment({
    reference,
    phone,
    plan: data.plan,
    currency: data.currency,
    amount,
    pollUrl: paynowResult.pollUrl,
    providerRef: paynowResult.providerRef,
  });
  
  logger.paymentStateChange(reference, 'NEW', 'PENDING', { phone, amount });
  
  return {
    success: true,
    reference,
    message: 'Prompt sent',
  };
}

/**
 * Get payment status and issue voucher if paid.
 */
export async function getPaymentStatus(reference: string): Promise<PaymentStatusResponse> {
  const payment = await paymentsRepo.getPaymentByReference(reference);
  
  if (!payment) {
    throw new NotFoundError(`Payment not found: ${reference}`);
  }
  
  // If already paid and voucher exists, return it
  if (payment.status === 'PAID') {
    const voucher = await vouchersRepo.getVoucherByPaymentId(payment.id);
    if (voucher) {
      return {
        success: true,
        status: 'PAID',
        voucher: voucher.code,
        expiry: formatExpiry(voucher.expiresAt),
      };
    }
  }
  
  // If payment is in a terminal state, return it
  if (payment.status === 'FAILED' || payment.status === 'EXPIRED' || payment.status === 'CANCELLED') {
    return {
      success: true,
      status: payment.status,
    };
  }
  
  // If pending and we have a poll URL, check with Paynow
  if (payment.status === 'PENDING' && payment.pollUrl) {
    const pollResult = await pollTransaction(payment.pollUrl);
    
    if (pollResult.status === 'PAID') {
      // Update payment status
      await paymentsRepo.updatePaymentStatus(reference, 'PAID', {
        providerRef: pollResult.paynowReference,
      });
      
      logger.paymentStateChange(reference, 'PENDING', 'PAID');
      
      // Issue voucher (idempotent - check if already exists)
      let voucher = await vouchersRepo.getVoucherByPaymentId(payment.id);
      
      if (!voucher) {
        const voucherCode = generateVoucherCode(payment.plan as PlanId);
        const expiresAt = calculateExpiry(payment.plan as PlanId);
        
        voucher = await vouchersRepo.createVoucher({
          code: voucherCode,
          plan: payment.plan,
          expiresAt,
          paymentId: payment.id,
        });
        
        logger.info('Voucher issued', { 
          reference, 
          voucherCode, 
          expiresAt: formatExpiry(expiresAt) 
        });
      }
      
      return {
        success: true,
        status: 'PAID',
        voucher: voucher.code,
        expiry: formatExpiry(voucher.expiresAt),
      };
    } else if (pollResult.status === 'FAILED' || pollResult.status === 'CANCELLED') {
      // Update payment status
      await paymentsRepo.updatePaymentStatus(reference, pollResult.status);
      logger.paymentStateChange(reference, 'PENDING', pollResult.status);
      
      return {
        success: true,
        status: pollResult.status,
      };
    }
    
    // Still pending
    return {
      success: true,
      status: 'PENDING',
    };
  }
  
  // Default: return current status
  return {
    success: true,
    status: payment.status,
  };
}
