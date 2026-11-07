import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocales } from 'expo-localization';
import * as SystemUI from 'expo-system-ui';
import { Lang, LanguageSetting, resolveLanguage, setLanguage } from '@/i18n';
import { ApplyScope, SchemeKey, SchemeSetting, ThemeProvider, buildPalette, schemeDefs, themeDefaults } from '@/theme';
import { CurrencySetting } from '@/logic/money';
import { Appearance, saveApplyScope, saveCurrency, saveIconDeclined, saveLanguage, saveLauncherIcon, saveRememberItems, saveScheme } from '@/db/appearance';
import { DEFAULT_ICON, activeSchemeKey } from '@/logic/schemes';
import { setLauncherIcon as applyLauncherIcon } from '@/alarms';

// Все ключи иконок рабочего стола: основная и по одной на профиль (кроме фирменного «Янтаря»).
const ICON_KEYS = [DEFAULT_ICON, ...Object.keys(schemeDefs).filter((k) => k !== themeDefaults.lightScheme)];

type Settings = {
  schemeSetting: SchemeSetting;
  schemeKey: SchemeKey; // активный профиль
  applyScope: ApplyScope;
  setApplyScope: (scope: ApplyScope) => void;
  currency: CurrencySetting;
  setCurrency: (currency: CurrencySetting) => void;
  launcherIcon: string;
  iconDeclined: boolean;
  setLauncherIcon: (key: string) => void;
  setIconDeclined: (declined: boolean) => void;
  languageSetting: LanguageSetting;
  language: Lang;
  rememberItems: boolean;
  setSchemeSetting: (setting: SchemeSetting) => void;
  setRememberItems: (value: boolean) => void;
  setLanguageSetting: (setting: LanguageSetting) => void;
};

const SettingsContext = createContext<Settings | null>(null);

export function useSettings(): Settings {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings outside AppSettingsProvider');
  return value;
}

type Props = { initial: Appearance; children: ReactNode };

// Профиль и язык: читаются при запуске до показа экранов, переключаются сразу.
export function AppSettingsProvider({ initial, children }: Props) {
  const [schemeSetting, setSchemeSettingState] = useState(initial.scheme);
  const [applyScope, setApplyScopeState] = useState(initial.applyScope);
  const [currency, setCurrencyState] = useState(initial.currency);
  const [launcherIcon, setLauncherIconState] = useState(initial.launcherIcon);
  const [iconDeclined, setIconDeclinedState] = useState(initial.iconDeclined);
  const [languageSetting, setLanguageSettingState] = useState(initial.language);
  const [rememberItems, setRememberItemsState] = useState(initial.rememberItems);
  const system = useColorScheme();
  const deviceCode = useLocales()[0]?.languageCode;

  const schemeKey = activeSchemeKey(schemeSetting, system);
  const language = resolveLanguage(languageSetting, deviceCode);
  // Словарь переключается до отрисовки детей, иначе t() вернёт старый язык.
  setLanguage(language);

  // Новый объект при смене языка: так перерисовываются все, кто читает useTheme().
  const palette = useMemo(() => buildPalette(schemeKey), [schemeKey, language]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(palette.bg).catch(() => {});
  }, [palette.bg]);

  const setSchemeSetting = useCallback((setting: SchemeSetting) => {
    setSchemeSettingState(setting);
    saveScheme(setting).catch((e) => console.warn(e));
  }, []);
  const setApplyScope = useCallback((scope: ApplyScope) => {
    setApplyScopeState(scope);
    saveApplyScope(scope).catch((e) => console.warn(e));
  }, []);
  const setCurrency = useCallback((c: CurrencySetting) => {
    setCurrencyState(c);
    saveCurrency(c).catch((e) => console.warn(e));
  }, []);
  const setLauncherIcon = useCallback((key: string) => {
    setLauncherIconState(key);
    saveLauncherIcon(key).catch((e) => console.warn(e));
  }, []);
  const setIconDeclined = useCallback((declined: boolean) => {
    setIconDeclinedState(declined);
    saveIconDeclined(declined).catch((e) => console.warn(e));
  }, []);

  // Иконка рабочего стола меняется, когда приложение уходит в фон (не посреди работы).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') applyLauncherIcon(launcherIcon, ICON_KEYS);
    });
    return () => sub.remove();
  }, [launcherIcon]);

  const setRememberItems = useCallback((value: boolean) => {
    setRememberItemsState(value);
    saveRememberItems(value).catch((e) => console.warn(e));
  }, []);
  const setLanguageSetting = useCallback((setting: LanguageSetting) => {
    setLanguageSettingState(setting);
    saveLanguage(setting).catch((e) => console.warn(e));
  }, []);

  const value = useMemo(
    () => ({ schemeSetting, schemeKey, applyScope, setApplyScope, currency, setCurrency, launcherIcon, iconDeclined, setLauncherIcon, setIconDeclined, languageSetting, language, rememberItems, setSchemeSetting, setRememberItems, setLanguageSetting }),
    [schemeSetting, schemeKey, applyScope, setApplyScope, currency, setCurrency, launcherIcon, iconDeclined, setLauncherIcon, setIconDeclined, languageSetting, language, rememberItems, setSchemeSetting, setRememberItems, setLanguageSetting],
  );

  return (
    <SettingsContext.Provider value={value}>
      <ThemeProvider value={palette}>
        <StatusBar style={schemeDefs[schemeKey].mode === 'dark' ? 'light' : 'dark'} />
        {children}
      </ThemeProvider>
    </SettingsContext.Provider>
  );
}
