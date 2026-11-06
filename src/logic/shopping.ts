// Правила работы со списками и товарами. Экраны вызывают только эти функции, SQL — в src/db.
import { getSetting, setSetting } from '@/db';
import { Item, ItemPatch, addItem, deleteItem, loadItems, restoreItem, setBought, updateItem } from '@/db/items';
import { createCategory, loadCategories } from '@/db/categories';
import { ScheduledItem, loadDue, loadScheduledRange } from '@/db/schedule';
import { ShoppingList, copyList, createList, deleteList, loadList, loadLists, resetBought, updateList } from '@/db/lists';
import { clearHistory, findHistory, remember, suggest } from '@/db/history';
import { HistoryRow } from './history';

export type { Item, ItemPatch, ScheduledItem, ShoppingList, HistoryRow };
export type { Category } from './categories';
export { clearHistory };
export { createCategory, loadCategories, loadDue, loadScheduledRange };
export { copyList, createList, deleteList, loadItems, loadList, loadLists, resetBought, restoreItem, suggest, updateItem, updateList };

export type QuickQty = { qty: number | null; unit: string | null };
export const NO_QTY: QuickQty = { qty: null, unit: null };

type AddOptions = {
  remember: boolean; // включено «Запоминать параметры товаров»
  preset?: HistoryRow; // выбрана подсказка
  quick?: QuickQty; // количество, заданное рядом с «+»
};

// Добавление: количество из быстрого ввода главнее; иначе подсказка или точное совпадение в истории; иначе только название.
export async function addByTitle(listId: number, title: string, opts: AddOptions): Promise<void> {
  const name = title.trim();
  if (!name) return;
  const quick = opts.quick ?? NO_QTY;
  const hasQuick = quick.qty !== null || quick.unit !== null;
  const h = hasQuick ? null : opts.preset ?? (opts.remember ? await findHistory(name) : null);
  await addItem({
    listId,
    title: name,
    qty: hasQuick ? quick.qty : h?.qty ?? null,
    unit: hasQuick ? quick.unit : h?.unit ?? null,
    categoryId: h?.categoryId ?? null,
  });
}

// Отметка «куплено» / возврат. При покупке запоминаем параметры. Возвращает новое состояние.
export async function toggleBought(item: Item, rememberOn: boolean): Promise<boolean> {
  const makeBought = item.boughtAt === null;
  await setBought(item.id, makeBought);
  if (makeBought && rememberOn) await remember({ title: item.title, qty: item.qty, unit: item.unit, categoryId: item.categoryId });
  return makeBought;
}

export const removeItem = (item: Item) => deleteItem(item.id);

// Одноразовые подсказки в интерфейсе.
export async function isFlagSet(key: string): Promise<boolean> {
  return (await getSetting<boolean>(key)) === true;
}
export const setFlag = (key: string) => setSetting(key, true);
