import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocales } from 'expo-localization';
import * as SystemUI from 'expo-system-ui';
import { Lang, LanguageSetting, resolveLanguage, setLanguage } from '@/i18n';
import { SchemeKey, SchemeSetting, ThemeProvider, buildPalette, schemeDefs } from '@/theme';
import { Appearance, saveLanguage, saveRememberItems, saveScheme } from '@/db/appearance';
import { activeSchemeKey } from '@/logic/schemes';

type Settings = {
  schemeSetting: SchemeSetting;
  schemeKey: SchemeKey; // активный профиль
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
  const setRememberItems = useCallback((value: boolean) => {
    setRememberItemsState(value);
    saveRememberItems(value).catch((e) => console.warn(e));
  }, []);
  const setLanguageSetting = useCallback((setting: LanguageSetting) => {
    setLanguageSettingState(setting);
    saveLanguage(setting).catch((e) => console.warn(e));
  }, []);

  const value = useMemo(
    () => ({ schemeSetting, schemeKey, languageSetting, language, rememberItems, setSchemeSetting, setRememberItems, setLanguageSetting }),
    [schemeSetting, schemeKey, languageSetting, language, rememberItems, setSchemeSetting, setRememberItems, setLanguageSetting],
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
