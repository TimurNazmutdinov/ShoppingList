// Копирование списка: название по умолчанию и набор товаров.

export type CopyMode = 'all' | 'unbought' | 'none';

// «Продукты» → «Продукты (копия)»; повторная копия не плодит «(копия) (копия)».
export function copyTitle(title: string, suffix: string): string {
  const tail = ` (${suffix})`;
  const base = title.trim();
  return base.endsWith(tail) ? base : `${base}${tail}`;
}

export function selectForCopy(items: readonly { id: number; boughtAt: string | null }[], mode: CopyMode): number[] {
  if (mode === 'none') return [];
  return items.filter((i) => mode === 'all' || i.boughtAt === null).map((i) => i.id);
}
