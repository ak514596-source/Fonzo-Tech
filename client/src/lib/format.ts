export const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

export function formatPrice(value: number) {
  return gbp.format(value);
}

export function discountPct(price: number, original?: number | null) {
  if (!original || original <= price) return null;
  return Math.round(((original - price) / original) * 100);
}
