import { getDb } from './index';
import { Item, ItemRow, toItem } from './items';

export type ScheduledItem = Item & { listTitle: string; listColor: string; effectiveDate: string };

type Row = ItemRow & { list_title: string; list_color: string; eff: string };

const SELECT = `
  SELECT i.*, l.title AS list_title, l.color AS list_color, COALESCE(i.planned_date, l.planned_date) AS eff
    FROM items i JOIN lists l ON l.id = i.list_id
   WHERE l.archived_at IS NULL`;

const map = (r: Row): ScheduledItem => ({ ...toItem(r), listTitle: r.list_title, listColor: r.list_color, effectiveDate: r.eff });

// Всё, что запланировано в диапазоне дат (месяц календаря): один запрос на месяц.
export async function loadScheduledRange(from: string, to: string): Promise<ScheduledItem[]> {
  const rows = await getDb().getAllAsync<Row>(
    `SELECT * FROM (${SELECT}) WHERE eff BETWEEN ? AND ? ORDER BY eff, sort, id`,
    from,
    to,
  );
  return rows.map(map);
}

// Не купленное на сегодня и раньше.
export async function loadDue(today: string): Promise<ScheduledItem[]> {
  const rows = await getDb().getAllAsync<Row>(
    `SELECT * FROM (${SELECT} AND i.bought_at IS NULL) WHERE eff IS NOT NULL AND eff <= ? ORDER BY eff, sort, id`,
    today,
  );
  return rows.map(map);
}
