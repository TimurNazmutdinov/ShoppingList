import { createContext, useContext } from 'react';
import { contrastRatio } from '@/logic/color';
import themes from './themes.json';

// Единственный источник цветов — themes.json: режим (фон и текст), акцент (цвет) и цвета списков.
export type Scheme = 'light' | 'dark'; // режим, в котором рисуется приложение
export type ThemeMode = Scheme | 'system'; // выбор пользователя: «Как в системе» — режим по теме телефона
export type AccentKey = keyof typeof themes.accents;
// Куда применять цвет: только к экранам (логотип и заставка фирменные) или ко всему (и логотип, и заставка, и иконка).
export type ApplyScope = 'screens' | 'all';

export type LocalizedName = { ru: string; kk: string; en: string };
export type MarkColors = { from: string; to: string };

export const accentKeys = Object.keys(themes.accents) as AccentKey[];
export const accentNames = Object.fromEntries(accentKeys.map((k) => [k, themes.accents[k].name])) as Record<AccentKey, LocalizedName>;

export const themeDefaults = themes.defaults as { themeMode: ThemeMode; accent: AccentKey; applyScope: ApplyScope };
export const brandAccent = themes.brandAccent as AccentKey; // фирменный цвет ShoppingList («Янтарь»)
export const nativeSplashColors = themes.nativeSplash as Record<Scheme, string>;

export function isAccentKey(value: unknown): value is AccentKey {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(themes.accents, value);
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function isApplyScope(value: unknown): value is ApplyScope {
  return value === 'screens' || value === 'all';
}

// Цвета акцента в режиме: accent (сплошной), onAccent (значок на нём), tonal / onTonal (мягкая кнопка), mark (градиент знака).
export const accentColors = (accent: AccentKey, mode: Scheme) => themes.accents[accent][mode];
export const accentMark = (accent: AccentKey, mode: Scheme): MarkColors => themes.accents[accent][mode].mark;
export const modeTokens = (mode: Scheme) => themes.modes[mode];

export type Palette = {
  scheme: Scheme; // режим (светлый / тёмный)
  accent: AccentKey;
  bg: string;
  card: string;
  cardBorder: string;
  cardStrong: string;
  track: string; // дорожка прогресса
  text: string;
  textMuted: string;
  primary: string; // сплошной акцент: «+», флажок, переключатель, полосы прогресса
  onPrimary: string; // значок на нём
  primaryStrong: string; // акцентный текст (onTonal): активная вкладка, заголовки разделов, ссылки, рамка выбранного
  tonal: string; // мягкая кнопка: подложка
  onTonal: string; // мягкая кнопка: текст
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

// Токены режима + акцента + производные: они зависят только от режима и акцента.
export function buildPalette(mode: Scheme, accent: AccentKey): Palette {
  const m = themes.modes[mode];
  const a = themes.accents[accent][mode];
  const dark = mode === 'dark';
  // Дорожка включённого переключателя — акцент; если он на карточке слабее 3:1 (светлый «Янтарь»), берём тёмный акцентный текст.
  const track = contrastRatio(a.accent, m.card) >= 3 ? a.accent : a.onTonal;
  return {
    scheme: mode,
    accent,
    bg: m.bg,
    card: m.card,
    cardBorder: m.cardBorder,
    cardStrong: m.cardStrong,
    track: m.track,
    text: m.text,
    textMuted: m.textMuted,
    outline: m.outline,
    warn: m.warn,
    primary: a.accent,
    onPrimary: a.onAccent,
    primaryStrong: a.onTonal,
    tonal: a.tonal,
    onTonal: a.onTonal,
    // Текст на «warn»-плашке: тёмный или белый — что контрастнее на этом режиме.
    onWarn: dark ? '#412402' : '#FFFFFF',
    reward: themes.rewardBadge.bg,
    onReward: themes.rewardBadge.text,
    trophy: dark ? '#FAC775' : '#BA7517',
    border: m.cardBorder,
    backdrop: dark ? 'rgba(10, 8, 30, 0.7)' : 'rgba(27, 23, 64, 0.45)',
    switchOn: track,
    switchOnThumb: track === a.accent ? a.onAccent : m.card,
    switchOffThumb: m.outline,
  };
}

export const darkColors: Palette = buildPalette('dark', themeDefaults.accent);
export const lightColors: Palette = buildPalette('light', themeDefaults.accent);

const ThemeContext = createContext<Palette>(darkColors);

export const ThemeProvider = ThemeContext.Provider;

// Активная палитра. Вне провайдера (экран ошибки) — тёмная.
export function useTheme(): Palette {
  return useContext(ThemeContext);
}

// Цвет списка и категории хранится в БД как ключ. Значение зависит от режима.
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
