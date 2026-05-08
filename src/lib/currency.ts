export function formatMoney(amount: number | string | null | undefined, currency: string, locale = 'en-US'): string {
  const n = amount == null ? 0 : Number(amount);
  const safe = isNaN(n) ? 0 : n;
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(safe);
  } catch {
    return `${currency} ${safe.toFixed(2)}`;
  }
}

/**
 * Convert `amount` from `from` to `to` using a USD-pivoted rate map.
 * `rates[ccy]` = units of ccy per 1 USD.
 */
export function convert(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>,
): number {
  if (from === to) return amount;
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) throw new Error(`Missing FX rate for ${from} or ${to}`);
  const amountUsd = amount / fromRate;
  return amountUsd * toRate;
}
