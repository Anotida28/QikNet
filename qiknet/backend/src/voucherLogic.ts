import { v4 as uuidv4 } from 'uuid';
import { getPlanDuration, PlanId } from './plans';

/**
 * Generate a unique voucher code.
 * Format: QK{PLAN}-{RANDOM}
 * Example: QKHR-A1B2C3D4, QKDY-X9Y8Z7W6
 */
export function generateVoucherCode(planId: PlanId): string {
  const prefixes: Record<PlanId, string> = {
    '1hr': 'HR',
    '1day': 'DY',
    '48hr': '48',
    '7day': 'WK',
  };
  
  const prefix = prefixes[planId] || 'XX';
  const randomPart = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
  
  return `QK${prefix}-${randomPart}`;
}

/**
 * Generate a unique payment reference.
 * Format: QIK-{TIMESTAMP}-{RANDOM}
 */
export function generatePaymentReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = uuidv4().replace(/-/g, '').substring(0, 6).toUpperCase();
  return `QIK-${timestamp}-${random}`;
}

/**
 * Calculate voucher expiry time from now.
 */
export function calculateExpiry(planId: PlanId): Date {
  const durationMinutes = getPlanDuration(planId) ?? 60;
  const now = new Date();
  return new Date(now.getTime() + durationMinutes * 60 * 1000);
}

/**
 * Format expiry date for display.
 */
export function formatExpiry(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Check if a voucher is expired.
 */
export function isVoucherExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}
