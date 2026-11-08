// Правила работы со списками и товарами. Экраны вызывают только эти функции, SQL — в src/db.
import { getSetting, inTransaction, setSetting } from '@/db';
import { Item, ItemPatch, addItem, deleteItem, loadItems, restoreItem, setBought, updateItem } from '@/db/items';
import { createCategory, loadCategories } from '@/db/categories';
import { ScheduledItem, loadDue, loadScheduledRange } from '@/db/schedule';
import { ShoppingList, copyList, createList, deleteList, loadList, loadLists, resetBought, updateList } from '@/db/lists';
import { clearHistory, findHistory, remember, suggest, topHistory } from '@/db/history';
import { HistoryRow } from './history';
import { buyAgainCandidates } from './buyAgain';
import { catalogRow, findCatalog, matchCatalog } from './catalog';
import { isStructured, parseBulk, priceMarkers } from './bulk';
import { ShortcutAction, ShortcutTarget, shortcutTarget } from './shortcuts';
import { getLanguage, t } from '@/i18n';

export type { Item, ItemPatch, ScheduledItem, ShoppingList, HistoryRow };
export type { Category } from './categories';
export { clearHistory };
export { createCategory, loadCategories, loadDue, loadScheduledRange };
export { copyList, createList, deleteList, loadItems, loadList, loadLists, resetBought, restoreItem, updateItem, updateList };

// Количество, единица и цена (за всю позицию), заданные рядом с «+» или у товара в списке.
export type QuickQty = { qty: number | null; unit: string | null; price?: number | null };
export const NO_QTY: QuickQty = { qty: null, unit: null, price: null };

type AddOptions = {
  remember: boolean; // включено «Запоминать параметры товаров»
  preset?: HistoryRow; // выбрана подсказка
  quick?: QuickQty; // количество и цена, заданные рядом с «+»
  currency?: string; // символ валюты пользователя: он тоже значок цены в тексте
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

// «Купить снова»: частые покупки из истории без того, что уже в списке. Выключено «Запоминать параметры товаров» — ничего.
export async function loadBuyAgain(items: readonly { title: string; boughtAt: string | null }[], rememberOn: boolean, limit: number): Promise<HistoryRow[]> {
  if (!rememberOn) return [];
  const rows = await topHistory(limit + items.length); // запас на то, что уже в списке
  return buyAgainCandidates(rows, items, limit);
}

// Добавление: количество и цена из быстрого ввода главнее; иначе подсказка или точное совпадение в истории; иначе только название.
// Цена из истории подставляется, только если количество не меняли (цена — за всю позицию).
export async function addByTitle(listId: number, title: string, opts: AddOptions): Promise<void> {
  const name = title.trim();
  if (!name) return;
  const quick = opts.quick ?? NO_QTY;
  const hasQty = quick.qty !== null || quick.unit !== null;
  const known = opts.preset ?? (opts.remember ? await findHistory(name) : null);
  // нет в истории — берём категорию из каталога по точному названию
  const catalog = known ? null : findCatalog(name, getLanguage(), await loadCategories());
  const h = known ?? catalog;
  const qty = hasQty ? quick.qty : h?.qty ?? null;
  const unit = hasQty ? quick.unit : h?.unit ?? null;
  const categoryId = h?.categoryId ?? null;
  const sameAsKnown = !hasQty || (known !== null && known.qty === quick.qty && known.unit === quick.unit);
  const price = quick.price ?? (sameAsKnown ? h?.price ?? null : null);
  await addItem({ listId, title: name, qty, unit, price, categoryId });
  // запоминаем сразу при добавлении: в следующий раз «молоко» подставится с теми же параметрами
  if (opts.remember) await remember({ title: name, qty, unit, price, categoryId });
}

// Сохранение правки товара: параметры запоминаются, если включено «Запоминать параметры товаров».
export async function saveItem(id: number, patch: ItemPatch, rememberOn: boolean): Promise<void> {
  await updateItem(id, patch);
  if (rememberOn) await remember({ title: patch.title, qty: patch.qty, unit: patch.unit, price: patch.price, categoryId: patch.categoryId });
}

// Ввод из строки: одно название — обычное добавление; несколько («молоко, хлеб»), с количеством («2 кг сыра») или ценой
// («хлеб 120 ₸») — разбираются на товары.
export async function addFromText(listId: number, text: string, opts: AddOptions): Promise<void> {
  const parsed = parseBulk(text, priceMarkers(opts.currency));
  if (opts.preset || !isStructured(parsed)) {
    await addByTitle(listId, text, opts);
    return;
  }
  // одной транзакцией: либо все товары добавлены, либо ни одного
  await inTransaction(async () => {
    for (const p of parsed) {
      const own = p.qty !== null || p.unit !== null || p.price !== undefined;
      const outer = parsed.length === 1 ? opts.quick : undefined; // количество и цена рядом с «+» — только для единственного товара
      const quick = own
        ? { qty: p.qty ?? outer?.qty ?? null, unit: p.unit ?? outer?.unit ?? null, price: p.price ?? outer?.price ?? null }
        : outer;
      await addByTitle(listId, p.title, { remember: opts.remember, quick });
    }
  });
}

// Несколько товаров сразу (набор из блюда): у каждого свои название, количество, единица и цена. Одной транзакцией.
export async function addMany(
  listId: number,
  items: { title: string; qty: number | null; unit: string | null; price?: number | null }[],
  rememberOn: boolean,
): Promise<void> {
  await inTransaction(async () => {
    for (const i of items) await addByTitle(listId, i.title, { remember: rememberOn, quick: { qty: i.qty, unit: i.unit, price: i.price ?? null } });
  });
}

// Быстрая правка количества и цены товара прямо в списке.
export async function setItemQtyPrice(item: Item, v: QuickQty, rememberOn: boolean): Promise<void> {
  await saveItem(
    item.id,
    { title: item.title, qty: v.qty, unit: v.unit, price: v.price ?? null, note: item.note, categoryId: item.categoryId, plannedDate: item.plannedDate, remind: item.remind },
    rememberOn,
  );
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

// Последний открытый список: на него ведёт ярлык «Добавить товар».
export const rememberLastList = (listId: number) => setSetting('lastListId', listId);

export async function resolveShortcut(action: ShortcutAction): Promise<ShortcutTarget> {
  const last = await getSetting<unknown>('lastListId');
  const ids = (await loadLists()).map((l) => l.id);
  return shortcutTarget(action, typeof last === 'number' ? last : null, ids);
}

// Одноразовые подсказки в интерфейсе.
export async function isFlagSet(key: string): Promise<boolean> {
  return (await getSetting<boolean>(key)) === true;
}
export const setFlag = (key: string) => setSetting(key, true);
