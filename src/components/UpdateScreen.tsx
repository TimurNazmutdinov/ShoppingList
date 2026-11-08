import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { File } from 'expo-file-system';
import { Palette, useTheme } from '@/theme';
import { t } from '@/i18n';
import { UpdateInfo, megabytes } from '@/logic/updates';
import { Download, installApk, openInstallSettings, startDownload } from '@/updater';
import { appVersion } from '@/version';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PillButton } from '@/components/PillButton';

type Phase = 'idle' | 'downloading' | 'installing' | 'permission' | 'error';

// Обязательное обновление: на весь экран, закрыть нельзя.
// idle → скачивание с прогрессом → системный установщик; если вернулись из него, а приложение не заменилось, — экран разрешения.
export function UpdateScreen({ info }: { info: UpdateInfo }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState({ done: 0, total: info.size ?? 0 });
  const download = useRef<Download | null>(null);
  const file = useRef<File | null>(null);
  const wentToBackground = useRef(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') wentToBackground.current = true;
      if (state === 'active' && wentToBackground.current) {
        wentToBackground.current = false;
        setPhase((p) => (p === 'installing' ? 'permission' : p));
      }
    });
    return () => sub.remove();
  }, []);

  const openManual = () => Linking.openURL(info.url).catch((e) => console.warn(e));

  const install = async () => {
    if (!file.current) return;
    wentToBackground.current = false;
    setPhase('installing');
    try {
      await installApk(file.current);
    } catch (e) {
      console.warn(e);
      setPhase('error');
    }
  };

  const start = async () => {
    if (!info.apkUrl) {
      openManual();
      return;
    }
    setProgress({ done: 0, total: info.size ?? 0 });
    setPhase('downloading');
    try {
      download.current = startDownload(info.apkUrl, info.size, (done, total) => setProgress({ done, total }));
      file.current = await download.current.promise;
      await install();
    } catch (e) {
      console.warn(e);
      setPhase((p) => (p === 'downloading' ? 'error' : p));
    }
  };

  const cancel = () => {
    download.current?.cancel();
    setPhase('idle');
  };

  const sizeText = info.size ? ` · ${t('update.sizeMb', { size: megabytes(info.size) })}` : '';
  const ratio = progress.total > 0 ? Math.min(1, progress.done / progress.total) : 0;

  if (phase === 'downloading') {
    return (
      <SafeAreaView style={styles.root}>
        <Icon name="download-outline" styles={styles} color={colors.onPrimary} />
        <Text style={styles.title} accessibilityRole="header">{t('update.downloading')}</Text>
        {progress.total > 0 && (
          <Text style={styles.versions}>
            {t('update.progress', { done: megabytes(progress.done), total: megabytes(progress.total) })}
          </Text>
        )}
        <View
          style={styles.track}
          accessible
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
        >
          <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%` }]} />
        </View>
        <PillButton label={t('update.cancel')} onPress={cancel} />
        <Text style={styles.hint}>{t('update.installHint')}</Text>
      </SafeAreaView>
    );
  }

  if (phase === 'permission') {
    return (
      <SafeAreaView style={styles.root}>
        <Icon name="shield-checkmark-outline" styles={styles} color={colors.onPrimary} />
        <Text style={styles.title} accessibilityRole="header">{t('update.permTitle')}</Text>
        <Text style={styles.text}>{t('update.permText')}</Text>
        <View style={styles.button}>
          <PrimaryButton
            label={t('update.openSettings')}
            onPress={() => openInstallSettings().catch((e) => console.warn(e))}
          />
          <PrimaryButton label={t('update.installAgain')} onPress={install} />
        </View>
        <Text style={styles.hint}>{t('update.permHint')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <Icon name="download-outline" styles={styles} color={colors.onPrimary} />
      <Text style={styles.title} accessibilityRole="header">
        {phase === 'error' ? t('update.error') : t('update.title')}
      </Text>
      <Text style={styles.versions}>{t('update.versions', { version: info.version, current: appVersion })}{sizeText}</Text>
      <View style={styles.button}>
        <PrimaryButton label={phase === 'error' ? t('update.retry') : t('update.button')} onPress={start} />
        {phase === 'error' && <PillButton label={t('update.manual')} onPress={openManual} />}
      </View>
      <Text style={styles.hint}>{t('update.keep')}{'\n'}{t('update.blocked')}</Text>
    </SafeAreaView>
  );
}

function Icon({ name, styles, color }: { name: keyof typeof Ionicons.glyphMap; styles: ReturnType<typeof createStyles>; color: string }) {
  return (
    <View style={styles.icon}>
      <Ionicons name={name} size={36} color={color} />
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    icon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { color: colors.text, fontSize: 22, fontWeight: '600', textAlign: 'center', marginTop: 16 },
    versions: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 6 },
    text: { color: colors.text, fontSize: 15, textAlign: 'center', marginTop: 10 },
    track: { alignSelf: 'stretch', height: 10, borderRadius: 5, backgroundColor: colors.track, marginVertical: 16, overflow: 'hidden' },
    fill: { height: 10, borderRadius: 5, backgroundColor: colors.primaryStrong },
    button: { alignSelf: 'stretch', marginTop: 16, gap: 4 },
    hint: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 12 },
  });
