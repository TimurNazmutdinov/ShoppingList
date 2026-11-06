import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, radius, useTheme } from '@/theme';
import { t } from '@/i18n';
import { canScheduleExactAlarms, isIgnoringBatteryOptimizations, openBatterySettings, openExactAlarmSettings } from '@/alarms';
import { getPlanSummary, openPhoneSettings } from '@/notifications';
import { describeNext, statusProblems } from '@/logic/reminderStatus';
import { formatShort } from '@/logic/dates';
import { ReminderSettings } from '@/logic/reminders';

type Props = { notificationsGranted: boolean; settings: ReminderSettings };

type Snapshot = { exactAlarms: boolean; battery: boolean; count: number; next: Date | null };

// Блок «Состояние напоминаний»: что мешает им приходить вовремя и когда ближайшее.
export function ReminderStatus({ notificationsGranted, settings }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [snap, setSnap] = useState<Snapshot | null>(null);

  const load = useCallback(async () => {
    try {
      const { count, next } = await getPlanSummary();
      setSnap({ exactAlarms: canScheduleExactAlarms(), battery: isIgnoringBatteryOptimizations(), count, next });
    } catch (e) {
      console.warn('reminder status', e);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load, notificationsGranted, settings]);

  // Вернулись из системных настроек — состояние могло измениться.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') load();
    });
    return () => sub.remove();
  }, [load]);

  if (!snap) return null;
  const problems = statusProblems({
    notifications: notificationsGranted,
    exactAlarms: snap.exactAlarms,
    batteryUnrestricted: snap.battery,
  });
  const when = describeNext(snap.next, new Date());
  const whenText = when
    ? `${when.day === 'date' ? formatShort(when.iso) : t(when.day === 'today' ? 'reminders.today' : 'reminders.tomorrow')}, ${when.time}`
    : null;

  const rows = [
    { key: 'notifications', ok: t('reminders.statusNotifOk'), bad: t('reminders.statusNotifBad'), open: openPhoneSettings },
    { key: 'exactAlarms', ok: t('reminders.statusExactOk'), bad: t('reminders.statusExactBad'), open: openExactAlarmSettings },
    { key: 'battery', ok: t('reminders.statusBatteryOk'), bad: t('reminders.statusBatteryBad'), open: openBatterySettings },
  ] as const;

  return (
    <View style={styles.card} accessibilityLabel={t('reminders.statusTitle')}>
      <Text style={styles.title}>{t('reminders.statusTitle')}</Text>
      {rows.map((r) => {
        const bad = problems.includes(r.key);
        return (
          <View key={r.key} style={styles.item}>
            <View style={styles.line}>
              <Ionicons
                name={bad ? 'alert-circle' : 'checkmark-circle'}
                size={22}
                color={bad ? colors.warn : colors.switchOn}
              />
              <Text style={styles.text}>{bad ? r.bad : r.ok}</Text>
            </View>
            {bad ? (
              <Pressable
                style={styles.btn}
                onPress={() => Promise.resolve(r.open()).catch((e) => console.warn(e))}
                accessibilityRole="button"
                accessibilityLabel={`${t('reminders.statusOpen')}: ${r.bad}`}
              >
                <Text style={styles.btnText}>{t('reminders.statusOpen')}</Text>
                <Ionicons name="open-outline" size={16} color={colors.text} />
              </Pressable>
            ) : null}
          </View>
        );
      })}
      <View style={styles.line}>
        <Ionicons name="checkmark-circle" size={22} color={colors.switchOn} />
        <Text style={styles.text}>{t('reminders.statusScheduled', { n: snap.count })}</Text>
      </View>
      <Text style={styles.hint}>{whenText ? t('reminders.statusNext', { when: whenText }) : t('reminders.statusNone')}</Text>
      {problems.includes('battery') ? <Text style={styles.hint}>{t('reminders.statusSamsung')}</Text> : null}
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radius.card,
      padding: 14,
      marginBottom: 12,
    },
    title: { color: colors.text, fontSize: 17, fontWeight: '600', marginBottom: 6 },
    item: { paddingVertical: 4 },
    line: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
    text: { color: colors.text, fontSize: 16, flex: 1 },
    btn: {
      minHeight: 48,
      alignSelf: 'flex-start',
      marginLeft: 32,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.outline,
    },
    btnText: { color: colors.text, fontSize: 15 },
    hint: { color: colors.textMuted, fontSize: 14, marginTop: 6 },
  });
