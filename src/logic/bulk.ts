// Массовое добавление: «молоко, хлеб, 2 кг сыра» или список из мессенджера (по строке на товар) → товары с количеством.

export type BulkItem = { title: string; qty: number | null; unit: string | null };

// Слова единиц на трёх языках → ключ единицы.
const UNIT_WORDS: Record<string, string> = {
  шт: 'pcs', штук: 'pcs', штуки: 'pcs', штука: 'pcs', дана: 'pcs', pcs: 'pcs', pc: 'pcs',
  кг: 'kg', килограмм: 'kg', килограмма: 'kg', kg: 'kg',
  г: 'g', гр: 'g', грамм: 'g', грамма: 'g', граммов: 'g', g: 'g',
  л: 'l', литр: 'l', литра: 'l', литров: 'l', l: 'l',
  уп: 'pack', упаковка: 'pack', упаковки: 'pack', пачка: 'pack', пачки: 'pack', қап: 'pack', pack: 'pack',
};

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

// Одна часть → название, количество, единица.
// «2 кг сыра» и «сыр 2 кг», «2 яйца», «яйца 10 шт»; число в конце без единицы («Йогурт 3») остаётся в названии.
export function parseBulkPart(raw: string): BulkItem {
  const cleaned = raw.replace(BULLET, '').replace(NUMBERING, '').trim();
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const asName = (t: string[]): BulkItem => ({ title: t.join(' '), qty: null, unit: null });
  if (tokens.length === 0) return asName([]);

  if (tokens.length >= 2 && NUMBER.test(tokens[0])) {
    const qty = toNumber(tokens[0]);
    const unit = UNIT_WORDS[tokens[1].toLowerCase()];
    if (unit && tokens.length >= 3) return { title: tokens.slice(2).join(' '), qty, unit };
    if (!unit && qty > 0) return { title: tokens.slice(1).join(' '), qty, unit: null };
  }
  if (tokens.length >= 3) {
    const unit = UNIT_WORDS[tokens[tokens.length - 1].toLowerCase()];
    const numToken = tokens[tokens.length - 2];
    if (unit && NUMBER.test(numToken)) return { title: tokens.slice(0, -2).join(' '), qty: toNumber(numToken), unit };
  }
  return asName(tokens);
}

export function parseBulk(text: string): BulkItem[] {
  return splitBulk(text)
    .map(parseBulkPart)
    .filter((i) => i.title.length > 0);
}

// Нужно ли разбирать как несколько товаров или как один с количеством (а не обычный ввод названия).
export function isStructured(items: readonly BulkItem[]): boolean {
  return items.length > 1 || (items.length === 1 && (items[0].qty !== null || items[0].unit !== null));
}
