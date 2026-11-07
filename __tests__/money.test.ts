import { CUSTOM_MAX, DEFAULT_CURRENCY, currencySymbol, formatMoney, isCurrencySetting, listTotals, parsePrice } from '@/logic/money';

const NBSP = String.fromCharCode(160);

describe('formatMoney', () => {
  it('разделитель тысяч и символ', () => {
    expect(formatMoney(12500, '₸')).toBe('12' + NBSP + '500' + NBSP + '₸');
    expect(formatMoney(450, '₽')).toBe('450' + NBSP + '₽');
    expect(formatMoney(1234567, 'KGS')).toBe('1' + NBSP + '234' + NBSP + '567' + NBSP + 'KGS');
  });
  it('дробная часть без лишних нулей, запятая', () => {
    expect(formatMoney(12.5, '₸')).toBe('12,5' + NBSP + '₸');
    expect(formatMoney(12.05, '₸')).toBe('12,05' + NBSP + '₸');
    expect(formatMoney(0, '₸')).toBe('0' + NBSP + '₸');
  });
});

describe('parsePrice', () => {
  it('запятая, точка, пробелы; 0 допустим', () => {
    expect(parsePrice('450')).toBe(450);
    expect(parsePrice('1 200,50')).toBe(1200.5);
    expect(parsePrice('12.5')).toBe(12.5);
    expect(parsePrice('0')).toBe(0);
  });
  it('пусто, не число и отрицательное → null', () => {
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('abc')).toBeNull();
    expect(parsePrice('-5')).toBeNull();
  });
});

describe('валюта', () => {
  it('по умолчанию тенге; рубль; своя до 4 знаков; пустая своя → тенге', () => {
    expect(currencySymbol(DEFAULT_CURRENCY)).toBe('₸');
    expect(currencySymbol({ kind: 'RUB', custom: '' })).toBe('₽');
    expect(currencySymbol({ kind: 'CUSTOM', custom: 'сом' })).toBe('сом');
    expect(currencySymbol({ kind: 'CUSTOM', custom: 'ABCDEFG' })).toHaveLength(CUSTOM_MAX);
    expect(currencySymbol({ kind: 'CUSTOM', custom: '  ' })).toBe('₸');
  });
  it('проверка сохранённого значения', () => {
    expect(isCurrencySetting({ kind: 'RUB', custom: '' })).toBe(true);
    expect(isCurrencySetting({ kind: 'USD', custom: '' })).toBe(false);
    expect(isCurrencySetting(null)).toBe(false);
  });
});

describe('listTotals', () => {
  it('всего, куплено, осталось; товары без цены не считаются', () => {
    const t = listTotals([
      { price: 450, boughtAt: '2026-11-07T10:00:00.000Z' },
      { price: 300, boughtAt: null },
      { price: null, boughtAt: null },
    ]);
    expect(t).toEqual({ total: 750, bought: 450, left: 300, priced: true });
  });
  it('без цен priced = false', () => {
    expect(listTotals([{ price: null, boughtAt: null }]).priced).toBe(false);
  });
});
