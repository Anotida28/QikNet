import { z } from 'zod';
import { validate, voucherCodeSchema, macAddressSchema } from '../../common/validate';
import { NotFoundError } from '../../common/errors';
import { isVoucherExpired } from '../../voucherLogic';
import { logger } from '../../common/logger';
import * as vouchersRepo from './vouchers.repo';

// Request validation schema
const validateVoucherSchema = z.object({
  code: voucherCodeSchema,
  macAddress: macAddressSchema.optional(),
});

export interface ValidateVoucherRequest {
  code: string;
  macAddress?: string;
}

export interface ValidateVoucherResponse {
  valid: boolean;
  expiresAt?: string;
  plan?: string;
  reason?: 'EXPIRED' | 'NOT_FOUND' | 'REVOKED' | 'USED';
}

/**
 * Validate a voucher code.
 * Used by captive portal to check if voucher is valid.
 */
export async function validateVoucher(
  request: ValidateVoucherRequest
): Promise<ValidateVoucherResponse> {
  // Validate request
  const data = validate(validateVoucherSchema, request);
  
  // Look up voucher
  const voucher = await vouchersRepo.getVoucherByCode(data.code.toUpperCase());
  
  if (!voucher) {
    logger.info('Voucher validation failed: not found', { code: data.code });
    return {
      valid: false,
      reason: 'NOT_FOUND',
    };
  }
  
  // Check if revoked
  if (voucher.status === 'REVOKED') {
    logger.info('Voucher validation failed: revoked', { code: data.code });
    return {
      valid: false,
      reason: 'REVOKED',
    };
  }
  
  // Check if already used (for single-use vouchers)
  // Currently vouchers are time-based, not single-use
  // Uncomment if you want single-use behavior:
  // if (voucher.status === 'USED') {
  //   return { valid: false, reason: 'USED' };
  // }
  
  // Check if expired
  if (voucher.status === 'EXPIRED' || isVoucherExpired(voucher.expiresAt)) {
    // Update status if not already expired in DB
    if (voucher.status !== 'EXPIRED') {
      await vouchersRepo.updateVoucherStatus(data.code, 'EXPIRED');
    }
    
    logger.info('Voucher validation failed: expired', { code: data.code });
    return {
      valid: false,
      reason: 'EXPIRED',
    };
  }
  
  logger.info('Voucher validated successfully', { 
    code: data.code, 
    plan: voucher.plan,
    macAddress: data.macAddress 
  });
  
  // TODO: If macAddress provided, create/update session record
  
  return {
    valid: true,
    expiresAt: voucher.expiresAt.toISOString(),
    plan: voucher.plan,
  };
}

/**
 * Mark expired vouchers.
 * Run this periodically (e.g., via cron) to update voucher statuses.
 */
export async function markExpiredVouchers(): Promise<number> {
  const expired = await vouchersRepo.getExpiredActiveVouchers();
  
  if (expired.length > 0) {
    await vouchersRepo.markVouchersAsExpired(expired.map(v => v.id));
    logger.info('Marked vouchers as expired', { count: expired.length });
  }
  
  return expired.length;
}
