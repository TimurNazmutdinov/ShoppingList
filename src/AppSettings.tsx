import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocales } from 'expo-localization';
import * as SystemUI from 'expo-system-ui';
import { Lang, LanguageSetting, StringKey, resolveLanguage, setLanguage, t } from '@/i18n';
import { AccentKey, ApplyScope, Scheme, ThemeMode, ThemeProvider, buildPalette } from '@/theme';
import { CurrencySetting } from '@/logic/money';
import { Appearance, saveAccent, saveApplyScope, saveCurrency, saveIconDeclined, saveLanguage, saveLauncherIcon, saveRememberItems, saveShowSplash, saveThemeMode } from '@/db/appearance';
import { ALL_ICON_KEYS, resolveMode } from '@/logic/schemes';
import { setLauncherIcon as applyLauncherIcon, setShortcuts } from '@/alarms';
import { SHORTCUT_ACTIONS, shortcutUri } from '@/logic/shortcuts';

type Settings = {
  themeMode: ThemeMode; // выбор: светлая, тёмная или «Как в системе»
  mode: Scheme; // тема, в которой сейчас рисуется приложение
  accent: AccentKey;
  setThemeMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentKey) => void;
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
  setRememberItems: (value: boolean) => void;
  showSplash: boolean;
  setShowSplash: (value: boolean) => void;
  setLanguageSetting: (setting: LanguageSetting) => void;
};

const SettingsContext = createContext<Settings | null>(null);

export function useSettings(): Settings {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings outside AppSettingsProvider');
  return value;
}

type Props = { initial: Appearance; children: ReactNode };

// Тема, цвет и язык: читаются при запуске до показа экранов, переключаются сразу.
export function AppSettingsProvider({ initial, children }: Props) {
  const [themeMode, setThemeModeState] = useState(initial.themeMode);
  const [accent, setAccentState] = useState(initial.accent);
  const [applyScope, setApplyScopeState] = useState(initial.applyScope);
  const [currency, setCurrencyState] = useState(initial.currency);
  const [launcherIcon, setLauncherIconState] = useState(initial.launcherIcon);
  const [iconDeclined, setIconDeclinedState] = useState(initial.iconDeclined);
  const [languageSetting, setLanguageSettingState] = useState(initial.language);
  const [rememberItems, setRememberItemsState] = useState(initial.rememberItems);
  const [showSplash, setShowSplashState] = useState(initial.showSplash);
  const system = useColorScheme();
  const deviceCode = useLocales()[0]?.languageCode;

  const mode = resolveMode(themeMode, system);
  const language = resolveLanguage(languageSetting, deviceCode);
  // Словарь переключается до отрисовки детей, иначе t() вернёт старый язык.
  setLanguage(language);

  // Новый объект при смене языка: так перерисовываются все, кто читает useTheme().
  const palette = useMemo(() => buildPalette(mode, accent), [mode, accent, language]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(palette.bg).catch(() => {});
  }, [palette.bg]);

  const setThemeMode = useCallback((next: ThemeMode) => {
    setThemeModeState(next);
    saveThemeMode(next).catch((e) => console.warn(e));
  }, []);
  const setAccent = useCallback((next: AccentKey) => {
    setAccentState(next);
    saveAccent(next).catch((e) => console.warn(e));
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

  // Ярлыки на иконке: подписи на языке приложения; ставятся при запуске и при смене языка.
  const registerShortcuts = useCallback(() => {
    setShortcuts(SHORTCUT_ACTIONS.map((a) => ({ id: a, label: t(`shortcut.${a}` as StringKey), uri: shortcutUri(a) })));
  }, []);
  useEffect(() => {
    registerShortcuts();
  }, [language, registerShortcuts]);

  // Иконка рабочего стола меняется, когда приложение уходит в фон (не посреди работы).
  // Ярлыки привязаны к активной иконке, поэтому после её смены ставим их заново.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        applyLauncherIcon(launcherIcon, [...ALL_ICON_KEYS]);
        registerShortcuts();
      }
    });
    return () => sub.remove();
  }, [launcherIcon, registerShortcuts]);

  const setRememberItems = useCallback((value: boolean) => {
    setRememberItemsState(value);
    saveRememberItems(value).catch((e) => console.warn(e));
  }, []);
  const setShowSplash = useCallback((value: boolean) => {
    setShowSplashState(value);
    saveShowSplash(value).catch((e) => console.warn(e));
  }, []);
  const setLanguageSetting = useCallback((setting: LanguageSetting) => {
    setLanguageSettingState(setting);
    saveLanguage(setting).catch((e) => console.warn(e));
  }, []);

  const value = useMemo(
    () => ({ themeMode, mode, accent, setThemeMode, setAccent, applyScope, setApplyScope, currency, setCurrency, launcherIcon, iconDeclined, setLauncherIcon, setIconDeclined, languageSetting, language, rememberItems, setRememberItems, showSplash, setShowSplash, setLanguageSetting }),
    [themeMode, mode, accent, setThemeMode, setAccent, applyScope, setApplyScope, currency, setCurrency, launcherIcon, iconDeclined, setLauncherIcon, setIconDeclined, languageSetting, language, rememberItems, setRememberItems, showSplash, setShowSplash, setLanguageSetting],
  );

  return (
    <SettingsContext.Provider value={value}>
      <ThemeProvider value={palette}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        {children}
      </ThemeProvider>
    </SettingsContext.Provider>
  );
}
