import { getSetting, setSetting } from './index';
import { LanguageSetting, isLanguageSetting } from '@/i18n';
import { CurrencySetting, DEFAULT_CURRENCY, isCurrencySetting } from '@/logic/money';
import { ApplyScope, SchemeSetting, isApplyScope, isSchemeKey, isSchemeSetting, themeDefaults } from '@/theme';

export type Appearance = {
  scheme: SchemeSetting; // цветовой профиль: «Как в системе» или конкретная схема
  applyScope: ApplyScope; // куда применять цвета профиля: только экраны или и логотип с заставкой
  launcherIcon: string; // подтверждённая иконка рабочего стола: 'default' или ключ профиля
  iconDeclined: boolean; // пользователь отказался менять иконку
  currency: CurrencySetting; // валюта цен
  language: LanguageSetting;
  rememberItems: boolean; // запоминать параметры товаров (мини-самообучение)
};

// Неизвестное или отсутствующее значение → значение по умолчанию.
export async function loadAppearance(): Promise<Appearance> {
  const scheme = await getSetting<unknown>('scheme');
  const scope = await getSetting<unknown>('applyScope');
  const icon = await getSetting<unknown>('launcherIcon');
  const declined = await getSetting<unknown>('iconDeclined');
  const currency = await getSetting<unknown>('currency');
  const language = await getSetting<unknown>('language');
  const remember = await getSetting<unknown>('rememberItems');
  return {
    scheme: isSchemeSetting(scheme) ? scheme : themeDefaults.schemeSetting,
    applyScope: isApplyScope(scope) ? scope : themeDefaults.applyScope,
    launcherIcon: icon === 'default' || (isSchemeKey(icon) && icon !== themeDefaults.lightScheme) ? icon : 'default',
    iconDeclined: declined === true,
    currency: isCurrencySetting(currency) ? currency : DEFAULT_CURRENCY,
    language: isLanguageSetting(language) ? language : 'system',
    rememberItems: remember !== false,
  };
}

export const saveScheme = (scheme: SchemeSetting) => setSetting('scheme', scheme);
export const saveApplyScope = (scope: ApplyScope) => setSetting('applyScope', scope);
export const saveLauncherIcon = (key: string) => setSetting('launcherIcon', key);
export const saveIconDeclined = (declined: boolean) => setSetting('iconDeclined', declined);
export const saveCurrency = (currency: CurrencySetting) => setSetting('currency', currency);
export const saveLanguage = (language: LanguageSetting) => setSetting('language', language);
export const saveRememberItems = (value: boolean) => setSetting('rememberItems', value);
