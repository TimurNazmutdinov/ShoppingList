import { createContext, useContext } from 'react';
import themes from './themes.json';

// Единственный источник цветов — themes.json (схемы, знак, цвета целей).
export type Scheme = 'light' | 'dark';
export type SchemeKey = keyof typeof themes.schemes;

export type LocalizedName = { ru: string; kk: string; en: string };
export type MarkColors = { from: string; to: string };
export type SchemeTokens = (typeof themes.schemes)['white']['tokens'];

export type SchemeDef = {
  key: SchemeKey;
  mode: Scheme;
  name: LocalizedName;
  tokens: SchemeTokens;
  mark: MarkColors;
  iconBackground: string;
};

export const schemeDefs: Record<SchemeKey, SchemeDef> = Object.fromEntries(
  Object.entries(themes.schemes).map(([key, v]) => [key, { key, mode: v.mode, name: v.name, tokens: v.tokens, mark: v.mark, iconBackground: v.iconBackground }]),
) as Record<SchemeKey, SchemeDef>;

export const lightSchemeKeys = (Object.keys(schemeDefs) as SchemeKey[]).filter((k) => schemeDefs[k].mode === 'light');
export const darkSchemeKeys = (Object.keys(schemeDefs) as SchemeKey[]).filter((k) => schemeDefs[k].mode === 'dark');

// Цветовой профиль: «Как в системе» (светлый/тёмный по телефону) или конкретная схема.
// Профиль задаёт экраны, логотип и заставку сразу.
export type SchemeSetting = 'system' | SchemeKey;

export const brandSchemes = themes.brand as { lightScheme: SchemeKey; darkScheme: SchemeKey; nativeSplash: Record<Scheme, string> };
export const nativeSplashColors = brandSchemes.nativeSplash;

export const themeDefaults = themes.defaults as {
  schemeSetting: SchemeSetting;
  lightScheme: SchemeKey; // для «Как в системе» при светлой теме телефона
  darkScheme: SchemeKey; // для «Как в системе» при тёмной теме телефона
};

export function isSchemeKey(value: unknown): value is SchemeKey {
  return typeof value === 'string' && value in schemeDefs;
}

export function isSchemeSetting(value: unknown): value is SchemeSetting {
  return value === 'system' || isSchemeKey(value);
}

export type Palette = {
  scheme: Scheme; // режим активной схемы (светлая / тёмная)
  schemeKey: SchemeKey;
  bg: string;
  card: string;
  cardBorder: string;
  cardStrong: string;
  track: string; // дорожка прогресса
  text: string;
  textMuted: string;
  primary: string; // «+», флажок, переключатель, полосы прогресса
  onPrimary: string;
  primaryStrong: string; // акцентный текст: активная вкладка, заголовки разделов, ссылки, рамка выбранного
  tonal: string; // большие кнопки: подложка (у тёмных профилей = primary)
  onTonal: string; // большие кнопки: текст
  warn: string;
  onWarn: string;
  reward: string;
  onReward: string;
  trophy: string; // кубок и флаг приоритета на карточке
  border: string;
  outline: string; // рамки полей и пунктир: контраст ≥ 3:1 на фоне
  backdrop: string;
  switchOn: string; // дорожка включённого переключателя
  switchOnThumb: string; // бегунок включённого (контраст к дорожке ≥ 3:1)
  switchOffThumb: string; // бегунок выключенного; контур дорожки — outline
};

// Токены схемы + производные: они зависят только от режима и токенов схемы.
export function buildPalette(key: SchemeKey): Palette {
  const { mode, tokens: t } = schemeDefs[key];
  const dark = mode === 'dark';
  return {
    scheme: mode,
    schemeKey: key,
    ...t,
    // Текст на «warn»-плашке: тёмный или белый — что контрастнее на этой схеме.
    onWarn: dark ? '#412402' : '#FFFFFF',
    reward: themes.rewardBadge.bg,
    onReward: themes.rewardBadge.text,
    trophy: dark ? '#FAC775' : '#BA7517',
    border: t.cardBorder,
    backdrop: dark ? 'rgba(10, 8, 30, 0.7)' : 'rgba(27, 23, 64, 0.45)',
    switchOn: t.primaryStrong,
    switchOnThumb: dark ? t.bg : '#FFFFFF',
    switchOffThumb: t.outline,
  };
}

export const darkColors: Palette = buildPalette(themeDefaults.darkScheme);
export const lightColors: Palette = buildPalette(themeDefaults.lightScheme);

const ThemeContext = createContext<Palette>(darkColors);

export const ThemeProvider = ThemeContext.Provider;

// Активная палитра. Вне провайдера (экран ошибки) — тёмная.
export function useTheme(): Palette {
  return useContext(ThemeContext);
}

// Цвет списка и категории хранится в БД как ключ. Значение зависит от режима схемы.
export type ListColorKey = (typeof themes.goalColors)[number]['key'];

export const listColorDefs = themes.goalColors as readonly { key: ListColorKey; name: LocalizedName; light: string; dark: string }[];
export const listColorKeys: readonly ListColorKey[] = listColorDefs.map((c) => c.key);

export const listPalettes: Record<Scheme, Record<ListColorKey, string>> = {
  light: Object.fromEntries(listColorDefs.map((c) => [c.key, c.light])) as Record<ListColorKey, string>,
  dark: Object.fromEntries(listColorDefs.map((c) => [c.key, c.dark])) as Record<ListColorKey, string>,
};

export const DEFAULT_LIST_COLOR: ListColorKey = 'green';

export function isListColorKey(key: string): key is ListColorKey {
  return (listColorKeys as readonly string[]).includes(key);
}

// Ключ → цвет режима. Неизвестный ключ → цвет по умолчанию.
export function listColor(key: string, scheme: Scheme): string {
  return listPalettes[scheme][isListColorKey(key) ? key : DEFAULT_LIST_COLOR];
}

export const radius = {
  card: 12,
  button: 12,
  checkbox: 5,
};
