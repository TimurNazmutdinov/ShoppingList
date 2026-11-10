import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Palette, radius, useTheme } from '@/theme';
import { t } from '@/i18n';
import { useSettings } from '@/AppSettings';
import { UNITS, formatQty, parseQty } from '@/logic/history';
import { currencySymbol, formatMoney, parsePrice } from '@/logic/money';
import { QuickQty } from '@/logic/shopping';
import { BottomSheet } from './BottomSheet';
import { FormField, TextField } from './FormField';
import { PrimaryButton } from './PrimaryButton';

const PRESETS = [0.5, 1, 2, 3];

type Props = { visible: boolean; value: QuickQty; onClose: () => void; onChange: (v: QuickQty) => void };

// Подпись «2 кг» для кнопки рядом с «+».
export function quickQtyLabel(v: QuickQty): string {
  return formatQty(v.qty, v.unit, (u) => t(`unitShort.${u as (typeof UNITS)[number]}`));
}

// Подпись цены «1 500 ₸» (пусто, если цены нет).
export function quickPriceLabel(v: QuickQty, symbol: string): string {
  return v.price === null || v.price === undefined ? '' : formatMoney(v.price, symbol);
}

// Быстрый ввод количества, единицы и цены (за всю позицию): число, единица и цена в одной компактной панели.
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
  const { currency } = useSettings();
  const symbol = currencySymbol(currency);
  const [text, setText] = useState(value.qty === null ? '' : String(value.qty).replace('.', ','));
  const [unit, setUnit] = useState<string | null>(value.unit);
  const [price, setPrice] = useState(value.price === null || value.price === undefined ? '' : String(value.price).replace('.', ','));

  const chip = (label: string, active: boolean, onPress: () => void, tight = false) => (
    <Pressable
      key={label}
      style={[styles.chip, tight && styles.chipTight, active && styles.chipActive]}
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
        {PRESETS.map((p) => chip(String(p).replace('.', ','), parseQty(text) === p, () => setText(String(p).replace('.', ',')), true))}
        <TextField
          style={styles.custom}
          value={text}
          onChangeText={setText}
          keyboardType="decimal-pad"
          maxLength={8}
          placeholder={t('qty.custom')}
          accessibilityLabel={t('qty.custom')}
        />
      </View>
      <View style={styles.row}>
        {UNITS.map((u) => chip(t(`unitShort.${u}`), unit === u, () => setUnit(unit === u ? null : u)))}
      </View>
      <FormField label={t('item.priceLabel', { symbol })}>
        <TextField value={price} onChangeText={setPrice} keyboardType="decimal-pad" maxLength={12} accessibilityLabel={t('item.priceLabel', { symbol })} />
      </FormField>
      <View style={styles.buttons}>
        <Pressable style={styles.reset} onPress={() => onChange({ qty: null, unit: null, price: null })} accessibilityRole="button">
          <Text style={styles.resetText}>{t('qty.reset')}</Text>
        </Pressable>
        <View style={styles.done}>
          <PrimaryButton label={t('qty.done')} onPress={() => onChange({ qty: parseQty(text), unit, price: parsePrice(price) })} />
        </View>
      </View>
    </>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    title: { color: colors.text, fontSize: 20, fontWeight: '600', marginBottom: 10 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    chipTight: { minWidth: 48, paddingHorizontal: 6 },
    custom: { flexGrow: 1, flexBasis: 88, minWidth: 88, height: 48, fontSize: 14, paddingHorizontal: 8 },
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
    chipActive: { backgroundColor: colors.tonal },
    chipText: { color: colors.text, fontSize: 16 },
    chipTextActive: { color: colors.onTonal, fontWeight: '700' },
    buttons: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
    reset: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 16 },
    resetText: { color: colors.textMuted, fontSize: 17, fontWeight: '600' },
    done: { flex: 1 },
  });
