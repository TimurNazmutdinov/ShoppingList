import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Palette, radius, useTheme } from '@/theme';
import { t } from '@/i18n';
import { UNITS, formatQty, parseQty } from '@/logic/history';
import { QuickQty } from '@/logic/shopping';
import { BottomSheet } from './BottomSheet';
import { TextField } from './FormField';
import { PrimaryButton } from './PrimaryButton';

const PRESETS = [0.5, 1, 2, 3, 5];

type Props = { visible: boolean; value: QuickQty; onClose: () => void; onChange: (v: QuickQty) => void };

// Подпись «2 кг» для кнопки рядом с «+».
export function quickQtyLabel(v: QuickQty): string {
  return formatQty(v.qty, v.unit, (u) => t(`unitShort.${u as (typeof UNITS)[number]}`));
}

// Быстрый ввод количества, веса или литража: число и единица в одной компактной панели.
export function QtySheet({ visible, value, onClose, onChange }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <QtyForm value={value} onChange={onChange} />
    </BottomSheet>
  );
}

function QtyForm({ value, onChange }: Pick<Props, 'value' | 'onChange'>) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [text, setText] = useState(value.qty === null ? '' : String(value.qty).replace('.', ','));
  const [unit, setUnit] = useState<string | null>(value.unit);

  const chip = (label: string, active: boolean, onPress: () => void) => (
    <Pressable
      key={label}
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );

  return (
    <>
      <Text style={styles.title}>{t('qty.title')}</Text>
      <View style={styles.row}>
        {PRESETS.map((p) => chip(String(p).replace('.', ','), parseQty(text) === p, () => setText(String(p).replace('.', ','))))}
      </View>
      <TextField value={text} onChangeText={setText} keyboardType="decimal-pad" maxLength={8} accessibilityLabel={t('qty.title')} />
      <View style={[styles.row, styles.unitRow]}>
        {UNITS.map((u) => chip(t(`unitShort.${u}`), unit === u, () => setUnit(unit === u ? null : u)))}
      </View>
      <View style={styles.buttons}>
        <Pressable style={styles.reset} onPress={() => onChange({ qty: null, unit: null })} accessibilityRole="button">
          <Text style={styles.resetText}>{t('qty.reset')}</Text>
        </Pressable>
        <View style={styles.done}>
          <PrimaryButton label={t('qty.done')} onPress={() => onChange({ qty: parseQty(text), unit })} />
        </View>
      </View>
    </>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    title: { color: colors.text, fontSize: 20, fontWeight: '600', marginBottom: 10 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    unitRow: { marginTop: 10 },
    chip: {
      minHeight: 48,
      minWidth: 52,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.button,
      borderWidth: 1,
      borderColor: colors.outline,
    },
    chipActive: { backgroundColor: colors.primary },
    chipText: { color: colors.text, fontSize: 16 },
    chipTextActive: { color: colors.onPrimary, fontWeight: '700' },
    buttons: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
    reset: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 16 },
    resetText: { color: colors.textMuted, fontSize: 17, fontWeight: '600' },
    done: { flex: 1 },
  });
