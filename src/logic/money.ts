// Деньги: валюта, форматирование сумм, разбор цены, итоги по списку. Цена — стоимость всей позиции.

export type CurrencyKind = 'KZT' | 'RUB' | 'CUSTOM';
export type CurrencySetting = { kind: CurrencyKind; custom: string };

export const DEFAULT_CURRENCY: CurrencySetting = { kind: 'KZT', custom: '' };
export const CUSTOM_MAX = 4;

export function isCurrencySetting(v: unknown): v is CurrencySetting {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (o.kind === 'KZT' || o.kind === 'RUB' || o.kind === 'CUSTOM') && typeof o.custom === 'string';
}

// Символ для показа: ₸, ₽ или свой (до 4 знаков; пусто → ₸).
export function currencySymbol(c: CurrencySetting): string {
  if (c.kind === 'RUB') return '₽';
  if (c.kind === 'CUSTOM') return c.custom.trim().slice(0, CUSTOM_MAX) || '₸';
  return '₸';
}

const NBSP = String.fromCharCode(160);

// 12500 → «12 500 ₸»; дробная часть до двух знаков, без лишних нулей, запятая.
export function formatMoney(amount: number, symbol: string): string {
  const rounded = Math.round(amount * 100) / 100;
  const [int, frac] = Math.abs(rounded).toFixed(2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  const tail = frac === '00' ? '' : ',' + frac.replace(/0$/, '');
  return (rounded < 0 ? '-' : '') + grouped + tail + NBSP + symbol;
}

// «1 200,50» / «450» / «12.5» → число; пусто, не число или отрицательное → null (цена не обязательна). 0 допустим.
export function parsePrice(input: string): number | null {
  const text = input.split(' ').join('').split(NBSP).join('').replace(',', '.');
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export type Totals = { total: number; bought: number; left: number; priced: boolean };

// Итоги по товарам списка: всего, куплено, осталось; priced — есть ли хоть одна цена.
export function listTotals(items: readonly { price: number | null; boughtAt: string | null }[]): Totals {
  let total = 0;
  let bought = 0;
  let priced = false;
  for (const i of items) {
    if (i.price === null) continue;
    priced = true;
    total += i.price;
    if (i.boughtAt !== null) bought += i.price;
  }
  return { total, bought, left: total - bought, priced };
}
