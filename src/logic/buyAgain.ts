import { HistoryRow, normTitle } from './history';

export const BUY_AGAIN_EMPTY = 8; // кнопок «Купить снова» в пустом списке
export const BUY_AGAIN_ROW = 12; // кнопок в ряду «Часто:» в непустом списке

// «Купить снова»: частые покупки из истории — сначала по числу использований, затем по свежести.
// Не показываем то, что уже лежит в списке и ещё не куплено (купленное предлагать можно: его снова нужно).
export function buyAgainCandidates(
  history: readonly HistoryRow[],
  items: readonly { title: string; boughtAt: string | null }[],
  limit: number,
): HistoryRow[] {
  const inList = new Set(items.filter((i) => i.boughtAt === null).map((i) => normTitle(i.title)));
  return history
    .filter((h) => !inList.has(h.titleNorm))
    .sort((a, b) => b.usedCount - a.usedCount || b.lastUsedAt.localeCompare(a.lastUsedAt))
    .slice(0, limit);
}
