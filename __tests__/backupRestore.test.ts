/** @jest-environment node */
import { getDb, initDb } from '@/db';
import { addItem, loadItems, setBought } from '@/db/items';
import { remember } from '@/db/history';
import { importExchange, loadExportDishes, loadExportHistory, loadExportLists } from '@/db/exchange';
import { buildFile, parseFile } from '@/logic/exchange';
import { createCategory, createList, loadCategories, loadLists } from '@/logic/shopping';

jest.mock('expo-sqlite', () => jest.requireActual('./helpers/fakeSqlite'));

beforeAll(async () => {
  await initDb();
});

beforeEach(async () => {
  await getDb().execAsync("DELETE FROM items; DELETE FROM lists; DELETE FROM history; DELETE FROM dish_items; DELETE FROM dishes; DELETE FROM categories WHERE key IS NULL; DELETE FROM settings;");
});

// Резервная копия «от и до»: данные → файл (как делает «Сохранить копию») → текст → разбор → «Восстановить из файла».
async function makeBackupText(): Promise<string> {
  const file = buildFile('backup', await loadExportLists(), await loadExportHistory(), new Date('2026-11-10T10:00:00.000Z'), await loadExportDishes(), {});
  return JSON.stringify(file);
}

describe('резервная копия: сохранить → восстановить', () => {
  it('списки с бюджетом и датой, товары с категориями (встроенной и своей), купленное и история возвращаются', async () => {
    const dairy = (await loadCategories()).find((c) => c.key === 'dairy');
    const cat = await createCategory('Для кошки');
    const listId = await createList('Продукты', 'green', '2026-11-12', false, 15000);
    await addItem({ listId, title: 'Молоко', qty: 1, unit: 'l', price: 450, categoryId: dairy?.id ?? null });
    await addItem({ listId, title: 'Корм', qty: 2, unit: 'pack', price: null, categoryId: cat });
    const [milk] = await loadItems(listId);
    await setBought(milk.id, true);
    await remember({ title: 'Гречка', qty: 0.8, unit: 'kg', price: 600, categoryId: null });
    await remember({ title: 'Гречка', qty: 0.8, unit: 'kg', price: 600, categoryId: null });

    const text = await makeBackupText();
    // «новый телефон»: пусто
    await getDb().execAsync("DELETE FROM items; DELETE FROM lists; DELETE FROM history; DELETE FROM categories WHERE key IS NULL;");
    expect(await loadLists()).toHaveLength(0);

    const parsed = parseFile(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(await importExchange(parsed.file)).toEqual({ lists: 1, items: 2 });

    const [list] = await loadLists();
    expect(list).toMatchObject({ title: 'Продукты', color: 'green', plannedDate: '2026-11-12', budget: 15000 });
    const items = await loadItems(list.id);
    expect(items.map((i) => [i.title, i.qty, i.unit, i.price, i.boughtAt !== null])).toEqual([
      ['Молоко', 1, 'l', 450, true],
      ['Корм', 2, 'pack', null, false],
    ]);
    const cats = await loadCategories();
    expect(cats.find((c) => c.id === items[0].categoryId)?.key).toBe('dairy');
    expect(cats.find((c) => c.id === items[1].categoryId)?.title).toBe('Для кошки');
    const history = await getDb().getAllAsync<{ title: string; used_count: number }>('SELECT title, used_count FROM history');
    expect(history).toEqual([{ title: 'Гречка', used_count: 2 }]);
  });

  it('копия пустого приложения (только встроенные данные) — «в файле нет списков», а не «повреждён»', async () => {
    const parsed = parseFile(await makeBackupText());
    expect(parsed).toEqual({ ok: false, reason: 'empty' });
  });

  it('файл с BOM и пробелами в начале читается', async () => {
    await createList('Список', 'blue');
    const text = await makeBackupText();
    const parsed = parseFile('﻿  \n' + text);
    expect(parsed.ok).toBe(true);
  });

  it('повторное восстановление не падает: списки добавляются копиями', async () => {
    await createList('Список', 'blue', null, false, 100);
    const parsed = parseFile(await makeBackupText());
    if (!parsed.ok) throw new Error('не разобралось');
    await importExchange(parsed.file);
    await importExchange(parsed.file);
    expect((await loadLists()).map((l) => l.title)).toEqual(['Список', 'Список', 'Список']);
  });
});
