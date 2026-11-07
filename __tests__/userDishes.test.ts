/** @jest-environment node */
import { getDb, initDb } from '@/db';
import { loadCategories } from '@/db/categories';
import { loadExportDishes, importExchange } from '@/db/exchange';
import { DISHES } from '@/logic/dishes';
import { buildFile, parseFile } from '@/logic/exchange';
import {
  DishEntry, MAX_DISH_PRODUCTS, hiddenBuiltinCount, loadDishEntries, removeDishEntry, restoreStandardDishes, saveDishEntry,
} from '@/logic/userDishes';

jest.mock('expo-sqlite', () => jest.requireActual('./helpers/fakeSqlite'));

beforeAll(async () => {
  await initDb();
});

beforeEach(async () => {
  await getDb().execAsync("DELETE FROM dishes; DELETE FROM settings WHERE key = 'hiddenDishes';");
});

const product = (title: string, qty: number | null = null, unit: string | null = null, price: number | null = null) => ({ title, qty, unit, price });
const entries = async () => loadDishEntries('ru', await loadCategories());
const named = (list: DishEntry[], name: string) => list.find((e) => e.name === name);

describe('список блюд', () => {
  it('без своих блюд — все стандартные', async () => {
    const list = await entries();
    expect(list).toHaveLength(DISHES.length);
    expect(list.every((e) => e.kind === 'builtin')).toBe(true);
    expect(named(list, 'Плов')?.rows.length).toBeGreaterThan(3);
    expect(hiddenBuiltinCount(list)).toBe(0);
  });

  it('новое блюдо: пустые продукты отбрасываются, цены и единицы сохраняются', async () => {
    await saveDishEntry(null, '  Мой салат ', [product('Огурцы', 0.5, 'kg', 400), product('  '), product('Помидоры')]);
    const mine = named(await entries(), 'Мой салат');
    expect(mine?.kind).toBe('own');
    expect(mine?.rows.map((r) => [r.title, r.qty, r.unit, r.price])).toEqual([['Огурцы', 0.5, 'kg', 400], ['Помидоры', null, null, null]]);
  });

  it('без названия или без продуктов блюдо не создаётся', async () => {
    await saveDishEntry(null, '   ', [product('Рис')]);
    await saveDishEntry(null, 'Пустое', [product('  ')]);
    expect((await entries()).filter((e) => e.kind === 'own')).toHaveLength(0);
  });

  it('больше 60 продуктов не сохраняется', async () => {
    await saveDishEntry(null, 'Огромное', Array.from({ length: 70 }, (_, i) => product(`Продукт ${i + 1}`)));
    expect(named(await entries(), 'Огромное')?.rows).toHaveLength(MAX_DISH_PRODUCTS);
  });
});

describe('правка и удаление', () => {
  it('правка своего блюда: то же блюдо, новые название и продукты', async () => {
    await saveDishEntry(null, 'Салат', [product('Огурцы'), product('Помидоры')]);
    const mine = named(await entries(), 'Салат') as DishEntry;
    await saveDishEntry(mine, 'Салат летний', [product('Огурцы', 1, 'kg', 500)]);
    const own = (await entries()).filter((e) => e.kind === 'own');
    expect(own).toHaveLength(1);
    expect(own[0]).toMatchObject({ name: 'Салат летний', ownId: mine.ownId });
    expect(own[0].rows.map((r) => [r.title, r.price])).toEqual([['Огурцы', 500]]);
  });

  it('правка стандартного блюда создаёт своё с тем же названием, стандартное скрывается', async () => {
    const plov = named(await entries(), 'Плов') as DishEntry;
    await saveDishEntry(plov, 'Плов', plov.rows.filter((r) => r.title !== 'Лук').map((r) => product(r.title, r.qty, r.unit)));
    const list = await entries();
    const plovs = list.filter((e) => e.name === 'Плов');
    expect(plovs).toHaveLength(1);
    expect(plovs[0].kind).toBe('own');
    expect(plovs[0].rows.some((r) => r.title === 'Лук')).toBe(false);
    expect(hiddenBuiltinCount(list)).toBe(1);
  });

  it('удаление своего блюда — насовсем, вместе с продуктами', async () => {
    await saveDishEntry(null, 'Салат', [product('Огурцы')]);
    await removeDishEntry(named(await entries(), 'Салат') as DishEntry);
    expect(named(await entries(), 'Салат')).toBeUndefined();
    expect(await getDb().getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM dish_items')).toEqual({ n: 0 });
  });

  it('удаление стандартного блюда скрывает его; «Вернуть стандартные» возвращает всё, свои остаются', async () => {
    await saveDishEntry(null, 'Салат', [product('Огурцы')]);
    await removeDishEntry(named(await entries(), 'Блины') as DishEntry);
    await removeDishEntry(named(await entries(), 'Борщ') as DishEntry);
    const hidden = await entries();
    expect(named(hidden, 'Блины')).toBeUndefined();
    expect(hiddenBuiltinCount(hidden)).toBe(2);
    await restoreStandardDishes();
    const back = await entries();
    expect(hiddenBuiltinCount(back)).toBe(0);
    expect(named(back, 'Блины')).toBeDefined();
    expect(named(back, 'Салат')).toBeDefined();
  });
});

describe('резервная копия: свои блюда', () => {
  it('выгрузка → файл → разбор → импорт; блюдо с таким названием не дублируется', async () => {
    await saveDishEntry(null, 'Салат', [product('Огурцы', 0.5, 'kg', 400), product('Помидоры')]);
    const dishes = await loadExportDishes();
    expect(dishes).toEqual([{ title: 'Салат', products: [product('Огурцы', 0.5, 'kg', 400), product('Помидоры')] }]);
    const parsed = parseFile(JSON.stringify(buildFile('backup', [], [], new Date('2026-11-07T10:00:00.000Z'), dishes)));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.file.dishes).toEqual(dishes);

    await importExchange(parsed.file); // такое блюдо уже есть
    expect((await entries()).filter((e) => e.kind === 'own')).toHaveLength(1);

    await getDb().execAsync('DELETE FROM dishes;');
    await importExchange(parsed.file); // после удаления — возвращается
    const restored = named(await entries(), 'Салат');
    expect(restored?.rows.map((r) => [r.title, r.qty, r.unit, r.price])).toEqual([['Огурцы', 0.5, 'kg', 400], ['Помидоры', null, null, null]]);
  });

  it('файл из одних блюд не считается пустым; мусор в блюдах очищается', () => {
    const only = parseFile(JSON.stringify({ app: 'ShoppingList', format: 1, kind: 'backup', lists: [], dishes: [{ title: 'Каша', products: [{ title: 'Овсянка', qty: -2, unit: 'бочка', price: -5 }, { title: ' ' }] }, { title: '', products: [] }, 'x'] }));
    expect(only.ok).toBe(true);
    if (only.ok) expect(only.file.dishes).toEqual([{ title: 'Каша', products: [{ title: 'Овсянка', qty: null, unit: null, price: null }] }]);
    expect(parseFile(JSON.stringify({ app: 'ShoppingList', format: 1, kind: 'backup', lists: [], dishes: [] }))).toEqual({ ok: false, reason: 'empty' });
  });
});
