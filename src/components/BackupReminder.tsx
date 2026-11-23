import { useCallback, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Palette, radius, useTheme } from '@/theme';
import { t } from '@/i18n';
import { getSetting, setSetting } from '@/db';
import { backupAll } from '@/logic/sharing';
import { PillButton } from './PillButton';

const WEEK_MS = 7 * 24 * 3600 * 1000;
const SNOOZE_MS = 24 * 3600 * 1000;

// Веб (PWA): данные лежат только в браузере, поэтому раз в неделю напоминаем сохранить копию в файл.
// Отсчёт: от последней копии, а если копий не было — от первого запуска.
export function BackupReminder() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [show, setShow] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'web') return;
      (async () => {
        const now = Date.now();
        const last = await getSetting<number>('lastBackupAt');
        let ref = last;
        if (ref === null) {
          ref = (await getSetting<number>('backupRefAt')) ?? now;
          await setSetting('backupRefAt', ref);
        }
        const snooze = (await getSetting<number>('backupSnoozeAt')) ?? 0;
        setShow(now - ref >= WEEK_MS && now - snooze >= SNOOZE_MS);
      })().catch((e) => console.warn(e));
    }, []),
  );

  if (!show) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('backup.weeklyTitle')}</Text>
      <Text style={styles.body}>{t('backup.weeklyBody')}</Text>
      <View style={styles.actions}>
        <PillButton
          filled
          label={t('backup.weeklySave')}
          onPress={() => {
            backupAll()
              .then(() => setShow(false))
              .catch((e) => console.warn(e));
          }}
        />
        <PillButton
          label={t('backup.weeklyLater')}
          onPress={() => {
            setSetting('backupSnoozeAt', Date.now()).catch((e) => console.warn(e));
            setShow(false);
          }}
        />
      </View>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    card: { marginHorizontal: 16, marginBottom: 10, padding: 14, borderRadius: radius.card, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, gap: 4 },
    title: { color: colors.text, fontSize: 16, fontWeight: '600' },
    body: { color: colors.textMuted, fontSize: 14 },
    actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  });
