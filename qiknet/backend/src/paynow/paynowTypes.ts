export type PaynowStatus = 'Ok' | 'Error' | 'Paid' | 'Awaiting Delivery' | 'Delivered' | 'Created' | 'Sent' | 'Cancelled' | 'Disputed' | 'Refunded';

export interface PaynowInitiateRequest {
  reference: string;
  phone: string;
  amount: number;
  email?: string;
  additionalInfo?: string;
}

export interface PaynowInitiateResponse {
  success: boolean;
  pollUrl?: string;
  instructions?: string;
  providerRef?: string;
  error?: string;
  browserUrl?: string;
}

export interface PaynowPollResponse {
  success: boolean;
  status: 'PAID' | 'PENDING' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
  amount?: number;
  reference?: string;
  paynowReference?: string;
  error?: string;
}

export interface PaynowCredentials {
  integrationId: string;
  integrationKey: string;
}
