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
