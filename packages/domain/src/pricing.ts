export interface PriceLineInput {
  id: string;
  sellerId: string;
  platformOwned: boolean;
  unitPriceMinor: number;
  quantity: number;
}

export interface CouponRule {
  code: string;
  percent: number;
  minSubtotalMinor: number;
  maxDiscountMinor: number;
}

export interface PricedLine {
  id: string;
  sellerId: string;
  platformOwned: boolean;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  discountMinor: number;
  netMinor: number;
  commissionMinor: number;
  sellerNetMinor: number;
  platformNetMinor: number;
}

export interface PriceQuote {
  lines: PricedLine[];
  subtotalMinor: number;
  discountMinor: number;
  feeMinor: number;
  totalMinor: number;
  couponCode?: string;
  couponMessage?: string;
}

export function applyBps(amountMinor: number, bps: number) {
  return Math.round((amountMinor * bps) / 10_000);
}

export function priceCart(
  lines: PriceLineInput[],
  opts: { feeBps: number; commissionBps: number; coupon?: CouponRule | null },
): PriceQuote {
  const subtotalMinor = lines.reduce((sum, line) => sum + line.unitPriceMinor * line.quantity, 0);
  let discountMinor = 0;
    let couponMessage: string | undefined;
    if (opts.coupon) {
      if (subtotalMinor < opts.coupon.minSubtotalMinor) {
        couponMessage = `${opts.coupon.code} is saved. It applies once the cart reaches the minimum.`;
      } else {
        discountMinor = Math.min(opts.coupon.maxDiscountMinor, Math.round((subtotalMinor * opts.coupon.percent) / 100));
        couponMessage = `${opts.coupon.code} applied.`;
      }
    }
  const weights = lines.map((line) => line.unitPriceMinor * line.quantity);
  const shares = allocate(weights, discountMinor);
  const priced: PricedLine[] = lines.map((line, index) => {
    const lineTotalMinor = line.unitPriceMinor * line.quantity;
    const discount = shares[index] ?? 0;
    const netMinor = lineTotalMinor - discount;
    const commissionMinor = line.platformOwned ? 0 : applyBps(netMinor, opts.commissionBps);
    const sellerNetMinor = line.platformOwned ? 0 : netMinor - commissionMinor;
    const platformNetMinor = line.platformOwned ? netMinor : commissionMinor;
    return {
      id: line.id,
      sellerId: line.sellerId,
      platformOwned: line.platformOwned,
      quantity: line.quantity,
      unitPriceMinor: line.unitPriceMinor,
      lineTotalMinor,
      discountMinor: discount,
      netMinor,
      commissionMinor,
      sellerNetMinor,
      platformNetMinor,
    };
  });
  const feeMinor = applyBps(subtotalMinor - discountMinor, opts.feeBps);
  return {
    lines: priced,
    subtotalMinor,
    discountMinor,
    feeMinor,
    totalMinor: subtotalMinor - discountMinor + feeMinor,
    couponCode: opts.coupon?.code,
    couponMessage,
  };
}

export function allocate(weights: number[], amount: number) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (amount <= 0 || total <= 0) return weights.map(() => 0);
  const capped = Math.min(amount, total);
  let used = 0;
  return weights.map((weight, index) => {
    if (index === weights.length - 1) return capped - used;
    const share = Math.floor((capped * weight) / total);
    used += share;
    return share;
  });
}

export const COUPONS: Record<string, CouponRule> = {
  WELCOME10: { code: "WELCOME10", percent: 10, minSubtotalMinor: 1000, maxDiscountMinor: 2000 },
  DEMO10: { code: "DEMO10", percent: 10, minSubtotalMinor: 0, maxDiscountMinor: 5000 },
};
