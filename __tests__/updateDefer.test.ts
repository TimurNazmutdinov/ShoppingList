/** @jest-environment node */
import { getDb, initDb } from '@/db';
import { loadUpdateSeen, saveUpdateSeen } from '@/db/updateSeen';
import { addItem, loadItems } from '@/db/items';
import { createList, setItemCategory, loadCategories } from '@/logic/shopping';
import { DEFER_DAYS, canDefer, deadlineLabel, deferDeadline, isUpdateSeen, registerSeen, shouldShowUpdate } from '@/logic/updateDefer';

jest.mock('expo-sqlite', () => jest.requireActual('./helpers/fakeSqlite'));

beforeAll(async () => {
  await initDb();
});

const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date(2026, 10, 8, 14, 0).getTime();

describe('«Позже» на экране обновления: не больше трёх суток', () => {
  it('срок считается от первого показа и не сдвигается для той же версии', () => {
    const first = registerSeen(null, 9, T0);
    expect(first).toEqual({ versionCode: 9, at: T0 });
    expect(registerSeen(first, 9, T0 + 2 * DAY)).toBe(first);
    expect(DEFER_DAYS).toBe(3);
  });

  it('вышла более новая версия — три дня считаются заново', () => {
    const first = registerSeen(null, 9, T0);
    expect(registerSeen(first, 10, T0 + DAY)).toEqual({ versionCode: 10, at: T0 + DAY });
  });

  it('«Позже» доступно до исхода трёх суток, потом нет', () => {
    const seen = registerSeen(null, 9, T0);
    expect(canDefer(seen, T0 + 3 * DAY - 1)).toBe(true);
    expect(canDefer(seen, T0 + 3 * DAY)).toBe(false);
    expect(deferDeadline(seen)).toBe(T0 + 3 * DAY);
  });

  it('подпись последнего дня: «11 ноября»', () => {
    expect(deadlineLabel(registerSeen(null, 9, T0))).toBe('11 ноября');
  });

  it('автопроверка уважает «Позже», ручная и конец срока — нет', () => {
    expect(shouldShowUpdate({ manual: false, postponed: true, deferrable: true })).toBe(false);
    expect(shouldShowUpdate({ manual: true, postponed: true, deferrable: true })).toBe(true);
    expect(shouldShowUpdate({ manual: false, postponed: true, deferrable: false })).toBe(true);
    expect(shouldShowUpdate({ manual: false, postponed: false, deferrable: true })).toBe(true);
  });

  it('хранение: записанное читается, мусор — null', async () => {
    expect(await loadUpdateSeen()).toBeNull();
    await saveUpdateSeen({ versionCode: 9, at: T0 });
    expect(await loadUpdateSeen()).toEqual({ versionCode: 9, at: T0 });
    expect(isUpdateSeen({ versionCode: 0, at: 1 })).toBe(false);
    expect(isUpdateSeen('x')).toBe(false);
  });
});

describe('категория для нового товара', () => {
  it('выбранная категория сохраняется у товара', async () => {
    await getDb().execAsync('DELETE FROM items; DELETE FROM lists;');
    const listId = await createList('Тест', 'green');
    await addItem({ listId, title: 'Лавровый лист', qty: null, unit: null, price: null, categoryId: null });
    const [item] = await loadItems(listId);
    expect(item.categoryId).toBeNull();
    const cat = (await loadCategories()).find((c) => c.key === 'grocery');
    await setItemCategory(item, cat!.id, false);
    expect((await loadItems(listId))[0].categoryId).toBe(cat!.id);
  });
});
