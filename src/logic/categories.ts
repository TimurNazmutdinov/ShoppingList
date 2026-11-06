import { StringKey, t } from '@/i18n';

export type Category = { id: number; key: string | null; title: string | null; color: string; sort: number };

// Встроенные — по ключу из словаря, свои — как написал пользователь.
export function categoryName(c: Category): string {
  return c.key ? t(`cat.${c.key}` as StringKey) : c.title ?? '';
}

export type CategoryGroup<T> = { category: Category | null; items: T[] };

// Группы по порядку категорий; «без категории» — в конце; пустые группы не показываем.
export function groupByCategory<T extends { categoryId: number | null }>(items: readonly T[], categories: readonly Category[]): CategoryGroup<T>[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const groups = new Map<number | null, T[]>();
  for (const item of items) {
    const key = item.categoryId !== null && byId.has(item.categoryId) ? item.categoryId : null;
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }
  const result: CategoryGroup<T>[] = [];
  for (const c of [...categories].sort((a, b) => a.sort - b.sort || a.id - b.id)) {
    const list = groups.get(c.id);
    if (list) result.push({ category: c, items: list });
  }
  const rest = groups.get(null);
  if (rest) result.push({ category: null, items: rest });
  return result;
}
