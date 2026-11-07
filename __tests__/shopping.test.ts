/** @jest-environment node */
import { getDb, initDb, inTransaction } from '@/db';
import { addItem, loadItems } from '@/db/items';
import { findHistory } from '@/db/history';
import { t } from '@/i18n';
import { ItemPatch, addByTitle, addFromText, addMany, createList, ensureSampleList, loadLists, saveItem, setItemQtyPrice, toggleBought } from '@/logic/shopping';

jest.mock('expo-sqlite', () => jest.requireActual('./helpers/fakeSqlite'));

beforeAll(async () => {
  await initDb();
});

let listId = 0;
beforeEach(async () => {
  await getDb().execAsync('DELETE FROM items; DELETE FROM lists; DELETE FROM history; DELETE FROM settings;');
  listId = await createList('Тест', 'green');
});

const titles = async () => (await loadItems(listId)).map((i) => i.title);

describe('addByTitle', () => {
  it('только название: без количества, единицы и цены', async () => {
    await addByTitle(listId, '  Гречка ', { remember: false });
    const [item] = await loadItems(listId);
    expect(item).toMatchObject({ title: 'Гречка', qty: null, unit: null, price: null });
  });

  it('пустое название игнорируется', async () => {
    await addByTitle(listId, '   ', { remember: false });
    expect(await loadItems(listId)).toHaveLength(0);
  });

  it('количество рядом с «+» записывается как есть', async () => {
    await addByTitle(listId, 'Гречка', { remember: false, quick: { qty: 0.8, unit: 'kg' } });
    expect((await loadItems(listId))[0]).toMatchObject({ qty: 0.8, unit: 'kg' });
  });

  it('мини-самообучение: купили 0,8 кг — в следующий раз подставится', async () => {
    await addByTitle(listId, 'Гречка', { remember: true, quick: { qty: 0.8, unit: 'kg' } });
    await addByTitle(listId, 'гречка', { remember: true });
    const items = await loadItems(listId);
    expect(items[1]).toMatchObject({ qty: 0.8, unit: 'kg' });
  });

  it('запоминание выключено: ничего не сохраняется и не подставляется', async () => {
    await addByTitle(listId, 'Гречка', { remember: false, quick: { qty: 0.8, unit: 'kg' } });
    expect(await findHistory('Гречка')).toBeNull();
    await addByTitle(listId, 'Гречка', { remember: false });
    expect((await loadItems(listId))[1]).toMatchObject({ qty: null, unit: null });
  });

  it('нет в истории — категория берётся из каталога по точному названию', async () => {
    await addByTitle(listId, 'Молоко', { remember: false });
    const dairy = await getDb().getFirstAsync<{ id: number }>("SELECT id FROM categories WHERE key = 'dairy'");
    expect((await loadItems(listId))[0].categoryId).toBe(dairy?.id);
  });
});

describe('addFromText', () => {
  it('несколько товаров за раз, количество из текста', async () => {
    await addFromText(listId, 'молоко, хлеб, 2 кг сыра', { remember: false });
    const items = await loadItems(listId);
    expect(items.map((i) => i.title)).toEqual(['молоко', 'хлеб', 'сыра']);
    expect(items[2]).toMatchObject({ qty: 2, unit: 'kg' });
    expect(items[0].sort).toBeLessThan(items[2].sort);
  });

  it('одно название — обычное добавление', async () => {
    await addFromText(listId, 'Йогурт 3', { remember: false });
    expect(await titles()).toEqual(['Йогурт 3']);
  });

  it('количество в самом тексте главнее количества рядом с «+»', async () => {
    await addFromText(listId, 'молоко 2 л', { remember: false, quick: { qty: 5, unit: 'pcs' } });
    expect((await loadItems(listId))[0]).toMatchObject({ title: 'молоко', qty: 2, unit: 'l' });
  });
});

describe('addMany и транзакция', () => {
  it('набор из блюда: у каждого свои количество и единица, порядок сохранён', async () => {
    await addMany(listId, [{ title: 'Рис', qty: 1, unit: 'kg' }, { title: 'Морковь', qty: null, unit: null }], false);
    const items = await loadItems(listId);
    expect(items.map((i) => i.title)).toEqual(['Рис', 'Морковь']);
    expect(items[0]).toMatchObject({ qty: 1, unit: 'kg' });
    expect(items[1]).toMatchObject({ qty: null, unit: null });
  });

  it('запоминание включено — параметры попадают в историю', async () => {
    await addMany(listId, [{ title: 'Рис', qty: 1, unit: 'kg' }], true);
    expect(await findHistory('Рис')).toMatchObject({ qty: 1, unit: 'kg' });
  });

  it('ошибка внутри транзакции — ничего не записано', async () => {
    await expect(
      inTransaction(async () => {
        await addItem({ listId, title: 'Первый', qty: null, unit: null, categoryId: null });
        throw new Error('сбой');
      }),
    ).rejects.toThrow('сбой');
    expect(await loadItems(listId)).toHaveLength(0);
  });
});

describe('цена', () => {
  it('цена в тексте: число со значком', async () => {
    await addFromText(listId, 'хлеб 120 ₸', { remember: false });
    await addFromText(listId, 'сыр 2 кг 3 000 ₸, молоко', { remember: false });
    const items = await loadItems(listId);
    expect(items.map((i) => [i.title, i.qty, i.unit, i.price])).toEqual([
      ['хлеб', null, null, 120],
      ['сыр', 2, 'kg', 3000],
      ['молоко', null, null, null],
    ]);
  });

  it('символ валюты пользователя тоже значок цены', async () => {
    await addFromText(listId, 'хлеб 5 usd', { remember: false, currency: 'USD' });
    expect((await loadItems(listId))[0]).toMatchObject({ title: 'хлеб', price: 5 });
  });

  it('количество и цена рядом с «+»: к единственному товару из текста', async () => {
    await addFromText(listId, 'хлеб 120 ₸', { remember: false, quick: { qty: 2, unit: 'pcs' } });
    expect((await loadItems(listId))[0]).toMatchObject({ title: 'хлеб', qty: 2, unit: 'pcs', price: 120 });
    await addFromText(listId, 'чай', { remember: false, quick: { qty: 1, unit: 'pack', price: 900 } });
    expect((await loadItems(listId))[1]).toMatchObject({ title: 'чай', qty: 1, unit: 'pack', price: 900 });
  });

  it('цена из истории: подставляется, пока количество то же; при другом количестве — нет', async () => {
    await addByTitle(listId, 'Сыр', { remember: true, quick: { qty: 1, unit: 'kg', price: 1500 } });
    await addByTitle(listId, 'сыр', { remember: true });
    await addByTitle(listId, 'сыр', { remember: true, quick: { qty: 1, unit: 'kg' } });
    await addByTitle(listId, 'сыр', { remember: true, quick: { qty: 2, unit: 'kg' } });
    const items = await loadItems(listId);
    expect(items.map((i) => [i.qty, i.price])).toEqual([[1, 1500], [1, 1500], [1, 1500], [2, null]]);
  });

  it('количество рядом с «+» не отбрасывает категорию из каталога', async () => {
    await addByTitle(listId, 'Молоко', { remember: false, quick: { qty: 2, unit: 'l' } });
    const dairy = await getDb().getFirstAsync<{ id: number }>("SELECT id FROM categories WHERE key = 'dairy'");
    expect((await loadItems(listId))[0]).toMatchObject({ qty: 2, unit: 'l', categoryId: dairy?.id });
  });

  it('набор из блюда с ценами и запоминанием', async () => {
    await addMany(listId, [{ title: 'Рис', qty: 1, unit: 'kg', price: 800 }, { title: 'Морковь', qty: null, unit: null }], true);
    const items = await loadItems(listId);
    expect(items.map((i) => i.price)).toEqual([800, null]);
    expect(await findHistory('Рис')).toMatchObject({ price: 800 });
  });

  it('быстрая правка количества и цены в списке', async () => {
    await addByTitle(listId, 'Сыр', { remember: false });
    const [item] = await loadItems(listId);
    await setItemQtyPrice(item, { qty: 2, unit: 'kg', price: 3000 }, true);
    expect((await loadItems(listId))[0]).toMatchObject({ title: 'Сыр', qty: 2, unit: 'kg', price: 3000 });
    expect(await findHistory('Сыр')).toMatchObject({ qty: 2, price: 3000 });
  });
});

describe('ensureSampleList', () => {
  beforeEach(async () => {
    await getDb().execAsync('DELETE FROM lists;');
  });

  it('первый запуск: пример «Продукты» с товарами; второй раз — ничего', async () => {
    expect(await ensureSampleList()).toBe(true);
    const lists = await loadLists();
    expect(lists).toHaveLength(1);
    expect(lists[0].title).toBe(t('sample.listTitle'));
    expect((await loadItems(lists[0].id)).length).toBeGreaterThanOrEqual(3);
    expect(await ensureSampleList()).toBe(false);
    expect(await loadLists()).toHaveLength(1);
  });

  it('свои списки уже есть — пример не создаётся и больше не предлагается', async () => {
    const own = await createList('Мой', 'blue');
    expect(await ensureSampleList()).toBe(false);
    expect(await loadLists()).toHaveLength(1);
    await getDb().runAsync('DELETE FROM lists WHERE id = ?', own);
    expect(await ensureSampleList()).toBe(false);
    expect(await loadLists()).toHaveLength(0);
  });
});

describe('saveItem и toggleBought', () => {
  const patch = (over: Partial<ItemPatch> = {}): ItemPatch => ({
    title: 'Сыр', qty: 2, unit: 'kg', price: 300, note: null, categoryId: null, plannedDate: null, remind: false, ...over,
  });

  it('сохранение правки обновляет товар и запоминает параметры', async () => {
    await addByTitle(listId, 'Сыр', { remember: false });
    const [item] = await loadItems(listId);
    await saveItem(item.id, patch(), true);
    expect((await loadItems(listId))[0]).toMatchObject({ qty: 2, unit: 'kg', price: 300 });
    expect(await findHistory('Сыр')).toMatchObject({ qty: 2, unit: 'kg', price: 300 });
  });

  it('запоминание выключено — история пуста', async () => {
    await addByTitle(listId, 'Сыр', { remember: false });
    const [item] = await loadItems(listId);
    await saveItem(item.id, patch(), false);
    expect(await findHistory('Сыр')).toBeNull();
  });

  it('удалённая дата: напоминание без даты не включается', async () => {
    await addByTitle(listId, 'Сыр', { remember: false });
    const [item] = await loadItems(listId);
    await saveItem(item.id, patch({ remind: true, plannedDate: null }), false);
    expect((await loadItems(listId))[0].remind).toBe(false);
  });

  it('«куплено» и возврат; при покупке параметры запоминаются', async () => {
    await addByTitle(listId, 'Чай', { remember: false, quick: { qty: 1, unit: 'pack' } });
    const [item] = await loadItems(listId);
    expect(await toggleBought(item, true)).toBe(true);
    const bought = (await loadItems(listId))[0];
    expect(bought.boughtAt).not.toBeNull();
    expect(await findHistory('Чай')).toMatchObject({ qty: 1, unit: 'pack' });
    expect(await toggleBought(bought, true)).toBe(false);
    expect((await loadItems(listId))[0].boughtAt).toBeNull();
  });
});
