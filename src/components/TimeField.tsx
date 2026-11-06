import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Palette, useTheme } from '@/theme';
import { t } from '@/i18n';
import { Hm, formatHm } from '@/logic/reminders';

type Props = { value: Hm; onChange: (value: Hm) => void; label: string };

// Время «ЧЧ:ММ»: показывается значением, по нажатию открывается выбор часа и минут.
export function TimeField({ value, onChange, label }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  // Базой берём сегодняшний день: у старых дат другой часовой пояс, и время «уезжало» на час.
  const shown = new Date();
  shown.setHours(value.h, value.m, 0, 0);

  return (
    <>
      <Pressable
        style={styles.box}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatHm(value)}`}
        accessibilityHint={t('a11y.pickTime')}
      >
        <Text style={styles.text}>{formatHm(value)}</Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={shown}
          mode="time"
          is24Hour
          onChange={(event, date) => {
            setOpen(false);
            if (event.type === 'set' && date) onChange({ h: date.getHours(), m: date.getMinutes() });
          }}
        />
      ) : null}
    </>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    box: {
      minWidth: 72,
      minHeight: 48,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.outline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: { color: colors.text, fontSize: 17, fontWeight: '600' },
  });
