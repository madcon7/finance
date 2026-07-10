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

export function formatInputNum(val: string): string {
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 0 }).format(parseInt(digits));
}

export function parseInputNum(val: string): string {
  return val.replace(/\s/g, '').replace(/ /g, '').replace(/,/g, '');
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
  'дивиденды': '💰',
  'займ выданный': '🤝',
  'другое': '📦',
};

export const CURRENCIES = ['KZT', 'USD', 'EUR', 'AED', 'TRY'] as const;
export type Currency = typeof CURRENCIES[number];

export const CURRENCY_SYMBOL: Record<string, string> = {
  KZT: '₸', USD: '$', EUR: '€', AED: 'AED', TRY: '₺',
};
