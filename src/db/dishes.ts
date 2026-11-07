import { getDb, getSetting, inTransaction, setSetting, write } from './index';

export type DishProduct = { title: string; qty: number | null; unit: string | null; price: number | null };
export type UserDish = { id: number; title: string; products: DishProduct[] };

type DishRow = { id: number; title: string };
type ProductRow = { dish_id: number; title: string; qty: number | null; unit: string | null; price: number | null };

// Свои блюда с продуктами: два запроса на всё, без запросов в цикле.
export async function loadUserDishes(): Promise<UserDish[]> {
  const db = getDb();
  const dishes = await db.getAllAsync<DishRow>('SELECT id, title FROM dishes ORDER BY sort, id');
  const rows = await db.getAllAsync<ProductRow>('SELECT dish_id, title, qty, unit, price FROM dish_items ORDER BY dish_id, sort, id');
  const byDish = new Map<number, DishProduct[]>();
  for (const r of rows) {
    const product: DishProduct = { title: r.title, qty: r.qty, unit: r.unit, price: r.price };
    const list = byDish.get(r.dish_id);
    if (list) list.push(product);
    else byDish.set(r.dish_id, [product]);
  }
  return dishes.map((d) => ({ id: d.id, title: d.title, products: byDish.get(d.id) ?? [] }));
}

const PRODUCT_COLUMNS = '(dish_id, title, qty, unit, price, sort)';

// Новое блюдо (id = null) или замена продуктов существующего; всё одной транзакцией. Возвращает id блюда.
export async function saveUserDish(id: number | null, title: string, products: readonly DishProduct[]): Promise<number> {
  let dishId = id ?? 0;
  await inTransaction(async () => {
    if (id === null) {
      const res = await write(
        'INSERT INTO dishes (title, sort, created_at) VALUES (?, (SELECT COALESCE(MAX(sort), 0) + 1 FROM dishes), ?)',
        title.trim(),
        new Date().toISOString(),
      );
      dishId = res.lastInsertRowId;
    } else {
      await write('UPDATE dishes SET title = ? WHERE id = ?', title.trim(), id);
      await write('DELETE FROM dish_items WHERE dish_id = ?', id);
    }
    if (products.length === 0) return;
    const marks = products.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
    await write(
      `INSERT INTO dish_items ${PRODUCT_COLUMNS} VALUES ${marks}`,
      ...products.flatMap((p, i) => [dishId, p.title.trim(), p.qty, p.unit, p.price, i + 1]),
    );
  });
  return dishId;
}

export async function deleteUserDish(id: number): Promise<void> {
  await write('DELETE FROM dishes WHERE id = ?', id);
}

// Скрытые стандартные блюда (по id из кода).
export async function loadHiddenDishes(): Promise<string[]> {
  const value = await getSetting<unknown>('hiddenDishes');
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

export async function saveHiddenDishes(ids: readonly string[]): Promise<void> {
  await setSetting('hiddenDishes', ids);
}
