import { z } from 'zod';
import { ValidationError } from './errors';

export function validate<T>(schema: z.Schema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const details: Record<string, string[]> = {};
    
    for (const error of result.error.errors) {
      const path = error.path.join('.') || 'root';
      if (!details[path]) {
        details[path] = [];
      }
      details[path].push(error.message);
    }
    
    throw new ValidationError('Validation failed', details);
  }
  
  return result.data;
}

// Common validation schemas
export const phoneSchema = z.string()
  .min(9, 'Phone number too short')
  .max(15, 'Phone number too long')
  .regex(/^[0-9+]+$/, 'Invalid phone number format');

export const planSchema = z.enum(['1hr', '1day', '48hr', '7day'], {
  errorMap: () => ({ message: 'Invalid plan. Must be one of: 1hr, 1day, 48hr, 7day' })
});

export const currencySchema = z.enum(['USD', 'ZIG'], {
  errorMap: () => ({ message: 'Invalid currency. Must be USD or ZIG' })
});

export const paymentMethodSchema = z.enum(['ecocash'], {
  errorMap: () => ({ message: 'Invalid payment method. Only ecocash is supported' })
});

export const macAddressSchema = z.string()
  .regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, 'Invalid MAC address format');

export const voucherCodeSchema = z.string()
  .min(6, 'Voucher code too short')
  .max(20, 'Voucher code too long');
