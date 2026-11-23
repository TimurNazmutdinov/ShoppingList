import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Palette, radius, useTheme } from '@/theme';
import { t } from '@/i18n';
import { PrimaryButton } from './PrimaryButton';

// Веб (PWA): открыто ли приложение уже со значка на экране «Домой» (тогда инструкция не нужна).
export function isInstalledWeb(): boolean {
  if (typeof window === 'undefined') return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || (window.matchMedia?.('(display-mode: standalone)').matches ?? false);
}

const STEPS = [
  ['install.s1', 'install.s1d'],
  ['install.s2', 'install.s2d'],
  ['install.s3', 'install.s3d'],
  ['install.s4', 'install.s4d'],
] as const;

// Первый запуск в браузере: как открыть в Safari и добавить на экран «Домой». Показывается до выбора языка.
export function InstallHint({ onContinue, onNever }: { onContinue: () => void; onNever: () => void }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">{t('install.title')}</Text>
        <Text style={styles.intro}>{t('install.intro')}</Text>
        {STEPS.map(([title, body], i) => (
          <View key={title} style={styles.step}>
            <View style={styles.num}>
              <Text style={styles.numText}>{i + 1}</Text>
            </View>
            <View style={styles.stepText}>
              <Text style={styles.stepTitle}>{t(title)}</Text>
              <Text style={styles.stepBody}>{t(body)}</Text>
            </View>
          </View>
        ))}
        <View style={styles.button}>
          <PrimaryButton label={t('install.ok')} onPress={onContinue} />
        </View>
        <Pressable style={styles.never} onPress={onNever} accessibilityRole="button">
          <Text style={styles.neverText}>{t('install.never')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 24, gap: 10, flexGrow: 1, justifyContent: 'center' },
    title: { color: colors.text, fontSize: 24, fontWeight: '600', textAlign: 'center' },
    intro: { color: colors.textMuted, fontSize: 15, textAlign: 'center', marginBottom: 6 },
    step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 14, borderRadius: radius.card, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
    num: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    numText: { color: colors.onPrimary, fontWeight: '700' },
    stepText: { flex: 1, gap: 2 },
    stepTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
    stepBody: { color: colors.textMuted, fontSize: 14 },
    button: { marginTop: 8 },
    never: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
    neverText: { color: colors.textMuted, fontSize: 14 },
  });
