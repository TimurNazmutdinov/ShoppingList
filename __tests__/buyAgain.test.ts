/** @jest-environment node */
import { getDb, initDb } from '@/db';
import { remember } from '@/db/history';
import { HistoryRow, normTitle } from '@/logic/history';
import { BUY_AGAIN_EMPTY, BUY_AGAIN_ROW, buyAgainCandidates } from '@/logic/buyAgain';
import { loadBuyAgain } from '@/logic/shopping';

jest.mock('expo-sqlite', () => jest.requireActual('./helpers/fakeSqlite'));

beforeAll(async () => {
  await initDb();
});

beforeEach(async () => {
  await getDb().execAsync('DELETE FROM items; DELETE FROM lists; DELETE FROM history; DELETE FROM settings;');
});

const row = (title: string, usedCount: number, lastUsedAt: string, qty: number | null = null, unit: string | null = null): HistoryRow => ({
  titleNorm: normTitle(title), title, qty, unit, price: null, categoryId: null, usedCount, lastUsedAt,
});

describe('buyAgainCandidates', () => {
  const history = [
    row('Сыр', 2, '2026-11-01T10:00:00.000Z'),
    row('Молоко', 5, '2026-10-01T10:00:00.000Z'),
    row('Хлеб', 2, '2026-11-05T10:00:00.000Z'),
    row('Яйца', 1, '2026-11-07T10:00:00.000Z'),
  ];

  it('порядок: чаще покупали — выше; при равенстве — свежее', () => {
    expect(buyAgainCandidates(history, [], 10).map((h) => h.title)).toEqual(['Молоко', 'Хлеб', 'Сыр', 'Яйца']);
  });

  it('то, что уже в списке и не куплено, не показываем; купленное — показываем', () => {
    const items = [
      { title: 'Молоко', boughtAt: null },
      { title: 'Хлеб', boughtAt: '2026-11-08T09:00:00.000Z' },
    ];
    expect(buyAgainCandidates(history, items, 10).map((h) => h.title)).toEqual(['Хлеб', 'Сыр', 'Яйца']);
  });

  it('название сравнивается без учёта регистра, пробелов и ё/е', () => {
    const items = [{ title: '  МОЛОКО ', boughtAt: null }];
    expect(buyAgainCandidates([row('молоко', 3, '2026-11-01T10:00:00.000Z')], items, 10)).toEqual([]);
    expect(buyAgainCandidates([row('мёд', 3, '2026-11-01T10:00:00.000Z')], [{ title: 'Мед', boughtAt: null }], 10)).toEqual([]);
  });

  it('ограничение по числу кнопок; исходный массив не меняется', () => {
    const copy = [...history];
    expect(buyAgainCandidates(history, [], 2).map((h) => h.title)).toEqual(['Молоко', 'Хлеб']);
    expect(history).toEqual(copy);
  });

  it('нет истории — пусто; лимиты: 8 в пустом списке, 12 в ряду', () => {
    expect(buyAgainCandidates([], [], 8)).toEqual([]);
    expect([BUY_AGAIN_EMPTY, BUY_AGAIN_ROW]).toEqual([8, 12]);
  });
});

describe('loadBuyAgain (история в БД)', () => {
  const buy = async (title: string, times: number, qty: number | null = null, unit: string | null = null, price: number | null = null) => {
    for (let i = 0; i < times; i++) await remember({ title, qty, unit, price, categoryId: null });
  };

  it('частые первыми, с прошлым количеством и ценой', async () => {
    await buy('Яйца', 1, 10, 'pcs');
    await buy('Молоко', 3, 1, 'l', 450);
    await buy('Хлеб', 2);
    const rows = await loadBuyAgain([], true, 8);
    expect(rows.map((r) => r.title)).toEqual(['Молоко', 'Хлеб', 'Яйца']);
    expect(rows[0]).toMatchObject({ qty: 1, unit: 'l', price: 450, usedCount: 3 });
  });

  it('«Запоминать параметры товаров» выключено — ничего', async () => {
    await buy('Молоко', 3);
    expect(await loadBuyAgain([], false, 8)).toEqual([]);
  });

  it('товары списка не показываются, а запас в запросе не даёт «потерять» кнопки', async () => {
    await buy('Молоко', 4);
    await buy('Хлеб', 3);
    await buy('Сыр', 2);
    await buy('Яйца', 1);
    const items = [
      { title: 'Молоко', boughtAt: null },
      { title: 'Хлеб', boughtAt: null },
    ];
    expect((await loadBuyAgain(items, true, 2)).map((r) => r.title)).toEqual(['Сыр', 'Яйца']);
  });

  it('пустая история — пусто', async () => {
    expect(await loadBuyAgain([], true, 8)).toEqual([]);
  });
});
