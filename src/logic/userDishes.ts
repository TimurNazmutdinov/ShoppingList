// Список блюд для «Добавить из блюда»: стандартные (в коде, можно скрыть) и свои (в базе). Правка стандартного блюда
// создаёт своё блюдо с тем же названием, а стандартное скрывается; удаление стандартного — только скрытие.
import { inTransaction } from '@/db';
import { DishProduct, UserDish, deleteUserDish, loadHiddenDishes, loadUserDishes, saveHiddenDishes, saveUserDish } from '@/db/dishes';
import { Lang } from '@/i18n';
import { Category } from './categories';
import { DISHES, DishRow, dishName, dishRows } from './dishes';

export type { DishProduct, UserDish };

export const MAX_DISH_PRODUCTS = 60;

export type DishEntry = {
  key: string; // 'b:plov' — стандартное, 'o:12' — своё
  kind: 'builtin' | 'own';
  builtinId?: string;
  ownId?: number;
  name: string;
  rows: DishRow[];
};

// Стандартные (кроме скрытых), затем свои — по порядку создания.
export function buildDishEntries(lang: Lang, categories: readonly Category[], own: readonly UserDish[], hidden: readonly string[]): DishEntry[] {
  const builtin = DISHES.filter((d) => !hidden.includes(d.id)).map(
    (d): DishEntry => ({ key: `b:${d.id}`, kind: 'builtin', builtinId: d.id, name: dishName(d, lang), rows: dishRows(d, lang, categories) }),
  );
  const mine = own.map(
    (o): DishEntry => ({
      key: `o:${o.id}`,
      kind: 'own',
      ownId: o.id,
      name: o.title,
      rows: o.products.map((p, i) => ({ key: `own-${o.id}-${i}`, title: p.title, qty: p.qty, unit: p.unit, categoryId: null, price: p.price })),
    }),
  );
  return [...builtin, ...mine];
}

export async function loadDishEntries(lang: Lang, categories: readonly Category[]): Promise<DishEntry[]> {
  const [own, hidden] = await Promise.all([loadUserDishes(), loadHiddenDishes()]);
  return buildDishEntries(lang, categories, own, hidden);
}

// Сколько стандартных блюд сейчас скрыто (для кнопки «Вернуть стандартные блюда»).
export const hiddenBuiltinCount = (entries: readonly DishEntry[]): number => DISHES.length - entries.filter((e) => e.kind === 'builtin').length;

const clean = (products: readonly DishProduct[]): DishProduct[] =>
  products
    .map((p) => ({ ...p, title: p.title.trim() }))
    .filter((p) => p.title.length > 0)
    .slice(0, MAX_DISH_PRODUCTS);

// Сохранение: новое блюдо, правка своего или правка стандартного (тогда стандартное скрывается). Одной транзакцией.
export async function saveDishEntry(entry: DishEntry | null, title: string, products: readonly DishProduct[]): Promise<void> {
  const name = title.trim();
  const list = clean(products);
  if (!name || list.length === 0) return;
  if (entry?.kind === 'own' && entry.ownId !== undefined) {
    await saveUserDish(entry.ownId, name, list);
    return;
  }
  await inTransaction(async () => {
    await saveUserDish(null, name, list);
    if (entry?.kind === 'builtin' && entry.builtinId) await saveHiddenDishes([...(await loadHiddenDishes()), entry.builtinId]);
  });
}

// Удаление: своё — насовсем, стандартное — скрыть.
export async function removeDishEntry(entry: DishEntry): Promise<void> {
  if (entry.kind === 'own' && entry.ownId !== undefined) {
    await deleteUserDish(entry.ownId);
    return;
  }
  if (entry.builtinId) {
    const hidden = await loadHiddenDishes();
    if (!hidden.includes(entry.builtinId)) await saveHiddenDishes([...hidden, entry.builtinId]);
  }
}

export async function restoreStandardDishes(): Promise<void> {
  await saveHiddenDishes([]);
}
