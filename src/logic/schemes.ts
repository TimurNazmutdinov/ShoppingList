import themes from '@/theme/themes.json';
import aliases from '@/theme/iconAliases.json';
import { Scheme, SchemeKey, SchemeSetting, brandSchemes, isSchemeKey, isSchemeSetting, schemeDefs, themeDefaults } from '@/theme';

// Профили для «Как в системе»: какой включается при светлой и какой при тёмной теме телефона.
export type SystemPicks = { light: SchemeKey; dark: SchemeKey };
export const DEFAULT_PICKS: SystemPicks = { light: themeDefaults.lightScheme, dark: themeDefaults.darkScheme };

// Профиль подходит для темы телефона, только если его режим совпадает (светлый — для светлой).
export function isPickFor(mode: Scheme, key: unknown): key is SchemeKey {
  return isSchemeKey(key) && schemeDefs[key].mode === mode;
}

// Неизвестное или не того режима значение → профиль по умолчанию.
export function cleanPicks(light: unknown, dark: unknown): SystemPicks {
  return { light: isPickFor('light', light) ? light : DEFAULT_PICKS.light, dark: isPickFor('dark', dark) ? dark : DEFAULT_PICKS.dark };
}

// Активный профиль: выбранный вручную или, при «Как в системе», по теме телефона (нет данных → тёмная).
export function activeSchemeKey(setting: SchemeSetting, system: string | null | undefined, picks: SystemPicks = DEFAULT_PICKS): SchemeKey {
  if (setting !== 'system') return setting;
  return system === 'light' ? picks.light : picks.dark;
}

// Профиль логотипа и заставки — всегда фирменный: «Янтарь» (светлый) или «Какао» (тёмный). Не зависит от выбранного профиля.
export const logoSchemeKey = (active: SchemeKey): SchemeKey => (schemeDefs[active].mode === 'dark' ? brandSchemes.darkScheme : brandSchemes.lightScheme);
export const splashSchemeKey = (system: string | null | undefined): SchemeKey => (system === 'light' ? brandSchemes.lightScheme : brandSchemes.darkScheme);

// ---- Значок на рабочем столе: всегда основной (фирменный «Янтарь») ----
export const DEFAULT_ICON = 'default';
// Алиасы манифеста: основной + цвета 0.7.5 + профили 0.7.4. Все, кроме основного, выключены — ярлык не пропадает.
export const ALL_ICON_KEYS: readonly string[] = [DEFAULT_ICON, ...aliases.accents, ...Object.keys(aliases.legacy)];

// ---- Переход с 0.7.5 («Тема» + «Цвет») ----
type Table = { light: Record<string, string>; dark: Record<string, string> };
const TABLE = themes.migrationFrom075 as unknown as Table;
const hasOwn = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

export type SchemeChoice = { setting: SchemeSetting; picks: SystemPicks };

// Тема 0.7.5 (светлая / тёмная / как в системе) и цвет → профиль или «Как в системе» со своими дневным и ночным профилем. Неизвестное → null.
export function schemeFrom075(themeMode: unknown, accent: unknown): SchemeChoice | null {
  if (typeof accent !== 'string' || !hasOwn(TABLE.light, accent)) return null;
  const light = TABLE.light[accent] as SchemeKey;
  const dark = TABLE.dark[accent] as SchemeKey;
  if (themeMode === 'light') return { setting: light, picks: { light, dark: DEFAULT_PICKS.dark } };
  if (themeMode === 'dark') return { setting: dark, picks: { light: DEFAULT_PICKS.light, dark } };
  if (themeMode === 'system') return { setting: 'system', picks: { light, dark } };
  return null;
}

// Что лежит в настройках → выбор профиля. Значения 0.7.4 (scheme, systemLight, systemDark) 0.7.5 не стирала: если они есть — берём их;
// иначе, если есть выбор 0.7.5 (themeMode + accent), переводим по таблице; иначе — по умолчанию.
export function schemeChoiceFromSettings(raw: { scheme?: unknown; systemLight?: unknown; systemDark?: unknown; themeMode?: unknown; accent?: unknown }): SchemeChoice & { migrated: boolean } {
  if (isSchemeSetting(raw.scheme)) return { setting: raw.scheme, picks: cleanPicks(raw.systemLight, raw.systemDark), migrated: false };
  const from075 = schemeFrom075(raw.themeMode, raw.accent);
  if (from075) return { ...from075, migrated: true };
  return { setting: themeDefaults.schemeSetting, picks: DEFAULT_PICKS, migrated: false };
}
