import { getDb, write } from './index';

export type Item = {
  id: number;
  listId: number;
  title: string;
  qty: number | null;
  unit: string | null;
  price: number | null; // стоимость позиции
  note: string | null;
  categoryId: number | null;
  plannedDate: string | null;
  remind: boolean;
  boughtAt: string | null;
  sort: number;
  createdAt: string;
};

type Row = {
  id: number; list_id: number; title: string; qty: number | null; unit: string | null; price: number | null; note: string | null;
  category_id: number | null; planned_date: string | null; remind: number; bought_at: string | null; sort: number; created_at: string;
};

export type ItemRow = Row;
export const toItem = (r: Row): Item => ({
  id: r.id, listId: r.list_id, title: r.title, qty: r.qty, unit: r.unit, price: r.price, note: r.note,
  categoryId: r.category_id, plannedDate: r.planned_date, remind: r.remind === 1, boughtAt: r.bought_at, sort: r.sort, createdAt: r.created_at,
});

// Не купленные — по порядку добавления; купленные — недавние сверху.
export async function loadItems(listId: number): Promise<Item[]> {
  const rows = await getDb().getAllAsync<Row>('SELECT * FROM items WHERE list_id = ? ORDER BY sort, id', listId);
  return rows.map(toItem);
}

export type NewItem = { listId: number; title: string; qty: number | null; unit: string | null; price?: number | null; categoryId: number | null };

export async function addItem(input: NewItem): Promise<void> {
  await write(
    `INSERT INTO items (list_id, title, qty, unit, price, category_id, sort, created_at)
     VALUES (?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort), 0) + 1 FROM items WHERE list_id = ?), ?)`,
    input.listId,
    input.title.trim(),
    input.qty,
    input.unit,
    input.price ?? null,
    input.categoryId,
    input.listId,
    new Date().toISOString(),
  );
}

export type ItemPatch = {
  title: string;
  qty: number | null;
  unit: string | null;
  price: number | null;
  note: string | null;
  categoryId: number | null;
  plannedDate: string | null;
  remind: boolean;
};

export async function updateItem(id: number, p: ItemPatch): Promise<void> {
  await write(
    'UPDATE items SET title = ?, qty = ?, unit = ?, price = ?, note = ?, category_id = ?, planned_date = ?, remind = ? WHERE id = ?',
    p.title.trim(), p.qty, p.unit, p.price, p.note, p.categoryId, p.plannedDate, p.remind && p.plannedDate ? 1 : 0, id,
  );
}

export async function setBought(id: number, bought: boolean): Promise<void> {
  await write('UPDATE items SET bought_at = ? WHERE id = ?', bought ? new Date().toISOString() : null, id);
}

export async function deleteItem(id: number): Promise<void> {
  await write('DELETE FROM items WHERE id = ?', id);
}

// Отмена удаления: товар возвращается с прежним номером и параметрами.
export async function restoreItem(item: Item): Promise<void> {
  await write(
    `INSERT OR REPLACE INTO items (id, list_id, title, qty, unit, price, note, category_id, planned_date, remind, bought_at, sort, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    item.id, item.listId, item.title, item.qty, item.unit, item.price, item.note, item.categoryId, item.plannedDate, item.remind ? 1 : 0, item.boughtAt, item.sort, item.createdAt,
  );
}
