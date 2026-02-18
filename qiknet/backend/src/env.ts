import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  // Paynow ZWL/ZIG
  PAYNOW_INTEGRATION_ID: z.string().min(1, 'PAYNOW_INTEGRATION_ID is required'),
  PAYNOW_INTEGRATION_KEY: z.string().min(1, 'PAYNOW_INTEGRATION_KEY is required'),
  
  // Paynow USD
  PAYNOW_INTEGRATION_ID_USD: z.string().min(1, 'PAYNOW_INTEGRATION_ID_USD is required'),
  PAYNOW_INTEGRATION_KEY_USD: z.string().min(1, 'PAYNOW_INTEGRATION_KEY_USD is required'),
  
  // Paynow URLs
  PAYNOW_RESULT_URL: z.string().url('PAYNOW_RESULT_URL must be a valid URL'),
  PAYNOW_RETURN_URL: z.string().url('PAYNOW_RETURN_URL must be a valid URL'),
  
  PAYNOW_DEFAULT_EMAIL: z.string().email('PAYNOW_DEFAULT_EMAIL must be a valid email'),
  
  // Admin
  ADMIN_API_KEY: z.string().min(16, 'ADMIN_API_KEY must be at least 16 characters'),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('10').transform(Number),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  for (const error of parsed.error.errors) {
    console.error(`  - ${error.path.join('.')}: ${error.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;

export type Env = z.infer<typeof envSchema>;
