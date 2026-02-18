import { db } from '../../db';
import type { Payment, PaymentStatus, Prisma } from '@prisma/client';

export interface CreatePaymentData {
  reference: string;
  phone: string;
  plan: string;
  currency: string;
  amount: number;
  pollUrl?: string;
  providerRef?: string;
}

export async function createPayment(data: CreatePaymentData): Promise<Payment> {
  return db.payment.create({
    data: {
      reference: data.reference,
      phone: data.phone,
      plan: data.plan,
      currency: data.currency,
      amount: data.amount,
      pollUrl: data.pollUrl,
      providerRef: data.providerRef,
      status: 'PENDING',
    },
  });
}

export async function getPaymentByReference(reference: string): Promise<Payment | null> {
  return db.payment.findUnique({
    where: { reference },
    include: { voucher: true },
  });
}

export async function updatePaymentStatus(
  reference: string, 
  status: PaymentStatus,
  extra?: { providerRef?: string; pollUrl?: string }
): Promise<Payment> {
  return db.payment.update({
    where: { reference },
    data: {
      status,
      ...(extra?.providerRef && { providerRef: extra.providerRef }),
      ...(extra?.pollUrl && { pollUrl: extra.pollUrl }),
    },
  });
}

export async function getPendingPayments(): Promise<Payment[]> {
  return db.payment.findMany({
    where: {
      status: 'PENDING',
      // Only get payments created in the last hour
      createdAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000),
      },
    },
  });
}

export async function getPayments(options?: {
  status?: PaymentStatus;
  limit?: number;
  offset?: number;
}): Promise<{ payments: Payment[]; total: number }> {
  const where: Prisma.PaymentWhereInput = {};
  
  if (options?.status) {
    where.status = options.status;
  }
  
  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
      include: { voucher: true },
    }),
    db.payment.count({ where }),
  ]);
  
  return { payments, total };
}
