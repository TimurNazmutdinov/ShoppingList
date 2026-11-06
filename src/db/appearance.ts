import { getSetting, setSetting } from './index';
import { LanguageSetting, isLanguageSetting } from '@/i18n';
import { ApplyScope, SchemeSetting, isApplyScope, isSchemeSetting, themeDefaults } from '@/theme';

export type Appearance = {
  scheme: SchemeSetting; // цветовой профиль: «Как в системе» или конкретная схема
  applyScope: ApplyScope; // куда применять цвета профиля: только экраны или и логотип с заставкой
  language: LanguageSetting;
  rememberItems: boolean; // запоминать параметры товаров (мини-самообучение)
};

// Неизвестное или отсутствующее значение → значение по умолчанию.
export async function loadAppearance(): Promise<Appearance> {
  const scheme = await getSetting<unknown>('scheme');
  const scope = await getSetting<unknown>('applyScope');
  const language = await getSetting<unknown>('language');
  const remember = await getSetting<unknown>('rememberItems');
  return {
    scheme: isSchemeSetting(scheme) ? scheme : themeDefaults.schemeSetting,
    applyScope: isApplyScope(scope) ? scope : themeDefaults.applyScope,
    language: isLanguageSetting(language) ? language : 'system',
    rememberItems: remember !== false,
  };
}

export const saveScheme = (scheme: SchemeSetting) => setSetting('scheme', scheme);
export const saveApplyScope = (scope: ApplyScope) => setSetting('applyScope', scope);
export const saveLanguage = (language: LanguageSetting) => setSetting('language', language);
export const saveRememberItems = (value: boolean) => setSetting('rememberItems', value);
