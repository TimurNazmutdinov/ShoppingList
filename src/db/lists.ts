import { getDb, write } from './index';

export type ShoppingList = {
  id: number;
  title: string;
  color: string;
  sort: number;
  plannedDate: string | null;
  remind: boolean;
  total: number;
  left: number; // осталось купить
};

type Row = {
  id: number; title: string; color: string; sort: number; planned_date: string | null; remind: number;
  total: number; left: number;
};

const toList = (r: Row): ShoppingList => ({
  id: r.id, title: r.title, color: r.color, sort: r.sort, plannedDate: r.planned_date,
  remind: r.remind === 1, total: r.total, left: r.left,
});

const SELECT = `SELECT l.id, l.title, l.color, l.sort, l.planned_date, l.remind,
            (SELECT COUNT(*) FROM items i WHERE i.list_id = l.id) AS total,
            (SELECT COUNT(*) FROM items i WHERE i.list_id = l.id AND i.bought_at IS NULL) AS "left"
       FROM lists l WHERE l.archived_at IS NULL`;

export async function loadLists(): Promise<ShoppingList[]> {
  const rows = await getDb().getAllAsync<Row>(`${SELECT} ORDER BY l.sort, l.id`);
  return rows.map(toList);
}

export async function loadList(id: number): Promise<ShoppingList | null> {
  const row = await getDb().getFirstAsync<Row>(`${SELECT} AND l.id = ?`, id);
  return row ? toList(row) : null;
}

export async function createList(title: string, color: string, plannedDate: string | null = null, remind = false): Promise<number> {
  const res = await write(
    'INSERT INTO lists (title, color, sort, planned_date, remind, created_at) VALUES (?, ?, (SELECT COALESCE(MAX(sort), 0) + 1 FROM lists), ?, ?, ?)',
    title.trim(),
    color,
    plannedDate,
    remind && plannedDate ? 1 : 0,
    new Date().toISOString(),
  );
  return res.lastInsertRowId;
}

export async function updateList(id: number, title: string, color: string, plannedDate: string | null, remind: boolean): Promise<void> {
  await write(
    'UPDATE lists SET title = ?, color = ?, planned_date = ?, remind = ? WHERE id = ?',
    title.trim(), color, plannedDate, remind && plannedDate ? 1 : 0, id,
  );
}

export async function deleteList(id: number): Promise<void> {
  await write('DELETE FROM lists WHERE id = ?', id);
}

// Копия списка: тот же цвет, выбранные товары (без отметок «куплено» и дат), новое название и дата.
// Товары копируются одним запросом, не по одному.
export async function copyList(sourceId: number, title: string, plannedDate: string | null, remind: boolean, itemIds: number[]): Promise<number> {
  const now = new Date().toISOString();
  const src = await getDb().getFirstAsync<{ color: string }>('SELECT color FROM lists WHERE id = ?', sourceId);
  const res = await write(
    `INSERT INTO lists (title, color, sort, planned_date, remind, created_at)
     VALUES (?, ?, (SELECT COALESCE(MAX(sort), 0) + 1 FROM lists), ?, ?, ?)`,
    title.trim(),
    src?.color ?? 'green',
    plannedDate,
    remind && plannedDate ? 1 : 0,
    now,
  );
  const newId = res.lastInsertRowId;
  if (itemIds.length > 0) {
    const marks = itemIds.map(() => '?').join(',');
    await write(
      `INSERT INTO items (list_id, title, qty, unit, note, category_id, sort, created_at)
       SELECT ?, title, qty, unit, note, category_id, sort, ? FROM items WHERE list_id = ? AND id IN (${marks})`,
      newId,
      now,
      sourceId,
      ...itemIds,
    );
  }
  return newId;
}

// «Начать заново»: снять отметки «куплено» у всех товаров списка, сами товары остаются.
export async function resetBought(listId: number): Promise<void> {
  await write('UPDATE items SET bought_at = NULL WHERE list_id = ?', listId);
}
