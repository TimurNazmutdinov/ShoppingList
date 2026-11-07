// Обмен списками: файл приложения (один список или резервная копия), текст для мессенджеров, .txt и HTML для PDF.
// Чистая логика: разбор и проверка файла, форматирование. Чтение и запись БД — в db/exchange.ts.
import { DEFAULT_LIST_COLOR, isListColorKey } from '@/theme';
import { UNITS, formatQty } from './history';
import { formatMoney } from './money';

export const APP_ID = 'ShoppingList';
export const FORMAT = 1; // версия формата файла
export const BUILTIN_CATEGORY_KEYS = ['veg', 'dairy', 'bread', 'meat', 'grocery', 'drinks', 'household', 'other'];

const MAX_LISTS = 200;
const MAX_ITEMS = 2000;
const MAX_HISTORY = 5000;
const MAX_DISHES = 200;
const MAX_DISH_PRODUCTS = 60;

// Категория в файле: встроенная — по ключу, своя — по названию (id у телефонов разные).
export type ExportCategory = { key: string } | { title: string } | null;

export type ExportItem = {
  title: string;
  qty: number | null;
  unit: string | null;
  price: number | null;
  note: string | null;
  category: ExportCategory;
  plannedDate: string | null;
  bought: boolean;
};
export type ExportList = { title: string; color: string; plannedDate: string | null; items: ExportItem[] };
export type ExportHistory = { title: string; qty: number | null; unit: string | null; price: number | null; category: ExportCategory; usedCount: number };

// Своё блюдо: название и продукты (стандартные блюда в файл не попадают — они есть в самом приложении).
export type ExportDishProduct = { title: string; qty: number | null; unit: string | null; price: number | null };
export type ExportDish = { title: string; products: ExportDishProduct[] };

export type ExchangeFile = {
  app: typeof APP_ID;
  format: number;
  kind: 'list' | 'backup';
  exportedAt: string;
  lists: ExportList[];
  history: ExportHistory[];
  dishes: ExportDish[];
};

export function buildFile(kind: ExchangeFile['kind'], lists: ExportList[], history: ExportHistory[], now: Date, dishes: ExportDish[] = []): ExchangeFile {
  return { app: APP_ID, format: FORMAT, kind, exportedAt: now.toISOString(), lists, history, dishes };
}

export type ParseResult = { ok: true; file: ExchangeFile } | { ok: false; reason: 'invalid' | 'newer' | 'empty' };

// ---- Проверка и очистка данных из файла (файл мог прийти откуда угодно) ----

const str = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const num = (v: unknown, min: number): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= min ? v : null);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function cleanCategory(v: unknown): ExportCategory {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.key === 'string' && BUILTIN_CATEGORY_KEYS.includes(o.key)) return { key: o.key };
  const title = str(o.title, 40);
  return title ? { title } : null;
}

function cleanItem(v: unknown): ExportItem | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  const title = str(o.title, 120);
  if (!title) return null;
  const qty = num(o.qty, Number.MIN_VALUE);
  return {
    title,
    qty,
    unit: typeof o.unit === 'string' && (UNITS as readonly string[]).includes(o.unit) ? o.unit : null,
    price: num(o.price, 0),
    note: str(o.note, 300),
    category: cleanCategory(o.category),
    plannedDate: typeof o.plannedDate === 'string' && DATE.test(o.plannedDate) ? o.plannedDate : null,
    bought: o.bought === true,
  };
}

function cleanList(v: unknown): ExportList | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  const title = str(o.title, 80);
  if (!title) return null;
  const items = (Array.isArray(o.items) ? o.items : []).slice(0, MAX_ITEMS).map(cleanItem).filter((i): i is ExportItem => i !== null);
  return {
    title,
    color: typeof o.color === 'string' && isListColorKey(o.color) ? o.color : DEFAULT_LIST_COLOR,
    plannedDate: typeof o.plannedDate === 'string' && DATE.test(o.plannedDate) ? o.plannedDate : null,
    items,
  };
}

function cleanHistory(v: unknown): ExportHistory | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  const title = str(o.title, 120);
  if (!title) return null;
  return {
    title,
    qty: num(o.qty, Number.MIN_VALUE),
    unit: typeof o.unit === 'string' && (UNITS as readonly string[]).includes(o.unit) ? o.unit : null,
    price: num(o.price, 0),
    category: cleanCategory(o.category),
    usedCount: typeof o.usedCount === 'number' && Number.isInteger(o.usedCount) && o.usedCount > 0 ? Math.min(o.usedCount, 100000) : 1,
  };
}

function cleanDish(v: unknown): ExportDish | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  const title = str(o.title, 60);
  if (!title) return null;
  const products = (Array.isArray(o.products) ? o.products : [])
    .slice(0, MAX_DISH_PRODUCTS)
    .map((p): ExportDishProduct | null => {
      if (typeof p !== 'object' || p === null) return null;
      const po = p as Record<string, unknown>;
      const name = str(po.title, 60);
      if (!name) return null;
      return {
        title: name,
        qty: num(po.qty, Number.MIN_VALUE),
        unit: typeof po.unit === 'string' && (UNITS as readonly string[]).includes(po.unit) ? po.unit : null,
        price: num(po.price, 0),
      };
    })
    .filter((p): p is ExportDishProduct => p !== null);
  return products.length > 0 ? { title, products } : null;
}

export function parseFile(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (typeof raw !== 'object' || raw === null) return { ok: false, reason: 'invalid' };
  const o = raw as Record<string, unknown>;
  if (o.app !== APP_ID || typeof o.format !== 'number' || !Array.isArray(o.lists)) return { ok: false, reason: 'invalid' };
  if (o.format > FORMAT) return { ok: false, reason: 'newer' };
  const lists = o.lists.slice(0, MAX_LISTS).map(cleanList).filter((l): l is ExportList => l !== null);
  const history = (Array.isArray(o.history) ? o.history : []).slice(0, MAX_HISTORY).map(cleanHistory).filter((h): h is ExportHistory => h !== null);
  const dishes = (Array.isArray(o.dishes) ? o.dishes : []).slice(0, MAX_DISHES).map(cleanDish).filter((d): d is ExportDish => d !== null);
  if (lists.length === 0 && history.length === 0 && dishes.length === 0) return { ok: false, reason: 'empty' };
  return {
    ok: true,
    file: {
      app: APP_ID,
      format: o.format,
      kind: o.kind === 'backup' ? 'backup' : 'list',
      exportedAt: typeof o.exportedAt === 'string' ? o.exportedAt : '',
      lists,
      history,
      dishes,
    },
  };
}

export function countItems(file: ExchangeFile): number {
  return file.lists.reduce((n, l) => n + l.items.length, 0);
}

// Безопасное имя файла из названия списка.
export function fileSafeName(title: string): string {
  const cleaned = title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim().slice(0, 50);
  return cleaned || 'list';
}

// ---- Текст и PDF ----

export type FormatContext = {
  symbol: string; // символ валюты
  unitLabel: (unit: string) => string;
  categoryName: (category: ExportCategory) => string;
  totalLabel: string; // «Итого»
  dateLabel: string; // уже готовая подпись даты списка или ''
};

function itemLine(item: ExportItem, ctx: FormatContext): string {
  const qty = formatQty(item.qty, item.unit, ctx.unitLabel);
  const price = item.price === null ? '' : formatMoney(item.price, ctx.symbol);
  return [item.title, qty, price].filter(Boolean).join(' — ');
}

export function totalOf(list: ExportList): number | null {
  const priced = list.items.filter((i) => i.price !== null);
  return priced.length === 0 ? null : priced.reduce((sum, i) => sum + (i.price ?? 0), 0);
}

// Текст для мессенджеров и .txt: «☐ Молоко — 1 л — 450 ₸», купленное с «✓».
export function listToText(list: ExportList, ctx: FormatContext): string {
  const head = ctx.dateLabel ? `${list.title} (${ctx.dateLabel})` : list.title;
  const lines = [head, '', ...list.items.map((i) => `${i.bought ? '✓' : '☐'} ${itemLine(i, ctx)}`)];
  const total = totalOf(list);
  if (total !== null) lines.push('', `${ctx.totalLabel}: ${formatMoney(total, ctx.symbol)}`);
  return lines.join('\n');
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// HTML для PDF: заголовок, товары по категориям с рамками-галочками, итог.
export function listToHtml(list: ExportList, ctx: FormatContext): string {
  const groups = new Map<string, ExportItem[]>();
  for (const item of list.items) {
    const name = item.category ? ctx.categoryName(item.category) : '';
    const g = groups.get(name);
    if (g) g.push(item);
    else groups.set(name, [item]);
  }
  const body = [...groups.entries()]
    .map(([name, items]) => {
      const rows = items
        .map((i) => `<div class="row"><span class="box">${i.bought ? '✓' : ''}</span><span class="${i.bought ? 'done' : ''}">${esc(itemLine(i, ctx))}</span></div>`)
        .join('');
      return (groups.size > 1 && name ? `<h2>${esc(name)}</h2>` : '') + rows;
    })
    .join('');
  const total = totalOf(list);
  const sub = ctx.dateLabel ? `<div class="sub">${esc(ctx.dateLabel)}</div>` : '';
  const sum = total === null ? '' : `<div class="total">${esc(ctx.totalLabel)}: ${esc(formatMoney(total, ctx.symbol))}</div>`;
  return `<html><head><meta charset="utf-8"><style>
body{font-family:sans-serif;padding:24px;color:#222}
h1{font-size:26px;margin:0 0 4px}h2{font-size:14px;color:#777;text-transform:uppercase;margin:18px 0 6px}
.sub{color:#777;margin-bottom:12px}.row{display:flex;align-items:center;gap:12px;font-size:18px;padding:7px 0;border-bottom:1px solid #eee}
.box{width:18px;height:18px;border:2px solid #555;border-radius:4px;display:inline-block;text-align:center;line-height:18px;font-size:14px}
.done{color:#888;text-decoration:line-through}.total{margin-top:18px;font-size:20px;font-weight:bold}
</style></head><body><h1>${esc(list.title)}</h1>${sub}${body}${sum}</body></html>`;
}
