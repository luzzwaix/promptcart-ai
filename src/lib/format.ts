export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatPercent(decimal: number) {
  return `${Math.round(decimal * 100)}%`;
}
