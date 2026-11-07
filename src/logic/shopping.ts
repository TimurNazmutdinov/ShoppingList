// Правила работы со списками и товарами. Экраны вызывают только эти функции, SQL — в src/db.
import { getSetting, setSetting } from '@/db';
import { Item, ItemPatch, addItem, deleteItem, loadItems, restoreItem, setBought, updateItem } from '@/db/items';
import { createCategory, loadCategories } from '@/db/categories';
import { ScheduledItem, loadDue, loadScheduledRange } from '@/db/schedule';
import { ShoppingList, copyList, createList, deleteList, loadList, loadLists, resetBought, updateList } from '@/db/lists';
import { clearHistory, findHistory, remember, suggest } from '@/db/history';
import { HistoryRow } from './history';
import { catalogRow, findCatalog, matchCatalog } from './catalog';
import { isStructured, parseBulk } from './bulk';
import { getLanguage, t } from '@/i18n';

export type { Item, ItemPatch, ScheduledItem, ShoppingList, HistoryRow };
export type { Category } from './categories';
export { clearHistory };
export { createCategory, loadCategories, loadDue, loadScheduledRange };
export { copyList, createList, deleteList, loadItems, loadList, loadLists, resetBought, restoreItem, updateItem, updateList };

export type QuickQty = { qty: number | null; unit: string | null };
export const NO_QTY: QuickQty = { qty: null, unit: null };

type AddOptions = {
  remember: boolean; // включено «Запоминать параметры товаров»
  preset?: HistoryRow; // выбрана подсказка
  quick?: QuickQty; // количество, заданное рядом с «+»
};

// Подсказки при вводе: сначала из истории покупок (если запоминание включено), затем из встроенного каталога.
export async function suggestAll(query: string, withHistory: boolean, limit = 5): Promise<HistoryRow[]> {
  if (!query.trim()) return [];
  const history = withHistory ? await suggest(query, limit) : [];
  if (history.length >= limit) return history;
  const categories = await loadCategories();
  const fromCatalog = matchCatalog(query, getLanguage(), categories, new Set(history.map((h) => h.titleNorm)), limit - history.length);
  return [...history, ...fromCatalog];
}

// Добавление: количество из быстрого ввода главнее; иначе подсказка или точное совпадение в истории; иначе только название.
export async function addByTitle(listId: number, title: string, opts: AddOptions): Promise<void> {
  const name = title.trim();
  if (!name) return;
  const quick = opts.quick ?? NO_QTY;
  const hasQuick = quick.qty !== null || quick.unit !== null;
  const known = opts.preset ?? (opts.remember ? await findHistory(name) : null);
  // нет в истории — берём категорию из каталога по точному названию
  const catalog = known ? null : findCatalog(name, getLanguage(), await loadCategories());
  const h = hasQuick ? catalog : known ?? catalog;
  const qty = hasQuick ? quick.qty : h?.qty ?? null;
  const unit = hasQuick ? quick.unit : h?.unit ?? null;
  const categoryId = h?.categoryId ?? null;
  const price = hasQuick ? null : h?.price ?? null;
  await addItem({ listId, title: name, qty, unit, price, categoryId });
  // запоминаем сразу при добавлении: в следующий раз «молоко» подставится с теми же параметрами
  if (opts.remember) await remember({ title: name, qty, unit, price, categoryId });
}

// Сохранение правки товара: параметры запоминаются, если включено «Запоминать параметры товаров».
export async function saveItem(id: number, patch: ItemPatch, rememberOn: boolean): Promise<void> {
  await updateItem(id, patch);
  if (rememberOn) await remember({ title: patch.title, qty: patch.qty, unit: patch.unit, price: patch.price, categoryId: patch.categoryId });
}

// Ввод из строки: одно название — обычное добавление; несколько («молоко, хлеб») или с количеством («2 кг сыра») — разбираются на товары.
export async function addFromText(listId: number, text: string, opts: AddOptions): Promise<void> {
  const parsed = parseBulk(text);
  if (opts.preset || !isStructured(parsed)) {
    await addByTitle(listId, text, opts);
    return;
  }
  for (const p of parsed) {
    const own = p.qty !== null || p.unit !== null;
    await addByTitle(listId, p.title, { remember: opts.remember, quick: own ? { qty: p.qty, unit: p.unit } : parsed.length === 1 ? opts.quick : undefined });
  }
}

// Несколько товаров сразу (набор из блюда): у каждого свои название, количество и единица.
export async function addMany(listId: number, items: { title: string; qty: number | null; unit: string | null }[], rememberOn: boolean): Promise<void> {
  for (const i of items) await addByTitle(listId, i.title, { remember: rememberOn, quick: { qty: i.qty, unit: i.unit } });
}

// Первый запуск: если списков нет, создаём пример «Продукты» с несколькими товарами (один раз; удалить можно как обычный).
export async function ensureSampleList(): Promise<boolean> {
  if (await isFlagSet('sampleListDone')) return false;
  await setFlag('sampleListDone');
  if ((await loadLists()).length > 0) return false;
  const categories = await loadCategories();
  const id = await createList(t('sample.listTitle'), 'green');
  for (const ru of ['Молоко', 'Хлеб', 'Яйца', 'Яблоки']) {
    const row = catalogRow(ru, getLanguage(), categories);
    if (row) await addItem({ listId: id, title: row.title, qty: null, unit: null, categoryId: row.categoryId });
  }
  return true;
}

// Отметка «куплено» / возврат. При покупке запоминаем параметры. Возвращает новое состояние.
export async function toggleBought(item: Item, rememberOn: boolean): Promise<boolean> {
  const makeBought = item.boughtAt === null;
  await setBought(item.id, makeBought);
  if (makeBought && rememberOn) await remember({ title: item.title, qty: item.qty, unit: item.unit, price: item.price, categoryId: item.categoryId });
  return makeBought;
}

export const removeItem = (item: Item) => deleteItem(item.id);

// Одноразовые подсказки в интерфейсе.
export async function isFlagSet(key: string): Promise<boolean> {
  return (await getSetting<boolean>(key)) === true;
}
export const setFlag = (key: string) => setSetting(key, true);
