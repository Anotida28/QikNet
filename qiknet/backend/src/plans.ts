export type PlanId = '1hr' | '1day' | '48hr' | '7day';
export type Currency = 'USD' | 'ZIG';

export interface Plan {
  id: PlanId;
  name: string;
  durationMinutes: number;
  prices: {
    USD: number;
    ZIG: number;
  };
}

export const PLANS: Record<PlanId, Plan> = {
  '1hr': {
    id: '1hr',
    name: '1 Hour',
    durationMinutes: 60,
    prices: {
      USD: 0.20,
      ZIG: 0.20, // Update ZIG prices as needed
    },
  },
  '1day': {
    id: '1day',
    name: '1 Day',
    durationMinutes: 1440, // 24 hours
    prices: {
      USD: 0.50,
      ZIG: 0.50,
    },
  },
  '48hr': {
    id: '48hr',
    name: 'Bi-Daily (48hr)',
    durationMinutes: 2880, // 48 hours
    prices: {
      USD: 1.00,
      ZIG: 1.00,
    },
  },
  '7day': {
    id: '7day',
    name: 'Weekly',
    durationMinutes: 10080, // 7 days
    prices: {
      USD: 3.00,
      ZIG: 3.00,
    },
  },
};

export function getPlan(planId: string): Plan | undefined {
  return PLANS[planId as PlanId];
}

export function getPlanPrice(planId: string, currency: Currency): number | undefined {
  const plan = getPlan(planId);
  if (!plan) return undefined;
  return plan.prices[currency];
}

export function getPlanDuration(planId: string): number | undefined {
  const plan = getPlan(planId);
  return plan?.durationMinutes;
}

export function isValidPlan(planId: string): planId is PlanId {
  return planId in PLANS;
}

export function isValidCurrency(currency: string): currency is Currency {
  return currency === 'USD' || currency === 'ZIG';
}
