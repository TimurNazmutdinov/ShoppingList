import themes from '@/theme/themes.json';
import { AccentKey, ApplyScope, Scheme, ThemeMode, accentKeys, brandAccent, isAccentKey, isThemeMode, themeDefaults } from '@/theme';

// Режим, в котором рисуется приложение: выбранный вручную или, при «Как в системе», по теме телефона (нет данных → тёмный).
export function resolveMode(mode: ThemeMode, system: string | null | undefined): Scheme {
  if (mode !== 'system') return mode;
  return system === 'light' ? 'light' : 'dark';
}

// ---- Миграция со старых профилей (до 0.7.5: 14 цветных фонов + «Как в системе») ----
// Таблица — themes.json → migration: старый ключ → [тема, цвет].
const MIGRATION = themes.migration as unknown as Record<string, unknown>;
const hasOwn = (o: object, key: string) => Object.prototype.hasOwnProperty.call(o, key);
const isOldKey = (v: unknown): v is string => typeof v === 'string' && v !== 'note' && hasOwn(MIGRATION, v);

// Ключи старых профилей (без «system»).
export const LEGACY_SCHEME_KEYS: readonly string[] = Object.keys(MIGRATION).filter((k) => k !== 'note' && k !== 'system');

const pairOf = (key: string) => MIGRATION[key] as readonly [ThemeMode, AccentKey];

// Цвет, в который перешёл старый профиль (null — не старый ключ).
export function legacyAccent(key: unknown): AccentKey | null {
  return isOldKey(key) && key !== 'system' ? pairOf(key)[1] : null;
}

// Старый выбор профиля → тема и цвет. «Как в системе» из 0.7.4 со своим светлым профилем берёт цвет от него.
export function migrateScheme(old: unknown, systemLight?: unknown): { themeMode: ThemeMode; accent: AccentKey } | null {
  if (!isOldKey(old)) return null;
  const [themeMode, accent] = pairOf(old);
  if (old === 'system') return { themeMode, accent: legacyAccent(systemLight) ?? accent };
  return { themeMode, accent };
}

export type ThemeChoice = { themeMode: ThemeMode; accent: AccentKey };

// Что лежит в настройках → выбор темы и цвета. Новые ключи главнее; иначе переводим старый профиль (migrated: надо сохранить); иначе умолчания.
export function themeChoiceFromSettings(raw: { themeMode?: unknown; accent?: unknown; scheme?: unknown; systemLight?: unknown }): ThemeChoice & { migrated: boolean } {
  const old = migrateScheme(raw.scheme, raw.systemLight);
  const hasNew = isThemeMode(raw.themeMode) && isAccentKey(raw.accent);
  return {
    themeMode: isThemeMode(raw.themeMode) ? raw.themeMode : (old?.themeMode ?? themeDefaults.themeMode),
    accent: isAccentKey(raw.accent) ? raw.accent : (old?.accent ?? themeDefaults.accent),
    migrated: !hasNew && old !== null,
  };
}

// ---- Логотип, заставка, иконка ----
// «Только к экранам» — фирменный знак (Янтарь); «Ко всему» — знак цветом акцента.
export const logoAccent = (scope: ApplyScope, accent: AccentKey): AccentKey => (scope === 'all' ? accent : brandAccent);
export const splashAccent = logoAccent;

export const DEFAULT_ICON = 'default'; // основная иконка (фирменный «Янтарь»)

// Иконки «Ко всему»: основная + по одной на остальные акценты.
export const ACCENT_ICON_KEYS: readonly string[] = accentKeys.filter((k) => k !== brandAccent);
// Иконки до 0.7.5: их записи остаются в манифесте (выключенными), иначе у тех, у кого была включена такая иконка, пропал бы ярлык.
export const LEGACY_ICON_KEYS: readonly string[] = LEGACY_SCHEME_KEYS.filter((k) => k !== 'vanilla' && !ACCENT_ICON_KEYS.includes(k));
export const ALL_ICON_KEYS: readonly string[] = [DEFAULT_ICON, ...ACCENT_ICON_KEYS, ...LEGACY_ICON_KEYS];

// Сохранённый ключ иконки → ключ новой иконки: «default» и акценты остаются, старые ключи переводятся по таблице, неизвестное → «default».
export function migrateIconKey(key: unknown): string {
  if (key === DEFAULT_ICON) return DEFAULT_ICON;
  const accent = isAccentKey(key) ? key : legacyAccent(key);
  if (!accent || accent === brandAccent) return DEFAULT_ICON;
  return accent;
}

// Иконка рабочего стола: «Ко всему» → иконка акцента (фирменный «Янтарь» = основная); «Только к экранам» → основная.
export function launcherIconKey(scope: ApplyScope, accent: AccentKey): string {
  if (scope !== 'all') return DEFAULT_ICON;
  return accent === brandAccent ? DEFAULT_ICON : accent;
}

// Что делать с иконкой после смены настроек: target — какая должна стоять, ask — нужен ли диалог.
// Возврат к основной иконке и отказ от смены — без вопросов.
export function iconChange(scope: ApplyScope, accent: AccentKey, confirmed: string, declined: boolean): { target: string; ask: boolean } {
  const desired = launcherIconKey(scope, accent);
  if (desired === confirmed) return { target: desired, ask: false };
  if (desired === DEFAULT_ICON) return { target: DEFAULT_ICON, ask: false };
  if (declined) return { target: confirmed, ask: false };
  return { target: desired, ask: true };
}
