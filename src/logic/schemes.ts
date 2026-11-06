import { SchemeKey, SchemeSetting, themeDefaults } from '@/theme';

// Активный профиль: выбранный вручную или, при «Как в системе», по теме телефона (нет данных → тёмная).
export function activeSchemeKey(setting: SchemeSetting, system: string | null | undefined): SchemeKey {
  if (setting !== 'system') return setting;
  return system === 'light' ? themeDefaults.lightScheme : themeDefaults.darkScheme;
}
