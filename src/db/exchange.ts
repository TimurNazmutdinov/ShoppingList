import { getDb, write } from './index';
import { ExchangeFile, ExportCategory, ExportDish, ExportHistory, ExportItem, ExportList } from '@/logic/exchange';
import { normTitle } from '@/logic/history';
import { loadUserDishes } from './dishes';

type ListRow = { id: number; title: string; color: string; planned_date: string | null; budget: number | null };
type ItemRow = {
  list_id: number; title: string; qty: number | null; unit: string | null; price: number | null; note: string | null;
  planned_date: string | null; bought_at: string | null; cat_key: string | null; cat_title: string | null;
};
type HistoryRow = {
  title: string; qty: number | null; unit: string | null; price: number | null; used_count: number;
  cat_key: string | null; cat_title: string | null;
};

const category = (key: string | null, title: string | null): ExportCategory => (key ? { key } : title ? { title } : null);

// Списки с товарами для выгрузки: все или один (два запроса на всё, без запросов в цикле).
export async function loadExportLists(listId?: number): Promise<ExportList[]> {
  const db = getDb();
  const one = listId !== undefined;
  const lists = await db.getAllAsync<ListRow>(
    `SELECT id, title, color, planned_date, budget FROM lists WHERE archived_at IS NULL${one ? ' AND id = ?' : ''} ORDER BY sort, id`,
    ...(one ? [listId] : []),
  );
  const items = await db.getAllAsync<ItemRow>(
    `SELECT i.list_id, i.title, i.qty, i.unit, i.price, i.note, i.planned_date, i.bought_at, c.key AS cat_key, c.title AS cat_title
       FROM items i LEFT JOIN categories c ON c.id = i.category_id${one ? ' WHERE i.list_id = ?' : ''}
      ORDER BY i.list_id, i.sort, i.id`,
    ...(one ? [listId] : []),
  );
  const byList = new Map<number, ExportItem[]>();
  for (const r of items) {
    const entry: ExportItem = {
      title: r.title, qty: r.qty, unit: r.unit, price: r.price, note: r.note,
      category: category(r.cat_key, r.cat_title), plannedDate: r.planned_date, bought: r.bought_at !== null,
    };
    const arr = byList.get(r.list_id);
    if (arr) arr.push(entry);
    else byList.set(r.list_id, [entry]);
  }
  return lists.map((l) => ({ title: l.title, color: l.color, plannedDate: l.planned_date, budget: l.budget, items: byList.get(l.id) ?? [] }));
}

export async function loadExportHistory(): Promise<ExportHistory[]> {
  const rows = await getDb().getAllAsync<HistoryRow>(
    `SELECT h.title, h.qty, h.unit, h.price, h.used_count, c.key AS cat_key, c.title AS cat_title
       FROM history h LEFT JOIN categories c ON c.id = h.category_id ORDER BY h.used_count DESC LIMIT 5000`,
  );
  return rows.map((r) => ({ title: r.title, qty: r.qty, unit: r.unit, price: r.price, category: category(r.cat_key, r.cat_title), usedCount: r.used_count }));
}

// Свои блюда для резервной копии.
export async function loadExportDishes(): Promise<ExportDish[]> {
  const dishes = await loadUserDishes();
  return dishes.map((d) => ({ title: d.title, products: d.products.map((p) => ({ title: p.title, qty: p.qty, unit: p.unit, price: p.price })) }));
}

const chunks = <T,>(arr: readonly T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

// Добавляет содержимое файла как новые списки (существующие не меняются); история — только новые названия.
// Всё в одной транзакции: ошибка → ничего не добавлено. Товары вставляются пачками, не по одному.
export async function importExchange(file: ExchangeFile): Promise<{ lists: number; items: number }> {
  const db = getDb();
  let itemCount = 0;
  await db.withTransactionAsync(async () => {
    const cats = await db.getAllAsync<{ id: number; key: string | null; title: string | null }>('SELECT id, key, title FROM categories');
    const byKey = new Map<string, number>();
    const byTitle = new Map<string, number>();
    for (const c of cats) {
      if (c.key) byKey.set(c.key, c.id);
      else if (c.title) byTitle.set(c.title.toLowerCase(), c.id);
    }
    // своих категорий из файла, которых ещё нет, заводим заранее (их мало)
    const customTitles = new Set<string>();
    const collect = (c: ExportCategory) => {
      if (c && 'title' in c) customTitles.add(c.title);
    };
    file.lists.forEach((l) => l.items.forEach((i) => collect(i.category)));
    file.history.forEach((h) => collect(h.category));
    for (const title of customTitles) {
      if (byTitle.has(title.toLowerCase())) continue;
      const res = await write("INSERT INTO categories (key, title, color, sort) VALUES (NULL, ?, 'slate', (SELECT COALESCE(MAX(sort), 0) + 1 FROM categories))", title);
      byTitle.set(title.toLowerCase(), res.lastInsertRowId);
    }
    const idOf = (c: ExportCategory): number | null => (!c ? null : 'key' in c ? byKey.get(c.key) ?? null : byTitle.get(c.title.toLowerCase()) ?? null);

    const now = new Date().toISOString();
    for (const list of file.lists) {
      const res = await write(
        'INSERT INTO lists (title, color, sort, planned_date, remind, budget, created_at) VALUES (?, ?, (SELECT COALESCE(MAX(sort), 0) + 1 FROM lists), ?, 0, ?, ?)',
        list.title, list.color, list.plannedDate, list.budget, now,
      );
      const listId = res.lastInsertRowId;
      for (const part of chunks(list.items.map((item, i) => ({ item, sort: i + 1 })), 60)) {
        const marks = part.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)').join(', ');
        const params = part.flatMap(({ item, sort }) => [
          listId, item.title, item.qty, item.unit, item.price, item.note, idOf(item.category), item.plannedDate,
          item.bought ? now : null, sort, now,
        ]);
        await write(
          `INSERT INTO items (list_id, title, qty, unit, price, note, category_id, planned_date, remind, bought_at, sort, created_at) VALUES ${marks}`,
          ...params,
        );
      }
      itemCount += list.items.length;
    }
    for (const part of chunks(file.history, 100)) {
      const marks = part.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const params = part.flatMap((h) => [normTitle(h.title), h.title, h.qty, h.unit, h.price, idOf(h.category), h.usedCount, now]);
      await write(
        `INSERT OR IGNORE INTO history (title_norm, title, qty, unit, price, category_id, used_count, last_used_at) VALUES ${marks}`,
        ...params,
      );
    }
    // свои блюда: блюдо с таким названием уже есть — не дублируем
    const known = new Set((await db.getAllAsync<{ title: string }>('SELECT title FROM dishes')).map((d) => d.title.toLowerCase()));
    for (const dish of file.dishes) {
      if (known.has(dish.title.toLowerCase())) continue;
      known.add(dish.title.toLowerCase());
      const res = await write(
        'INSERT INTO dishes (title, sort, created_at) VALUES (?, (SELECT COALESCE(MAX(sort), 0) + 1 FROM dishes), ?)',
        dish.title, now,
      );
      const marks = dish.products.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
      await write(
        `INSERT INTO dish_items (dish_id, title, qty, unit, price, sort) VALUES ${marks}`,
        ...dish.products.flatMap((p, i) => [res.lastInsertRowId, p.title, p.qty, p.unit, p.price, i + 1]),
      );
    }
  });
  return { lists: file.lists.length, items: itemCount };
}
