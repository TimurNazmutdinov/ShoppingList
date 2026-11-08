import { ApplyScope, Scheme, SchemeKey, SchemeSetting, isSchemeKey, schemeDefs, themeDefaults } from '@/theme';

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

// Профиль для логотипа: «Ко всему» — активный профиль; «Только к экранам» — фирменный «Янтарь» (светлый или тёмный вариант).
export function logoSchemeKey(scope: ApplyScope, active: SchemeKey): SchemeKey {
  if (scope === 'all') return active;
  return schemeDefs[active].mode === 'dark' ? themeDefaults.darkScheme : themeDefaults.lightScheme;
}

// Профиль для заставки: «Ко всему» — активный; «Только к экранам» — фирменный «Янтарь» по теме телефона.
export function splashSchemeKey(scope: ApplyScope, setting: SchemeSetting, system: string | null | undefined, picks: SystemPicks = DEFAULT_PICKS): SchemeKey {
  if (scope === 'all') return activeSchemeKey(setting, system, picks);
  return system === 'light' ? themeDefaults.lightScheme : themeDefaults.darkScheme;
}

export const DEFAULT_ICON = 'default';

// Иконка рабочего стола: «Ко всему» → профиль (фирменный «Янтарь» = основная иконка);
// «Как в системе» берёт выбранный светлый профиль: иконка не следует за темой телефона; «Только к экранам» → основная.
export function launcherIconKey(scope: ApplyScope, setting: SchemeSetting, picks: SystemPicks = DEFAULT_PICKS): string {
  if (scope !== 'all') return DEFAULT_ICON;
  const key = setting === 'system' ? picks.light : setting;
  return key === themeDefaults.lightScheme ? DEFAULT_ICON : key;
}

// Что делать с иконкой после смены настроек: target — какая должна стоять, ask — нужен ли диалог.
// Возврат к основной иконке и отказ от смены — без вопросов.
export function iconChange(
  scope: ApplyScope,
  setting: SchemeSetting,
  confirmed: string,
  declined: boolean,
  picks: SystemPicks = DEFAULT_PICKS,
): { target: string; ask: boolean } {
  const desired = launcherIconKey(scope, setting, picks);
  if (desired === confirmed) return { target: desired, ask: false };
  if (desired === DEFAULT_ICON) return { target: DEFAULT_ICON, ask: false };
  if (declined) return { target: confirmed, ask: false };
  return { target: desired, ask: true };
}
