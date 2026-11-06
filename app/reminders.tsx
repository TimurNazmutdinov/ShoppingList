import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Palette, radius, useTheme } from '@/theme';
import { t } from '@/i18n';
import { AppSwitch } from '@/components/AppSwitch';
import { ReminderStatus } from '@/components/ReminderStatus';
import { TimeField } from '@/components/TimeField';
import { loadReminderSettings, saveReminderSettings } from '@/db/reminders';
import { DEFAULT_REMINDER_SETTINGS, ReminderSettings } from '@/logic/reminders';
import { PermissionState, getPermissionState, openPhoneSettings, requestPermission, rescheduleReminders, sendTestNotification } from '@/notifications';

// Экран «Напоминания»: включение, время, тихие часы, проверка и состояние.
export default function RemindersScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  const [permission, setPermission] = useState<PermissionState>('undetermined');
  const [sent, setSent] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setSettings(await loadReminderSettings());
        setPermission(await getPermissionState());
      })().catch((e) => console.warn(e));
    }, []),
  );

  const update = (patch: Partial<ReminderSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveReminderSettings(next)
      .then(async () => {
        if (next.enabled && (await getPermissionState()) === 'undetermined') setPermission(await requestPermission());
        await rescheduleReminders();
      })
      .catch((e) => console.warn(e));
  };

  const test = async () => {
    if ((await getPermissionState()) !== 'granted') setPermission(await requestPermission());
    if ((await getPermissionState()) !== 'granted') return;
    await sendTestNotification();
    setSent(true);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t('reminders.title')}</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {permission === 'denied' ? (
          <View style={styles.blocked}>
            <Text style={styles.blockedTitle}>{t('reminders.blockedTitle')}</Text>
            <Text style={styles.blockedText}>{t('reminders.blockedText')}</Text>
            <Pressable style={styles.blockedBtn} onPress={() => openPhoneSettings()} accessibilityRole="button">
              <Text style={styles.blockedBtnText}>{t('reminders.openSettings')}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.row}>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>{t('reminders.enable')}</Text>
            <Text style={styles.hint}>{t('reminders.enableHint')}</Text>
          </View>
          <AppSwitch value={settings.enabled} onValueChange={(v) => update({ enabled: v })} accessibilityLabel={t('reminders.enable')} />
        </View>

        <View style={[styles.row, styles.gap]}>
          <Text style={[styles.rowTitle, styles.rowBody]}>{t('reminders.time')}</Text>
          <TimeField value={settings.time} onChange={(time) => update({ time })} label={t('reminders.time')} />
        </View>

        <View style={[styles.row, styles.gap]}>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>{t('reminders.quiet')}</Text>
            <Text style={styles.hint}>{t('reminders.quietHint')}</Text>
          </View>
          <AppSwitch value={settings.quietEnabled} onValueChange={(v) => update({ quietEnabled: v })} accessibilityLabel={t('reminders.quiet')} />
        </View>
        {settings.quietEnabled ? (
          <View style={[styles.row, styles.gap]}>
            <Text style={styles.label}>{t('reminders.quietFrom')}</Text>
            <TimeField value={settings.quietFrom} onChange={(quietFrom) => update({ quietFrom })} label={t('reminders.quietFrom')} />
            <Text style={styles.label}>{t('reminders.quietTo')}</Text>
            <TimeField value={settings.quietTo} onChange={(quietTo) => update({ quietTo })} label={t('reminders.quietTo')} />
          </View>
        ) : null}

        <Pressable style={[styles.testBtn, styles.gap]} onPress={() => test().catch((e) => console.warn(e))} accessibilityRole="button">
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
          <Text style={styles.testText}>{sent ? t('reminders.testSent') : t('reminders.test')}</Text>
        </Pressable>

        <View style={styles.gap}>
          <ReminderStatus notificationsGranted={permission === 'granted'} settings={settings} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8 },
    back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    title: { color: colors.text, fontSize: 24, fontWeight: '700' },
    content: { paddingHorizontal: 20, paddingBottom: 32 },
    gap: { marginTop: 10 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 56,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radius.card,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    rowBody: { flex: 1 },
    rowTitle: { color: colors.text, fontSize: 17 },
    hint: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
    label: { color: colors.textMuted, fontSize: 15 },
    testBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 52,
      borderRadius: radius.button,
      borderWidth: 1,
      borderColor: colors.outline,
    },
    testText: { color: colors.text, fontSize: 16 },
    blocked: { backgroundColor: colors.cardStrong, borderRadius: radius.card, padding: 14, marginBottom: 12 },
    blockedTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
    blockedText: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
    blockedBtn: { minHeight: 48, justifyContent: 'center', marginTop: 4 },
    blockedBtnText: { color: colors.primaryStrong, fontSize: 15, fontWeight: '700' },
  });
