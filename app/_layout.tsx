import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ErrorBoundaryProps, Stack } from 'expo-router';
import * as NativeSplash from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';
import { Palette, useTheme } from '@/theme';
import { t } from '@/i18n';
import { initDb } from '@/db';
import { Appearance, loadAppearance } from '@/db/appearance';
import { AppSettingsProvider } from '@/AppSettings';
import { useReminderSync } from '@/notifications';
import { UpdatesProvider, useUpdates } from '@/Updates';
import { UpdateScreen } from '@/components/UpdateScreen';
import { SplashScreen } from '@/components/SplashScreen';
import { IS_PROTOTYPE } from '@/config';
import { PrimaryButton } from '@/components/PrimaryButton';

const SPLASH_MS = 2000;

// Нативная заставка (только фон) закрывается, когда живая заставка отрисовала знак.
NativeSplash.preventAutoHideAsync().catch(() => {});
const hideNativeSplash = () => NativeSplash.hideAsync().catch(() => {});

// Корневой экран ошибки: expo-router показывает его вместо упавшего экрана.
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.errorRoot}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.warn} />
      <Text style={styles.errorTitle}>{t('error.title')}</Text>
      <PrimaryButton label={t('error.restart')} onPress={retry} />
    </View>
  );
}

export default function RootLayout() {
  const [appearance, setAppearance] = useState<Appearance | null>(null);
  const [error, setError] = useState<string | null>(null);
  // В прототипе заставка ждёт касания; иначе закрывается сама через SPLASH_MS.
  const [tapped, setTapped] = useState(!IS_PROTOTYPE);
  const [minDone, setMinDone] = useState(false);

  useEffect(() => {
    // Тема и язык читаются до показа экранов, чтобы не было «мигания».
    initDb()
      .then(loadAppearance)
      .then(setAppearance)
      .catch((e) => {
        console.warn(e);
        setError(t('error.migration'));
      });
    const timer = setTimeout(() => setMinDone(true), IS_PROTOTYPE ? 0 : SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  if (error) {
    hideNativeSplash();
    throw new Error(error);
  }
  if (!appearance || !minDone || !tapped) {
    return <SplashScreen appearance={appearance} onReady={hideNativeSplash} onContinue={IS_PROTOTYPE ? () => setTapped(true) : undefined} />;
  }

  return (
    <AppSettingsProvider initial={appearance}>
      <UpdatesProvider>
        <RootStack />
      </UpdatesProvider>
    </AppSettingsProvider>
  );
}

function RootStack() {
  const colors = useTheme();
  useReminderSync();
  const { required } = useUpdates();
  if (required) return <UpdateScreen info={required} />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    errorRoot: {
      flex: 1,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      gap: 12,
    },
    errorTitle: { color: colors.text, fontSize: 20, fontWeight: '600', textAlign: 'center' },
  });
