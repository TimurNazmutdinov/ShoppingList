// Мини-самообучение: история покупок запоминает количество, единицу и категорию последней покупки.

export type Unit = 'pcs' | 'kg' | 'g' | 'l' | 'pack';
export const UNITS: readonly Unit[] = ['pcs', 'kg', 'g', 'l', 'pack'];

export type HistoryRow = {
  titleNorm: string;
  title: string;
  qty: number | null;
  unit: string | null;
  categoryId: number | null;
  usedCount: number;
  lastUsedAt: string;
};

export type RememberInput = { title: string; qty: number | null; unit: string | null; categoryId: number | null };

// «Гречка », «гречка», «ГРЕЧКА» и «греч ка» с лишними пробелами — один товар; ё = е.
export function normTitle(title: string): string {
  return title.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

// 0.8 + kg → «0,8 кг». Без количества — только единица, без единицы — только число.
export function formatQty(qty: number | null, unit: string | null, unitLabel: (u: string) => string = (u) => u): string {
  const q = qty === null ? '' : String(qty).replace('.', ',');
  const u = unit ? unitLabel(unit) : '';
  return [q, u].filter(Boolean).join(' ');
}

// Ввод пользователя «0,8» / «0.8» → число; пусто или не число → null (количество не обязательно).
export function parseQty(input: string): number | null {
  const text = input.trim().replace(',', '.');
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Новая запись истории после покупки. Параметры последней покупки заменяют прежние;
// если в этот раз параметр не задан — прежний не стирается.
export function nextHistory(prev: HistoryRow | null, input: RememberInput, now: string): HistoryRow {
  return {
    titleNorm: normTitle(input.title),
    title: input.title.trim(),
    qty: input.qty ?? prev?.qty ?? null,
    unit: input.unit ?? prev?.unit ?? null,
    categoryId: input.categoryId ?? prev?.categoryId ?? null,
    usedCount: (prev?.usedCount ?? 0) + 1,
    lastUsedAt: now,
  };
}

// Что предложить при вводе: сначала частые, затем недавние; точное совпадение — первым.
export function rankSuggestions(rows: readonly HistoryRow[], query: string, limit = 5): HistoryRow[] {
  const q = normTitle(query);
  if (!q) return [];
  return rows
    .filter((r) => r.titleNorm.startsWith(q))
    .sort((a, b) => {
      if ((a.titleNorm === q) !== (b.titleNorm === q)) return a.titleNorm === q ? -1 : 1;
      if (a.usedCount !== b.usedCount) return b.usedCount - a.usedCount;
      return b.lastUsedAt.localeCompare(a.lastUsedAt);
    })
    .slice(0, limit);
}
