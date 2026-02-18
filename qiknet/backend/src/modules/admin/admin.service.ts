import * as paymentsRepo from '../payments/payments.repo';
import * as vouchersRepo from '../vouchers/vouchers.repo';
import { markExpiredVouchers } from '../vouchers/vouchers.service';
import type { PaymentStatus, VoucherStatus } from '@prisma/client';

export interface ListPaymentsOptions {
  status?: PaymentStatus;
  limit?: number;
  offset?: number;
}

export interface ListVouchersOptions {
  status?: VoucherStatus;
  limit?: number;
  offset?: number;
}

export async function listPayments(options: ListPaymentsOptions) {
  return paymentsRepo.getPayments(options);
}

export async function listVouchers(options: ListVouchersOptions) {
  return vouchersRepo.getVouchers(options);
}

export async function getStats() {
  const [payments, vouchers] = await Promise.all([
    paymentsRepo.getPayments({ limit: 10000 }),
    vouchersRepo.getVouchers({ limit: 10000 }),
  ]);
  
  const paymentsByStatus = {
    PENDING: 0,
    PAID: 0,
    FAILED: 0,
    EXPIRED: 0,
    CANCELLED: 0,
  };
  
  const vouchersByStatus = {
    ACTIVE: 0,
    USED: 0,
    EXPIRED: 0,
    REVOKED: 0,
  };
  
  let totalRevenue = 0;
  
  for (const p of payments.payments) {
    paymentsByStatus[p.status]++;
    if (p.status === 'PAID') {
      totalRevenue += Number(p.amount);
    }
  }
  
  for (const v of vouchers.vouchers) {
    vouchersByStatus[v.status]++;
  }
  
  return {
    payments: {
      total: payments.total,
      byStatus: paymentsByStatus,
    },
    vouchers: {
      total: vouchers.total,
      byStatus: vouchersByStatus,
    },
    revenue: {
      total: totalRevenue,
    },
  };
}

export async function runMaintenance() {
  const expiredCount = await markExpiredVouchers();
  return {
    expiredVouchersMarked: expiredCount,
  };
}

export async function revokeVoucher(code: string) {
  return vouchersRepo.updateVoucherStatus(code, 'REVOKED');
}
