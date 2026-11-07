// Встроенный каталог типовых товаров: подсказки по первым буквам и категория по названию.
// Названия на трёх языках; казахские — на проверку носителем (docs/i18n-review.md).
import { Lang } from '@/i18n';
import { Category } from './categories';
import { HistoryRow, normTitle } from './history';

// [категория, ru, kk, en]
type Entry = readonly [string, string, string, string];

export const CATALOG: readonly Entry[] = [
  // овощи и фрукты
  ['veg', 'Картофель', 'Картоп', 'Potatoes'],
  ['veg', 'Лук', 'Пияз', 'Onions'],
  ['veg', 'Морковь', 'Сәбіз', 'Carrots'],
  ['veg', 'Огурцы', 'Қияр', 'Cucumbers'],
  ['veg', 'Помидоры', 'Қызанақ', 'Tomatoes'],
  ['veg', 'Капуста', 'Қырыққабат', 'Cabbage'],
  ['veg', 'Свёкла', 'Қызылша', 'Beetroot'],
  ['veg', 'Чеснок', 'Сарымсақ', 'Garlic'],
  ['veg', 'Перец болгарский', 'Тәтті бұрыш', 'Bell pepper'],
  ['veg', 'Баклажаны', 'Баялды', 'Eggplants'],
  ['veg', 'Тыква', 'Асқабақ', 'Pumpkin'],
  ['veg', 'Яблоки', 'Алма', 'Apples'],
  ['veg', 'Груши', 'Алмұрт', 'Pears'],
  ['veg', 'Бананы', 'Банан', 'Bananas'],
  ['veg', 'Апельсины', 'Апельсин', 'Oranges'],
  ['veg', 'Лимон', 'Лимон', 'Lemon'],
  ['veg', 'Виноград', 'Жүзім', 'Grapes'],
  ['veg', 'Арбуз', 'Қарбыз', 'Watermelon'],
  ['veg', 'Дыня', 'Қауын', 'Melon'],
  // молочное
  ['dairy', 'Молоко', 'Сүт', 'Milk'],
  ['dairy', 'Кефир', 'Кефир', 'Kefir'],
  ['dairy', 'Айран', 'Айран', 'Ayran'],
  ['dairy', 'Кумыс', 'Қымыз', 'Kumis'],
  ['dairy', 'Сметана', 'Қаймақ', 'Sour cream'],
  ['dairy', 'Творог', 'Сүзбе', 'Cottage cheese'],
  ['dairy', 'Сыр', 'Ірімшік', 'Cheese'],
  ['dairy', 'Йогурт', 'Йогурт', 'Yogurt'],
  ['dairy', 'Масло сливочное', 'Сары май', 'Butter'],
  ['dairy', 'Яйца', 'Жұмыртқа', 'Eggs'],
  // хлеб
  ['bread', 'Хлеб', 'Нан', 'Bread'],
  ['bread', 'Батон', 'Батон', 'Loaf'],
  ['bread', 'Лаваш', 'Лаваш', 'Lavash'],
  ['bread', 'Булочки', 'Тоқаш', 'Buns'],
  ['bread', 'Печенье', 'Печенье', 'Cookies'],
  // мясо и рыба
  ['meat', 'Курица', 'Тауық еті', 'Chicken'],
  ['meat', 'Говядина', 'Сиыр еті', 'Beef'],
  ['meat', 'Баранина', 'Қой еті', 'Lamb'],
  ['meat', 'Конина', 'Жылқы еті', 'Horse meat'],
  ['meat', 'Фарш', 'Тартылған ет', 'Minced meat'],
  ['meat', 'Колбаса', 'Шұжық', 'Sausage'],
  ['meat', 'Сосиски', 'Сосиска', 'Frankfurters'],
  ['meat', 'Казы', 'Қазы', 'Kazy'],
  ['meat', 'Рыба', 'Балық', 'Fish'],
  // бакалея
  ['grocery', 'Сахар', 'Қант', 'Sugar'],
  ['grocery', 'Соль', 'Тұз', 'Salt'],
  ['grocery', 'Мука', 'Ұн', 'Flour'],
  ['grocery', 'Рис', 'Күріш', 'Rice'],
  ['grocery', 'Гречка', 'Қарақұмық', 'Buckwheat'],
  ['grocery', 'Макароны', 'Макарон', 'Pasta'],
  ['grocery', 'Овсянка', 'Сұлы жармасы', 'Oatmeal'],
  ['grocery', 'Масло растительное', 'Өсімдік майы', 'Vegetable oil'],
  ['grocery', 'Горох', 'Бұршақ', 'Peas'],
  ['grocery', 'Мёд', 'Бал', 'Honey'],
  ['grocery', 'Варенье', 'Тосап', 'Jam'],
  ['grocery', 'Томатная паста', 'Қызанақ пастасы', 'Tomato paste'],
  ['grocery', 'Майонез', 'Майонез', 'Mayonnaise'],
  ['grocery', 'Кетчуп', 'Кетчуп', 'Ketchup'],
  ['grocery', 'Специи', 'Дәмдеуіштер', 'Spices'],
  ['grocery', 'Шоколад', 'Шоколад', 'Chocolate'],
  ['grocery', 'Конфеты', 'Кәмпит', 'Candy'],
  ['grocery', 'Орехи', 'Жаңғақ', 'Nuts'],
  ['grocery', 'Изюм', 'Мейіз', 'Raisins'],
  ['grocery', 'Дрожжи', 'Ашытқы', 'Yeast'],
  // напитки
  ['drinks', 'Чай', 'Шай', 'Tea'],
  ['drinks', 'Кофе', 'Кофе', 'Coffee'],
  ['drinks', 'Какао', 'Какао', 'Cocoa'],
  ['drinks', 'Вода', 'Су', 'Water'],
  ['drinks', 'Сок', 'Шырын', 'Juice'],
  ['drinks', 'Газировка', 'Газдалған сусын', 'Soda'],
  // бытовая химия и хозтовары
  ['household', 'Средство для мытья посуды', 'Ыдыс жуатын құрал', 'Dish soap'],
  ['household', 'Стиральный порошок', 'Кір жуу ұнтағы', 'Laundry detergent'],
  ['household', 'Средство для мытья полов', 'Еден жуатын құрал', 'Floor cleaner'],
  ['household', 'Средство для стёкол', 'Терезе тазалағыш', 'Glass cleaner'],
  ['household', 'Средство для сантехники', 'Сантехника тазалағыш', 'Toilet cleaner'],
  ['household', 'Отбеливатель', 'Ағартқыш', 'Bleach'],
  ['household', 'Губки для посуды', 'Ыдыс губкасы', 'Sponges'],
  ['household', 'Тряпки', 'Шүберек', 'Cleaning cloths'],
  ['household', 'Перчатки резиновые', 'Резеңке қолғап', 'Rubber gloves'],
  ['household', 'Мусорные пакеты', 'Қоқыс пакеттері', 'Trash bags'],
  ['household', 'Туалетная бумага', 'Дәретхана қағазы', 'Toilet paper'],
  ['household', 'Бумажные полотенца', 'Қағаз сүлгі', 'Paper towels'],
  ['household', 'Салфетки', 'Майлық', 'Napkins'],
  ['household', 'Спички', 'Сіріңке', 'Matches'],
  ['household', 'Свечи', 'Шам', 'Candles'],
  ['household', 'Батарейки', 'Батарея', 'Batteries'],
  ['household', 'Лампочки', 'Лампочка', 'Light bulbs'],
  ['household', 'Фольга', 'Фольга', 'Aluminium foil'],
  // другое: гигиена, питомцы
  ['other', 'Мыло', 'Сабын', 'Soap'],
  ['other', 'Шампунь', 'Шампунь', 'Shampoo'],
  ['other', 'Гель для душа', 'Душ гелі', 'Shower gel'],
  ['other', 'Зубная паста', 'Тіс пастасы', 'Toothpaste'],
  ['other', 'Зубная щётка', 'Тіс щеткасы', 'Toothbrush'],
  ['other', 'Дезодорант', 'Дезодорант', 'Deodorant'],
  ['other', 'Подгузники', 'Памперс', 'Diapers'],
  ['other', 'Корм для кошек', 'Мысық азығы', 'Cat food'],
  ['other', 'Корм для собак', 'Ит азығы', 'Dog food'],
];

const LANG_INDEX: Record<Lang, number> = { ru: 1, kk: 2, en: 3 };

const nameOf = (e: Entry, lang: Lang): string => e[LANG_INDEX[lang]];

const rowFor = (e: Entry, lang: Lang, categories: readonly Category[]): HistoryRow => {
  const name = nameOf(e, lang);
  return {
    titleNorm: normTitle(name),
    title: name,
    qty: null,
    unit: null,
    price: null,
    categoryId: categories.find((c) => c.key === e[0])?.id ?? null,
    usedCount: 0,
    lastUsedAt: '',
  };
};

// Подсказки из каталога по началу названия или любого слова в нём («масло» → «Масло сливочное»).
// Сначала совпадения с начала названия, потом по слову. Названия из exclude (уже есть в истории) пропускаются.
export function matchCatalog(query: string, lang: Lang, categories: readonly Category[], exclude: ReadonlySet<string> = new Set(), limit = 5): HistoryRow[] {
  const q = normTitle(query);
  if (!q) return [];
  const starts: HistoryRow[] = [];
  const words: HistoryRow[] = [];
  for (const e of CATALOG) {
    const norm = normTitle(nameOf(e, lang));
    if (exclude.has(norm)) continue;
    if (norm.startsWith(q)) starts.push(rowFor(e, lang, categories));
    else if (norm.split(' ').some((w) => w.startsWith(q))) words.push(rowFor(e, lang, categories));
  }
  return [...starts, ...words].slice(0, limit);
}

// Точное совпадение с названием из каталога: подставляем категорию.
export function findCatalog(title: string, lang: Lang, categories: readonly Category[]): HistoryRow | null {
  const q = normTitle(title);
  const e = CATALOG.find((x) => normTitle(nameOf(x, lang)) === q);
  return e ? rowFor(e, lang, categories) : null;
}

// Строка каталога по русскому названию (для блюд и примера списка): название на языке приложения и категория.
export function catalogRow(ruName: string, lang: Lang, categories: readonly Category[]): HistoryRow | null {
  const e = CATALOG.find((x) => x[1] === ruName);
  return e ? rowFor(e, lang, categories) : null;
}
