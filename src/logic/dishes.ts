// Блюда: набор продуктов, который можно добавить в список и поправить (убрать лишнее, изменить количество, добавить своё).
// Названия продуктов берутся из каталога (src/logic/catalog.ts) на языке приложения; казахские — на проверку носителем.
import { Lang } from '@/i18n';
import { catalogRow } from './catalog';
import { Category } from './categories';

// [название продукта в каталоге (ru), количество, единица]
type Ingredient = readonly [string, number | null, string | null];

export type Dish = { id: string; names: readonly [string, string, string]; ingredients: readonly Ingredient[] };

export const DISHES: readonly Dish[] = [
  { id: 'plov', names: ['Плов', 'Палау', 'Plov'], ingredients: [['Баранина', 0.8, 'kg'], ['Рис', 0.5, 'kg'], ['Морковь', 0.5, 'kg'], ['Лук', 2, 'pcs'], ['Масло растительное', 0.2, 'l'], ['Чеснок', 1, 'pcs'], ['Специи', 1, 'pack'], ['Соль', null, null]] },
  { id: 'beshbarmak', names: ['Бешбармак', 'Бешбармақ', 'Beshbarmak'], ingredients: [['Баранина', 1, 'kg'], ['Картофель', 1, 'kg'], ['Лук', 3, 'pcs'], ['Мука', 0.5, 'kg'], ['Яйца', 3, 'pcs'], ['Соль', null, null]] },
  { id: 'manty', names: ['Манты', 'Мәнті', 'Manti'], ingredients: [['Фарш', 0.8, 'kg'], ['Лук', 3, 'pcs'], ['Мука', 0.6, 'kg'], ['Тыква', 0.3, 'kg'], ['Специи', 1, 'pack'], ['Соль', null, null]] },
  { id: 'lagman', names: ['Лагман', 'Лағман', 'Lagman'], ingredients: [['Говядина', 0.6, 'kg'], ['Макароны', 0.4, 'kg'], ['Перец болгарский', 2, 'pcs'], ['Помидоры', 3, 'pcs'], ['Лук', 2, 'pcs'], ['Морковь', 2, 'pcs'], ['Чеснок', 1, 'pcs'], ['Масло растительное', 0.1, 'l']] },
  { id: 'baursak', names: ['Баурсаки', 'Бауырсақ', 'Baursak'], ingredients: [['Мука', 0.6, 'kg'], ['Молоко', 0.25, 'l'], ['Яйца', 2, 'pcs'], ['Сахар', 50, 'g'], ['Дрожжи', 1, 'pack'], ['Масло растительное', 0.5, 'l'], ['Соль', null, null]] },
  { id: 'borsch', names: ['Борщ', 'Борщ', 'Borscht'], ingredients: [['Говядина', 0.5, 'kg'], ['Свёкла', 2, 'pcs'], ['Капуста', 0.3, 'kg'], ['Картофель', 0.5, 'kg'], ['Морковь', 1, 'pcs'], ['Лук', 1, 'pcs'], ['Томатная паста', 1, 'pack'], ['Сметана', 1, 'pack']] },
  { id: 'olivier', names: ['Оливье', 'Оливье', 'Olivier salad'], ingredients: [['Картофель', 0.5, 'kg'], ['Морковь', 2, 'pcs'], ['Яйца', 5, 'pcs'], ['Огурцы', 3, 'pcs'], ['Горох', 1, 'pack'], ['Колбаса', 0.3, 'kg'], ['Майонез', 1, 'pack'], ['Лук', 1, 'pcs']] },
  { id: 'pancakes', names: ['Блины', 'Құймақ', 'Pancakes'], ingredients: [['Молоко', 0.5, 'l'], ['Яйца', 3, 'pcs'], ['Мука', 0.3, 'kg'], ['Сахар', 50, 'g'], ['Масло растительное', 0.1, 'l'], ['Соль', null, null]] },
];

const LANG_INDEX: Record<Lang, 0 | 1 | 2> = { ru: 0, kk: 1, en: 2 };

export const dishName = (dish: Dish, lang: Lang): string => dish.names[LANG_INDEX[lang]];

export type DishRow = { key: string; title: string; qty: number | null; unit: string | null; categoryId: number | null; price?: number | null };

// Продукты блюда на языке приложения; категория — из каталога.
export function dishRows(dish: Dish, lang: Lang, categories: readonly Category[]): DishRow[] {
  return dish.ingredients.map(([ru, qty, unit], i) => {
    const row = catalogRow(ru, lang, categories);
    return { key: `${dish.id}-${i}`, title: row?.title ?? ru, qty, unit, categoryId: row?.categoryId ?? null };
  });
}
