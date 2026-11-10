import { getSetting, setSetting } from './index';
import { LanguageSetting, isLanguageSetting } from '@/i18n';
import { CurrencySetting, DEFAULT_CURRENCY, isCurrencySetting } from '@/logic/money';
import { AccentKey, ApplyScope, ThemeMode, isApplyScope, themeDefaults } from '@/theme';
import { ThemeChoice, migrateIconKey, themeChoiceFromSettings } from '@/logic/schemes';

export type Appearance = {
  themeMode: ThemeMode; // тема: светлая, тёмная или «Как в системе»
  accent: AccentKey; // цвет
  applyScope: ApplyScope; // куда применять цвет: только экраны или и логотип с заставкой и иконкой
  launcherIcon: string; // подтверждённая иконка рабочего стола: 'default' или ключ акцента
  iconDeclined: boolean; // пользователь отказался менять иконку
  currency: CurrencySetting; // валюта цен
  language: LanguageSetting;
  rememberItems: boolean; // запоминать параметры товаров (мини-самообучение)
  showSplash: boolean; // показывать заставку при запуске
  languageSet: boolean; // язык уже выбран (первый запуск — окно выбора языка)
  termsAccepted: boolean; // приняты соглашение и политика конфиденциальности
};

// Тема и цвет. Если их ещё нет, а лежит старый профиль (до 0.7.5) — переводим по таблице и сохраняем.
export async function loadThemeChoice(): Promise<ThemeChoice> {
  const result = themeChoiceFromSettings({
    themeMode: await getSetting<unknown>('themeMode'),
    accent: await getSetting<unknown>('accent'),
    scheme: await getSetting<unknown>('scheme'),
    systemLight: await getSetting<unknown>('systemLight'),
  });
  if (result.migrated) {
    await saveThemeMode(result.themeMode);
    await saveAccent(result.accent);
  }
  return { themeMode: result.themeMode, accent: result.accent };
}

// Неизвестное или отсутствующее значение → значение по умолчанию.
export async function loadAppearance(): Promise<Appearance> {
  const choice = await loadThemeChoice();
  const scope = await getSetting<unknown>('applyScope');
  const icon = await getSetting<unknown>('launcherIcon');
  const declined = await getSetting<unknown>('iconDeclined');
  const currency = await getSetting<unknown>('currency');
  const language = await getSetting<unknown>('language');
  const remember = await getSetting<unknown>('rememberItems');
  // Иконка старого профиля → иконка нового цвета (записи старых иконок остаются в манифесте, ярлык не пропадает).
  const launcherIcon = migrateIconKey(icon);
  if (icon !== null && icon !== launcherIcon) await saveLauncherIcon(launcherIcon);
  return {
    themeMode: choice.themeMode,
    accent: choice.accent,
    applyScope: isApplyScope(scope) ? scope : themeDefaults.applyScope,
    launcherIcon,
    iconDeclined: declined === true,
    currency: isCurrencySetting(currency) ? currency : DEFAULT_CURRENCY,
    language: isLanguageSetting(language) ? language : 'system',
    rememberItems: remember !== false,
    showSplash: (await getSetting<unknown>('showSplash')) !== false,
    languageSet: isLanguageSetting(language),
    termsAccepted: (await getSetting<unknown>('termsAccepted')) === true,
  };
}

export const saveThemeMode = (mode: ThemeMode) => setSetting('themeMode', mode);
export const saveAccent = (accent: AccentKey) => setSetting('accent', accent);
export const saveApplyScope = (scope: ApplyScope) => setSetting('applyScope', scope);
export const saveLauncherIcon = (key: string) => setSetting('launcherIcon', key);
export const saveIconDeclined = (declined: boolean) => setSetting('iconDeclined', declined);
export const saveCurrency = (currency: CurrencySetting) => setSetting('currency', currency);
export const saveLanguage = (language: LanguageSetting) => setSetting('language', language);
export const saveShowSplash = (value: boolean) => setSetting('showSplash', value);
export const saveTermsAccepted = () => setSetting('termsAccepted', true);
export const saveRememberItems = (value: boolean) => setSetting('rememberItems', value);
