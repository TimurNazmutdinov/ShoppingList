import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocales } from 'expo-localization';
import * as SystemUI from 'expo-system-ui';
import { Lang, LanguageSetting, StringKey, resolveLanguage, setLanguage, t } from '@/i18n';
import { Scheme, SchemeKey, SchemeSetting, ThemeProvider, buildPalette, schemeDefs } from '@/theme';
import { CurrencySetting } from '@/logic/money';
import { Appearance, saveCurrency, saveLanguage, saveRememberItems, saveScheme, saveShowSplash, saveSystemPick } from '@/db/appearance';
import { ALL_ICON_KEYS, DEFAULT_ICON, SystemPicks, activeSchemeKey } from '@/logic/schemes';
import { setLauncherIcon as applyLauncherIcon, setShortcuts } from '@/alarms';
import { SHORTCUT_ACTIONS, shortcutUri } from '@/logic/shortcuts';

type Settings = {
  schemeSetting: SchemeSetting;
  schemeKey: SchemeKey; // активный профиль
  mode: Scheme; // режим активного профиля (светлый / тёмный)
  systemPicks: SystemPicks; // профили «Как в системе» для светлой и тёмной темы телефона
  setSystemPick: (mode: Scheme, key: SchemeKey) => void;
  setSchemeSetting: (setting: SchemeSetting) => void;
  currency: CurrencySetting;
  setCurrency: (currency: CurrencySetting) => void;
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

// Профиль и язык: читаются при запуске до показа экранов, переключаются сразу.
export function AppSettingsProvider({ initial, children }: Props) {
  const [schemeSetting, setSchemeSettingState] = useState(initial.scheme);
  const [systemPicks, setSystemPicksState] = useState(initial.systemPicks);
  const [currency, setCurrencyState] = useState(initial.currency);
  const [languageSetting, setLanguageSettingState] = useState(initial.language);
  const [rememberItems, setRememberItemsState] = useState(initial.rememberItems);
  const [showSplash, setShowSplashState] = useState(initial.showSplash);
  const system = useColorScheme();
  const deviceCode = useLocales()[0]?.languageCode;

  const schemeKey = activeSchemeKey(schemeSetting, system, systemPicks);
  const mode = schemeDefs[schemeKey].mode;
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
  const setSystemPick = useCallback((m: Scheme, key: SchemeKey) => {
    setSystemPicksState((p) => ({ ...p, [m]: key }));
    saveSystemPick(m, key).catch((e) => console.warn(e));
  }, []);
  const setCurrency = useCallback((c: CurrencySetting) => {
    setCurrencyState(c);
    saveCurrency(c).catch((e) => console.warn(e));
  }, []);
  // Ярлыки на иконке: подписи на языке приложения; ставятся при запуске и при смене языка.
  const registerShortcuts = useCallback(() => {
    setShortcuts(SHORTCUT_ACTIONS.map((a) => ({ id: a, label: t(`shortcut.${a}` as StringKey), uri: shortcutUri(a) })));
  }, []);
  useEffect(() => {
    registerShortcuts();
  }, [language, registerShortcuts]);

  // Значок на рабочем столе всегда фирменный: если стоял другой (0.7.4), переключаем, когда приложение уходит в фон.
  // Ярлыки привязаны к активному значку, поэтому после смены ставим их заново.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        applyLauncherIcon(DEFAULT_ICON, [...ALL_ICON_KEYS]);
        registerShortcuts();
      }
    });
    return () => sub.remove();
  }, [registerShortcuts]);

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
    () => ({ schemeSetting, schemeKey, mode, systemPicks, setSystemPick, setSchemeSetting, currency, setCurrency, languageSetting, language, rememberItems, setRememberItems, showSplash, setShowSplash, setLanguageSetting }),
    [schemeSetting, schemeKey, mode, systemPicks, setSystemPick, setSchemeSetting, currency, setCurrency, languageSetting, language, rememberItems, setRememberItems, showSplash, setShowSplash, setLanguageSetting],
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
