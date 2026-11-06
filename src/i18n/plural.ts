export type PluralForms = readonly [one: string, few: string, many: string];

export type Lang = 'ru' | 'kk' | 'en';

// ru: 1 день, 2 дня, 5 дней (11–14 — всегда «дней»). en: 1 day, 2 days. kk: форма одна.
export function pluralIndex(n: number, lang: Lang = 'ru'): 0 | 1 | 2 {
  const abs = Math.abs(Math.trunc(n));
  if (lang === 'kk') return 0;
  if (lang === 'en') return abs === 1 ? 0 : 1;
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return 0;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 1;
  return 2;
}

export function plural(n: number, forms: PluralForms, lang: Lang = 'ru'): string {
  return forms[pluralIndex(n, lang)];
}
