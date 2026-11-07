/** @jest-environment node */
import { getDb, initDb } from '@/db';
import { addItem, loadItems, setBought } from '@/db/items';
import { copyList, createList, deleteList, loadList, loadLists, resetBought } from '@/db/lists';

jest.mock('expo-sqlite', () => jest.requireActual('./helpers/fakeSqlite'));

beforeAll(async () => {
  await initDb();
});

beforeEach(async () => {
  await getDb().execAsync('DELETE FROM items; DELETE FROM lists;');
});

const add = (listId: number, title: string, price: number | null = null) =>
  addItem({ listId, title, qty: null, unit: null, price, categoryId: null });

// Список «Закупки»: a (100, куплен), b (50), c (без цены).
async function sampleList() {
  const id = await createList('Закупки', 'blue');
  await add(id, 'a', 100);
  await add(id, 'b', 50);
  await add(id, 'c');
  const items = await loadItems(id);
  await setBought(items[0].id, true);
  return { id, items: await loadItems(id) };
}

describe('списки: суммы и счётчики', () => {
  it('всего, осталось, сумма цен и сумма не купленного', async () => {
    const { id } = await sampleList();
    const list = await loadList(id);
    expect(list).toMatchObject({ title: 'Закупки', total: 3, left: 2, totalPrice: 150, leftPrice: 50 });
    expect((await loadLists()).map((l) => l.id)).toEqual([id]);
  });

  it('нет такого списка — null', async () => {
    expect(await loadList(9999)).toBeNull();
  });

  it('напоминание включается только вместе с датой', async () => {
    const withDate = await createList('С датой', 'green', '2026-11-10', true);
    const noDate = await createList('Без даты', 'green', null, true);
    expect((await loadList(withDate))?.remind).toBe(true);
    expect((await loadList(noDate))?.remind).toBe(false);
  });
});

describe('копия списка', () => {
  it('копируются выбранные товары без отметок «куплено»; исходный список не меняется', async () => {
    const { id, items } = await sampleList();
    const copyId = await copyList(id, '  Копия ', '2026-11-10', true, [items[0].id, items[1].id]);
    const copy = await loadList(copyId);
    expect(copy).toMatchObject({ title: 'Копия', color: 'blue', plannedDate: '2026-11-10', remind: true, total: 2, left: 2 });
    const copied = await loadItems(copyId);
    expect(copied.map((i) => i.title)).toEqual(['a', 'b']);
    expect(copied.every((i) => i.boughtAt === null)).toBe(true);
    expect(copied.map((i) => i.price)).toEqual([100, 50]);
    const source = await loadItems(id);
    expect(source).toHaveLength(3);
    expect(source[0].boughtAt).not.toBeNull();
    expect((copy?.sort ?? 0)).toBeGreaterThan((await loadList(id))?.sort ?? 0);
  });

  it('без даты напоминание не включается; без товаров — пустой список', async () => {
    const { id } = await sampleList();
    const copyId = await copyList(id, 'Пустая', null, true, []);
    expect(await loadList(copyId)).toMatchObject({ remind: false, plannedDate: null, total: 0 });
  });
});

describe('«Начать заново» и удаление', () => {
  it('снимает отметки «куплено», товары остаются', async () => {
    const { id } = await sampleList();
    await resetBought(id);
    const items = await loadItems(id);
    expect(items).toHaveLength(3);
    expect(items.every((i) => i.boughtAt === null)).toBe(true);
  });

  it('удаление списка удаляет его товары, чужие не трогает', async () => {
    const { id } = await sampleList();
    const other = await createList('Другой', 'green');
    await add(other, 'x');
    await deleteList(id);
    expect(await loadItems(id)).toHaveLength(0);
    expect(await loadItems(other)).toHaveLength(1);
  });
});
