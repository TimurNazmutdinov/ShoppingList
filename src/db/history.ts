import { getDb, write } from './index';
import { HistoryRow, RememberInput, nextHistory, normTitle, rankSuggestions } from '@/logic/history';

type Row = {
  title_norm: string; title: string; qty: number | null; unit: string | null; price: number | null;
  category_id: number | null; used_count: number; last_used_at: string;
};

const toRow = (r: Row): HistoryRow => ({
  titleNorm: r.title_norm, title: r.title, qty: r.qty, unit: r.unit, price: r.price,
  categoryId: r.category_id, usedCount: r.used_count, lastUsedAt: r.last_used_at,
});

export async function findHistory(title: string): Promise<HistoryRow | null> {
  const row = await getDb().getFirstAsync<Row>('SELECT * FROM history WHERE title_norm = ?', normTitle(title));
  return row ? toRow(row) : null;
}

// Подсказки по началу названия. Берём с запасом из БД и ранжируем в коде.
export async function suggest(query: string, limit = 5): Promise<HistoryRow[]> {
  const q = normTitle(query);
  if (!q) return [];
  const rows = await getDb().getAllAsync<Row>(
    "SELECT * FROM history WHERE title_norm LIKE ? ESCAPE '\\' ORDER BY used_count DESC, last_used_at DESC LIMIT 30",
    `${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`,
  );
  return rankSuggestions(rows.map(toRow), q, limit);
}

// Вызывается, когда товар отмечен купленным: запоминаем параметры этой покупки.
export async function remember(input: RememberInput): Promise<void> {
  const prev = await findHistory(input.title);
  const next = nextHistory(prev, input, new Date().toISOString());
  await write(
    `INSERT OR REPLACE INTO history (title_norm, title, qty, unit, price, category_id, used_count, last_used_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    next.titleNorm, next.title, next.qty, next.unit, next.price, next.categoryId, next.usedCount, next.lastUsedAt,
  );
}

export async function clearHistory(): Promise<void> {
  await write('DELETE FROM history');
}
