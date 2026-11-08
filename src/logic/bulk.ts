// Массовое добавление: «молоко, хлеб, 2 кг сыра» или список из мессенджера (по строке на товар) → товары с количеством и ценой.

export type BulkItem = { title: string; qty: number | null; unit: string | null; price?: number };

// Слова единиц на трёх языках → ключ единицы.
const UNIT_WORDS: Record<string, string> = {
  шт: 'pcs', штук: 'pcs', штуки: 'pcs', штука: 'pcs', дана: 'pcs', pcs: 'pcs', pc: 'pcs',
  кг: 'kg', килограмм: 'kg', килограмма: 'kg', kg: 'kg',
  г: 'g', гр: 'g', грамм: 'g', грамма: 'g', граммов: 'g', g: 'g',
  л: 'l', литр: 'l', литра: 'l', литров: 'l', l: 'l',
  уп: 'pack', упаковка: 'pack', упаковки: 'pack', упаковку: 'pack', упаковок: 'pack', пачка: 'pack', пачки: 'pack', пачку: 'pack', пачек: 'pack', қап: 'pack', pack: 'pack',
  liter: 'l', liters: 'l', litre: 'l', litres: 'l', gram: 'g', grams: 'g', kilogram: 'kg', kilograms: 'kg', piece: 'pcs', pieces: 'pcs',
};

// Слова-числа, как их записывает распознавание речи («одна пачка»): считаются количеством только рядом со словом-единицей.
const NUMBER_WORDS: Record<string, number> = {
  один: 1, одна: 1, одно: 1, одну: 1, два: 2, две: 2, три: 3, четыре: 4, пять: 5, шесть: 6, семь: 7, восемь: 8, девять: 9, десять: 10, полтора: 1.5, полторы: 1.5,
  бір: 1, екі: 2, үш: 3, төрт: 4, бес: 5, алты: 6, жеті: 7, сегіз: 8, тоғыз: 9, он: 10,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};
const numberWord = (token: string): number | null => {
  const key = token.toLowerCase();
  return Object.prototype.hasOwnProperty.call(NUMBER_WORDS, key) ? NUMBER_WORDS[key] : null;
};

// Значки цены: число со значком — цена («450 ₸», «450тг», «3 000 тенге»); число без значка остаётся в названии.
const BASE_MARKERS = ['₸', 'тг', 'тнг', 'тенге', 'теңге', 'tg', 'tenge', '₽', 'руб', 'рубль', 'рубля', 'рублей', 'р', 'kzt', 'rub'];
const markerKey = (s: string) => s.toLowerCase().replace(/\.$/, '');

// Значки цены: стандартные и символ (или код) валюты пользователя.
export function priceMarkers(symbol = ''): ReadonlySet<string> {
  const set = new Set(BASE_MARKERS);
  const own = markerKey(symbol.trim());
  if (own && !/^\d+$/.test(own)) set.add(own);
  return set;
}

const isDigit = (c: string | undefined) => c !== undefined && c >= '0' && c <= '9';
const NUMBER = /^\d+([.,]\d+)?$/;
const BULLET = /^[-•*☐□✓✔☑▢·–—]+\s*/;
const NUMBERING = /^\d+[.)]\s+/;

// Делит на части по строкам, «;» и запятым; запятая между цифрами («0,5») — не разделитель.
export function splitBulk(text: string): string[] {
  const parts: string[] = [];
  let cur = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const isSep = c === '\n' || c === '\r' || c === ';' || (c === ',' && !(isDigit(text[i - 1]) && isDigit(text[i + 1])));
    if (isSep) {
      parts.push(cur);
      cur = '';
    } else cur += c;
  }
  parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
}

const toNumber = (token: string): number => Number(token.replace(',', '.'));

// Цена в конце части: «450₸», «450 ₸», «3 000 тг». Возвращает остаток слов и цену.
function extractPrice(tokens: string[], markers: ReadonlySet<string>): { rest: string[]; price: number | undefined } {
  const none = { rest: tokens, price: undefined };
  const last = tokens[tokens.length - 1];
  const attached = last.match(/^(\d+(?:[.,]\d+)?)(\D+)$/);
  if (attached && markers.has(markerKey(attached[2]))) return { rest: tokens.slice(0, -1), price: toNumber(attached[1]) };
  if (tokens.length < 2 || !markers.has(markerKey(last))) return none;
  let at = tokens.length - 2;
  if (!NUMBER.test(tokens[at])) return none;
  const parts = [tokens[at]];
  // группы тысяч: «3 000»
  while (at > 0 && /^\d{3}([.,]\d+)?$/.test(parts[0]) && /^\d{1,3}$/.test(tokens[at - 1])) {
    at--;
    parts.unshift(tokens[at]);
  }
  return { rest: tokens.slice(0, at), price: toNumber(parts.join('')) };
}

// Одна часть → название, количество, единица, цена.
// «2 кг сыра» и «сыр 2 кг», «2 яйца», «яйца 10 шт», «сыр 2 кг 3000 ₸», «рис одна пачка»; число в конце без единицы («Йогурт 3») остаётся в названии.
export function parseBulkPart(raw: string, markers: ReadonlySet<string> = priceMarkers()): BulkItem {
  const cleaned = raw.replace(BULLET, '').replace(NUMBERING, '').trim();
  const all = cleaned.split(/\s+/).filter(Boolean);
  const asName = (t: string[]): BulkItem => ({ title: t.join(' '), qty: null, unit: null });
  if (all.length === 0) return asName([]);

  const { rest: beforePrice, price } = extractPrice(all, markers);
  // «сыр 2 кг за 3000 ₸»: «за» перед ценой — связка, не часть названия
  const rest = price !== undefined && beforePrice.length > 1 && beforePrice[beforePrice.length - 1].toLowerCase() === 'за' ? beforePrice.slice(0, -1) : beforePrice;
  if (price !== undefined && rest.length === 0) return asName(all); // «450 ₸» без названия — это название
  const tokens = rest;
  const withPrice = (item: BulkItem): BulkItem => (price === undefined ? item : { ...item, price });

  if (tokens.length >= 2) {
    const unit = UNIT_WORDS[tokens[1].toLowerCase()];
    const qty = NUMBER.test(tokens[0]) ? toNumber(tokens[0]) : unit ? numberWord(tokens[0]) : null;
    if (qty !== null) {
      if (unit && tokens.length >= 3) return withPrice({ title: tokens.slice(2).join(' '), qty, unit });
      if (!unit && qty > 0) return withPrice({ title: tokens.slice(1).join(' '), qty, unit: null });
    }
  }
  if (tokens.length >= 3) {
    const unit = UNIT_WORDS[tokens[tokens.length - 1].toLowerCase()];
    const numToken = tokens[tokens.length - 2];
    const qty = NUMBER.test(numToken) ? toNumber(numToken) : unit ? numberWord(numToken) : null;
    if (unit && qty !== null) return withPrice({ title: tokens.slice(0, -2).join(' '), qty, unit });
  }
  return withPrice(asName(tokens));
}

export function parseBulk(text: string, markers: ReadonlySet<string> = priceMarkers()): BulkItem[] {
  return splitBulk(text)
    .map((part) => parseBulkPart(part, markers))
    .filter((i) => i.title.length > 0);
}

// Нужно ли разбирать как несколько товаров или как один с количеством или ценой (а не обычный ввод названия).
export function isStructured(items: readonly BulkItem[]): boolean {
  return items.length > 1 || (items.length === 1 && (items[0].qty !== null || items[0].unit !== null || items[0].price !== undefined));
}

// Для предпросмотра «Добавится N товаров»: разобранные товары, если ввод — список или товар с количеством/ценой; иначе пусто.
export function bulkPreview(text: string, markers: ReadonlySet<string> = priceMarkers()): BulkItem[] {
  const items = parseBulk(text, markers);
  return isStructured(items) ? items : [];
}
