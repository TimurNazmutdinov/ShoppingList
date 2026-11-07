import { ApplyScope, SchemeKey, SchemeSetting, schemeDefs, themeDefaults } from '@/theme';

// Активный профиль: выбранный вручную или, при «Как в системе», по теме телефона (нет данных → тёмная).
export function activeSchemeKey(setting: SchemeSetting, system: string | null | undefined): SchemeKey {
  if (setting !== 'system') return setting;
  return system === 'light' ? themeDefaults.lightScheme : themeDefaults.darkScheme;
}

// Профиль для логотипа: «Ко всему» — активный профиль; «Только к экранам» — фирменный «Янтарь» (светлый или тёмный вариант).
export function logoSchemeKey(scope: ApplyScope, active: SchemeKey): SchemeKey {
  if (scope === 'all') return active;
  return schemeDefs[active].mode === 'dark' ? themeDefaults.darkScheme : themeDefaults.lightScheme;
}

// Профиль для заставки: «Ко всему» — активный; «Только к экранам» — фирменный «Янтарь» по теме телефона.
export function splashSchemeKey(scope: ApplyScope, setting: SchemeSetting, system: string | null | undefined): SchemeKey {
  if (scope === 'all') return activeSchemeKey(setting, system);
  return system === 'light' ? themeDefaults.lightScheme : themeDefaults.darkScheme;
}

export const DEFAULT_ICON = 'default';

// Иконка рабочего стола: «Ко всему» → профиль (фирменный «Янтарь» = основная иконка);
// «Как в системе» берёт светлый профиль: иконка не следует за темой телефона; «Только к экранам» → основная.
export function launcherIconKey(scope: ApplyScope, setting: SchemeSetting): string {
  if (scope !== 'all') return DEFAULT_ICON;
  const key = setting === 'system' ? themeDefaults.lightScheme : setting;
  return key === themeDefaults.lightScheme ? DEFAULT_ICON : key;
}

// Что делать с иконкой после смены настроек: target — какая должна стоять, ask — нужен ли диалог.
// Возврат к основной иконке и отказ от смены — без вопросов.
export function iconChange(scope: ApplyScope, setting: SchemeSetting, confirmed: string, declined: boolean): { target: string; ask: boolean } {
  const desired = launcherIconKey(scope, setting);
  if (desired === confirmed) return { target: desired, ask: false };
  if (desired === DEFAULT_ICON) return { target: DEFAULT_ICON, ask: false };
  if (declined) return { target: confirmed, ask: false };
  return { target: desired, ask: true };
}
