import { db } from '../../db';
import type { Voucher, VoucherStatus, Prisma } from '@prisma/client';

export interface CreateVoucherData {
  code: string;
  plan: string;
  expiresAt: Date;
  paymentId: string;
}

export async function createVoucher(data: CreateVoucherData): Promise<Voucher> {
  return db.voucher.create({
    data: {
      code: data.code,
      plan: data.plan,
      expiresAt: data.expiresAt,
      paymentId: data.paymentId,
      status: 'ACTIVE',
    },
  });
}

export async function getVoucherByCode(code: string): Promise<Voucher | null> {
  return db.voucher.findUnique({
    where: { code },
    include: { payment: true },
  });
}

export async function getVoucherByPaymentId(paymentId: string): Promise<Voucher | null> {
  return db.voucher.findUnique({
    where: { paymentId },
  });
}

export async function updateVoucherStatus(code: string, status: VoucherStatus): Promise<Voucher> {
  return db.voucher.update({
    where: { code },
    data: { status },
  });
}

export async function getVouchers(options?: {
  status?: VoucherStatus;
  limit?: number;
  offset?: number;
}): Promise<{ vouchers: Voucher[]; total: number }> {
  const where: Prisma.VoucherWhereInput = {};
  
  if (options?.status) {
    where.status = options.status;
  }
  
  const [vouchers, total] = await Promise.all([
    db.voucher.findMany({
      where,
      orderBy: { issuedAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
      include: { payment: true },
    }),
    db.voucher.count({ where }),
  ]);
  
  return { vouchers, total };
}

export async function getExpiredActiveVouchers(): Promise<Voucher[]> {
  return db.voucher.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: {
        lt: new Date(),
      },
    },
  });
}

export async function markVouchersAsExpired(ids: string[]): Promise<void> {
  await db.voucher.updateMany({
    where: { id: { in: ids } },
    data: { status: 'EXPIRED' },
  });
}
