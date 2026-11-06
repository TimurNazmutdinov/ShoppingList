import { ru } from './ru';
import { kk } from './kk';
import { en } from './en';
import { Lang, PluralForms, plural } from './plural';

export { plural, pluralIndex } from './plural';
export type { Lang, PluralForms } from './plural';

export type StringKey = keyof typeof ru.strings;
export type PluralKey = keyof typeof ru.plurals;
export type ListKey = keyof typeof ru.lists;

// Тип словаря берётся из ru.ts: пропущенный ключ в kk/en — ошибка tsc.
export type Dictionary = {
  strings: Record<StringKey, string>;
  plurals: Record<PluralKey, PluralForms>;
  lists: Record<ListKey, readonly string[]>;
};

export type LanguageSetting = 'system' | Lang;

export const dictionaries: Record<Lang, Dictionary> = { ru, kk, en };

export const languages: readonly Lang[] = ['ru', 'kk', 'en'];

// Названия языков всегда на самих языках.
export const languageNames: Record<Lang, string> = { ru: 'Русский', kk: 'Қазақша', en: 'English' };

export const DEFAULT_LANG: Lang = 'ru';

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (languages as readonly string[]).includes(value);
}

export function isLanguageSetting(value: unknown): value is LanguageSetting {
  return value === 'system' || isLang(value);
}

// Настройка + язык телефона → язык приложения. Язык телефона не из трёх → русский.
export function resolveLanguage(setting: LanguageSetting, deviceCode: string | null | undefined): Lang {
  if (setting !== 'system') return setting;
  return isLang(deviceCode) ? deviceCode : DEFAULT_LANG;
}

let current: Lang = DEFAULT_LANG;

export function setLanguage(lang: Lang): void {
  current = lang;
}

export function getLanguage(): Lang {
  return current;
}

// t('goals.level', { n: 3 }) → «LVL 3». Плейсхолдеры — {name}.
export function t(key: StringKey, params?: Record<string, string | number>): string {
  const text: string = dictionaries[current].strings[key];
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

// tn('unit.day', 5) → «5 дней».
export function tn(key: PluralKey, n: number): string {
  return `${n} ${word(key, n)}`;
}

// Только слово без числа: word('unit.taskGen', 5) → «задач».
export function word(key: PluralKey, n: number): string {
  return plural(n, dictionaries[current].plurals[key], current);
}

export function tl(key: ListKey): readonly string[] {
  return dictionaries[current].lists[key];
}
