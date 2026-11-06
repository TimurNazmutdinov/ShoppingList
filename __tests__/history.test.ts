import { HistoryRow, formatQty, nextHistory, normTitle, parseQty, rankSuggestions } from '@/logic/history';

const row = (title: string, over: Partial<HistoryRow> = {}): HistoryRow => ({
  titleNorm: normTitle(title), title, qty: null, unit: null, categoryId: null, usedCount: 1, lastUsedAt: '2026-11-01T00:00:00.000Z', ...over,
});

describe('normTitle', () => {
  it('регистр, пробелы и ё не важны', () => {
    expect(normTitle('  Гречка ')).toBe('гречка');
    expect(normTitle('ЁЖИК   в   тумане')).toBe('ежик в тумане');
  });
});

describe('formatQty', () => {
  it('число и единица', () => expect(formatQty(0.8, 'kg', (u) => (u === 'kg' ? 'кг' : u))).toBe('0,8 кг'));
  it('только число / только единица / ничего', () => {
    expect(formatQty(2, null)).toBe('2');
    expect(formatQty(null, 'l')).toBe('l');
    expect(formatQty(null, null)).toBe('');
  });
});

describe('parseQty', () => {
  it('запятая и точка, пусто → null', () => {
    expect(parseQty('0,8')).toBe(0.8);
    expect(parseQty(' 1.5 ')).toBe(1.5);
    expect(parseQty('')).toBeNull();
    expect(parseQty('abc')).toBeNull();
    expect(parseQty('0')).toBeNull();
    expect(parseQty('-2')).toBeNull();
  });
});

describe('nextHistory — самообучение', () => {
  const now = '2026-11-06T09:00:00.000Z';

  it('первая покупка: гречка 0,8 кг запоминается', () => {
    expect(nextHistory(null, { title: 'Гречка', qty: 0.8, unit: 'kg', categoryId: null }, now)).toEqual({
      titleNorm: 'гречка', title: 'Гречка', qty: 0.8, unit: 'kg', categoryId: null, usedCount: 1, lastUsedAt: now,
    });
  });

  it('купили 1 кг — в следующий раз 1 кг', () => {
    const prev = nextHistory(null, { title: 'Гречка', qty: 0.8, unit: 'kg', categoryId: null }, now);
    const next = nextHistory(prev, { title: 'гречка', qty: 1, unit: 'kg', categoryId: null }, now);
    expect(next.qty).toBe(1);
    expect(next.usedCount).toBe(2);
  });

  it('купили без количества — прежнее не стирается', () => {
    const prev = nextHistory(null, { title: 'Гречка', qty: 0.8, unit: 'kg', categoryId: 3 }, now);
    const next = nextHistory(prev, { title: 'Гречка', qty: null, unit: null, categoryId: null }, now);
    expect(next).toMatchObject({ qty: 0.8, unit: 'kg', categoryId: 3 });
  });

  it('товар только с названием запоминается без параметров', () => {
    expect(nextHistory(null, { title: 'Соль', qty: null, unit: null, categoryId: null }, now)).toMatchObject({ qty: null, unit: null });
  });
});

describe('rankSuggestions', () => {
  const rows = [
    row('Гречка', { usedCount: 3 }),
    row('Гречневая крупа', { usedCount: 5 }),
    row('Молоко', { usedCount: 9 }),
    row('Греча', { usedCount: 1, lastUsedAt: '2026-11-05T00:00:00.000Z' }),
  ];

  it('по началу названия: сначала частые', () => {
    expect(rankSuggestions(rows, 'гре').map((r) => r.title)).toEqual(['Гречневая крупа', 'Гречка', 'Греча']);
  });

  it('точное совпадение — первым', () => {
    expect(rankSuggestions(rows, 'гречка')[0].title).toBe('Гречка');
    expect(rankSuggestions(rows, 'греча')[0].title).toBe('Греча');
  });

  it('пустой ввод и нет совпадений → пусто; лимит', () => {
    expect(rankSuggestions(rows, '  ')).toEqual([]);
    expect(rankSuggestions(rows, 'яблоко')).toEqual([]);
    expect(rankSuggestions(rows, 'г', 2)).toHaveLength(2);
  });
});
