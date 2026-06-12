export function formatKZT(amount: number): string {
  return new Intl.NumberFormat('ru-KZ', {
    style: 'currency',
    currency: 'KZT',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNum(amount: number): string {
  return new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 0 }).format(amount);
}
