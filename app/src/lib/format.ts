export function formatKZT(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return '0 ₸';
  return new Intl.NumberFormat('ru-KZ', {
    maximumFractionDigits: 0,
  }).format(amount) + ' ₸';
}

export function formatNum(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return '0';
  return new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 0 }).format(amount);
}

// Format number input value with spaces (for display in inputs)
export function formatInputNum(val: string): string {
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 0 }).format(parseInt(digits));
}

// Parse formatted number back to raw number string
export function parseInputNum(val: string): string {
  return val.replace(/\s/g, '').replace(/ /g, '').replace(/,/g, '');
}

export const CATEGORY_EMOJI: Record<string, string> = {
  'недвижимость': '🏠',
  'автомобиль': '🚗',
  'доля в бизнесе': '💼',
  'банковский счет': '🏦',
  'ценные бумаги': '📈',
  'акции': '📈',
  'криптовалюта': '🪙',
  'наличные': '💵',
  'другое': '📦',
};
