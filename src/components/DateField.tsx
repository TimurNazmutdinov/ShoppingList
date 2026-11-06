import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Palette, radius, useTheme } from '@/theme';
import { t } from '@/i18n';
import { formatLong, parseIsoDate, toIsoDate } from '@/logic/dates';
import { askReminderPermission } from '@/notifications';
import { AppSwitch } from './AppSwitch';

type Props = {
  date: string | null;
  remind: boolean;
  onChange: (date: string | null, remind: boolean) => void;
};

// Дата покупки (необязательная) и «Напомнить»; переключатель появляется, когда дата задана.
export function DateField({ date, remind, onChange }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const pick = () =>
    DateTimePickerAndroid.open({
      value: date ? parseIsoDate(date) : new Date(),
      mode: 'date',
      onChange: (_e, picked) => {
        if (picked) onChange(toIsoDate(picked), remind);
      },
    });

  return (
    <View>
      <View style={styles.row}>
        <Pressable style={styles.dateBtn} onPress={pick} accessibilityRole="button" accessibilityLabel={t('field.date')}>
          <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
          <Text style={styles.dateText}>{date ? formatLong(date) : t('field.noDate')}</Text>
        </Pressable>
        {date ? (
          <Pressable style={styles.clear} onPress={() => onChange(null, false)} accessibilityRole="button" accessibilityLabel={t('field.clearDate')}>
            <Ionicons name="close-circle-outline" size={24} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {date ? (
        <View style={styles.row}>
          <Ionicons name="notifications-outline" size={20} color={colors.textMuted} />
          <Text style={styles.remindText}>{t('field.remind')}</Text>
          <AppSwitch value={remind} onValueChange={(v) => {
              onChange(date, v);
              if (v) askReminderPermission().catch((e) => console.warn(e));
            }} accessibilityLabel={t('field.remind')} />
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, marginBottom: 6 },
    dateBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 48,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.outline,
      borderRadius: radius.button,
    },
    dateText: { color: colors.text, fontSize: 16 },
    clear: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    remindText: { flex: 1, color: colors.text, fontSize: 16 },
  });
