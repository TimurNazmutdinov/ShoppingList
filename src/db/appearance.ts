import { getSetting, setSetting } from './index';
import { LanguageSetting, isLanguageSetting } from '@/i18n';
import { CurrencySetting, DEFAULT_CURRENCY, isCurrencySetting } from '@/logic/money';
import { Scheme, SchemeSetting } from '@/theme';
import { SystemPicks, cleanPicks, schemeChoiceFromSettings } from '@/logic/schemes';

export type Appearance = {
  scheme: SchemeSetting; // цветовой профиль: «Как в системе» или конкретная схема
  systemPicks: SystemPicks; // профили «Как в системе»: при светлой и при тёмной теме телефона
  currency: CurrencySetting; // валюта цен
  language: LanguageSetting;
  rememberItems: boolean; // запоминать параметры товаров (мини-самообучение)
  showSplash: boolean; // показывать заставку при запуске
  languageSet: boolean; // язык уже выбран (первый запуск — окно выбора языка)
  termsAccepted: boolean; // приняты соглашение и политика конфиденциальности
};

// Профиль и профили «Как в системе». Значения 0.7.4 лежат в настройках и после 0.7.5; если их нет, а есть выбор 0.7.5 (тема + цвет) — переводим по таблице и сохраняем.
export async function loadSchemeChoice(): Promise<{ scheme: SchemeSetting; systemPicks: SystemPicks }> {
  const result = schemeChoiceFromSettings({
    scheme: await getSetting<unknown>('scheme'),
    systemLight: await getSetting<unknown>('systemLight'),
    systemDark: await getSetting<unknown>('systemDark'),
    themeMode: await getSetting<unknown>('themeMode'),
    accent: await getSetting<unknown>('accent'),
  });
  if (result.migrated) {
    await saveScheme(result.setting);
    await saveSystemPick('light', result.picks.light);
    await saveSystemPick('dark', result.picks.dark);
  }
  return { scheme: result.setting, systemPicks: result.picks };
}

// Неизвестное или отсутствующее значение → значение по умолчанию.
export async function loadAppearance(): Promise<Appearance> {
  const choice = await loadSchemeChoice();
  const currency = await getSetting<unknown>('currency');
  const language = await getSetting<unknown>('language');
  const remember = await getSetting<unknown>('rememberItems');
  return {
    scheme: choice.scheme,
    systemPicks: choice.systemPicks,
    currency: isCurrencySetting(currency) ? currency : DEFAULT_CURRENCY,
    language: isLanguageSetting(language) ? language : 'system',
    rememberItems: remember !== false,
    showSplash: (await getSetting<unknown>('showSplash')) !== false,
    languageSet: isLanguageSetting(language),
    termsAccepted: (await getSetting<unknown>('termsAccepted')) === true,
  };
}

export const saveScheme = (scheme: SchemeSetting) => setSetting('scheme', scheme);
export const saveSystemPick = (mode: Scheme, key: string) => setSetting(mode === 'light' ? 'systemLight' : 'systemDark', key);
export async function loadSystemPicks(): Promise<SystemPicks> {
  return cleanPicks(await getSetting<unknown>('systemLight'), await getSetting<unknown>('systemDark'));
}

export const saveCurrency = (currency: CurrencySetting) => setSetting('currency', currency);
export const saveLanguage = (language: LanguageSetting) => setSetting('language', language);
export const saveShowSplash = (value: boolean) => setSetting('showSplash', value);
export const saveTermsAccepted = () => setSetting('termsAccepted', true);
export const saveRememberItems = (value: boolean) => setSetting('rememberItems', value);
