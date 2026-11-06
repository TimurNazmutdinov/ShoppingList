import {
  Dictionary,
  Lang,
  dictionaries,
  languages,
  resolveLanguage,
  setLanguage,
  tn,
  word,
} from '@/i18n';
import { plural, pluralIndex } from '@/i18n/plural';
import { formatDayTitle, formatLong } from '@/logic/dates';
import { darkColors, lightColors, listColorKeys, listPalettes } from '@/theme';

afterEach(() => setLanguage('ru'));

function flatten(d: Dictionary): string[] {
  return [
    ...Object.values(d.strings),
    ...Object.values(d.plurals).flat(),
    ...Object.values(d.lists).flat(),
  ];
}

describe('словари', () => {
  it.each(languages)('%s: те же ключи, что в ru, без пустых строк', (lang) => {
    const d = dictionaries[lang];
    expect(Object.keys(d.strings).sort()).toEqual(Object.keys(dictionaries.ru.strings).sort());
    expect(Object.keys(d.plurals).sort()).toEqual(Object.keys(dictionaries.ru.plurals).sort());
    expect(Object.keys(d.lists).sort()).toEqual(Object.keys(dictionaries.ru.lists).sort());
    for (const text of flatten(d)) expect(text.trim()).not.toBe('');
  });

  it.each(languages)('%s: списки месяцев и дней нужной длины', (lang) => {
    const { lists } = dictionaries[lang];
    expect(lists.months).toHaveLength(12);
    expect(lists.monthsGenitive).toHaveLength(12);
    expect(lists.monthsShort).toHaveLength(12);
    expect(lists.weekdays).toHaveLength(7);
    expect(lists.weekdaysShort).toHaveLength(7);
  });

  it.each(languages)('%s: плейсхолдеры совпадают с ru', (lang) => {
    const names = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const [key, text] of Object.entries(dictionaries[lang].strings)) {
      expect(names(text)).toBe(names((dictionaries.ru.strings as Record<string, string>)[key]));
    }
  });
});

describe('склонения по языкам', () => {
  it('ru: 3 формы', () => {
    expect([1, 2, 5, 11, 21].map((n) => tn('unit.day', n))).toEqual(['1 день', '2 дня', '5 дней', '11 дней', '21 день']);
  });

  it('en: 2 формы', () => {
    setLanguage('en');
    expect([0, 1, 2, 5, 21].map((n) => tn('unit.day', n))).toEqual(['0 days', '1 day', '2 days', '5 days', '21 days']);
    expect(word('unit.item', 1)).toBe('item');
  });

  it('kk: слово не меняется', () => {
    setLanguage('kk');
    expect([1, 2, 5, 11].map((n) => tn('unit.day', n))).toEqual(['1 күн', '2 күн', '5 күн', '11 күн']);
    expect(tn('unit.item', 5)).toBe('5 тауар');
  });

  it('pluralIndex по языкам', () => {
    expect(pluralIndex(3, 'ru')).toBe(1);
    expect(pluralIndex(3, 'en')).toBe(1);
    expect(pluralIndex(3, 'kk')).toBe(0);
    expect(plural(1, ['a', 'b', 'c'], 'en')).toBe('a');
  });
});

describe('даты по языкам', () => {
  const cases: [Lang, string, string][] = [
    ['ru', '16 ноября 2026', 'Понедельник, 16 ноября'],
    ['kk', '16 қараша 2026', 'Дүйсенбі, 16 қараша'],
    ['en', 'November 16, 2026', 'Monday, November 16'],
  ];
  it.each(cases)('%s', (lang, long, title) => {
    setLanguage(lang);
    expect(formatLong('2026-11-16')).toBe(long);
    expect(formatDayTitle('2026-11-16')).toBe(title);
  });

  it.each(languages)('%s: конец года', (lang) => {
    setLanguage(lang);
    const { monthsGenitive } = dictionaries[lang].lists;
    expect(formatLong('2026-12-31')).toContain(monthsGenitive[11]);
    expect(formatLong('2026-12-31')).toContain('2026');
    expect(formatLong('2027-01-01')).toContain(monthsGenitive[0]);
  });
});

describe('выбор языка', () => {
  it('явный выбор главнее языка телефона', () => {
    expect(resolveLanguage('kk', 'en')).toBe('kk');
  });
  it('system: язык телефона из трёх', () => {
    expect(resolveLanguage('system', 'en')).toBe('en');
    expect(resolveLanguage('system', 'kk')).toBe('kk');
  });
  it('system + неизвестная локаль → ru', () => {
    expect(resolveLanguage('system', 'de')).toBe('ru');
    expect(resolveLanguage('system', null)).toBe('ru');
    expect(resolveLanguage('system', undefined)).toBe('ru');
  });
});

describe('палитры', () => {
  it('одинаковые ключи в светлой и тёмной', () => {
    expect(Object.keys(lightColors).sort()).toEqual(Object.keys(darkColors).sort());
  });
  it('цвета списков есть в обеих темах', () => {
    for (const scheme of ['light', 'dark'] as const) {
      expect(Object.keys(listPalettes[scheme]).sort()).toEqual([...listColorKeys].sort());
    }
  });
});
