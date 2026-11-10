import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, useTheme } from '@/theme';
import { t } from '@/i18n';
import { UNITS, parseQty } from '@/logic/history';
import { parsePrice } from '@/logic/money';
import { TextField } from './FormField';

// Строка продукта в блюде: галочка (включён ли), название, количество, единица (нажатие меняет), цена.
export type EditRow = { key: string; title: string; qty: string; unit: string | null; price: string; on: boolean };

const text = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n).replace('.', ','));

export const toEditRow = (key: string, p: { title: string; qty: number | null; unit: string | null; price?: number | null }): EditRow => ({
  key, title: p.title, qty: text(p.qty), unit: p.unit, price: text(p.price), on: true,
});

export const emptyRow = (key: string): EditRow => ({ key, title: '', qty: '', unit: null, price: '', on: true });

export const toProduct = (r: EditRow) => ({ title: r.title.trim(), qty: parseQty(r.qty), unit: r.unit, price: parsePrice(r.price) });

const nextUnit = (unit: string | null): string | null => {
  const i = unit === null ? -1 : (UNITS as readonly string[]).indexOf(unit);
  return i + 1 >= UNITS.length ? null : UNITS[i + 1];
};

type Props = { row: EditRow; symbol: string; onPatch: (patch: Partial<EditRow>) => void };

export function DishProductRow({ row, symbol, onPatch }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <Pressable
        style={styles.checkHit}
        onPress={() => onPatch({ on: !row.on })}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: row.on }}
        accessibilityLabel={row.title || t('dish.namePlaceholder')}
      >
        <View style={[styles.check, row.on && styles.checkOn]}>{row.on ? <Ionicons name="checkmark" size={16} color={colors.onPrimary} /> : null}</View>
      </Pressable>
      <View style={styles.name}>
        <TextField style={styles.field} value={row.title} onChangeText={(title) => onPatch({ title })} placeholder={t('dish.namePlaceholder')} maxLength={60} editable={row.on} />
      </View>
      <View style={styles.qty}>
        <TextField style={[styles.field, styles.num]} value={row.qty} onChangeText={(qty) => onPatch({ qty })} keyboardType="decimal-pad" maxLength={6} editable={row.on} accessibilityLabel={t('item.qtyLabel')} />
      </View>
      <Pressable style={styles.unit} onPress={() => onPatch({ unit: nextUnit(row.unit) })} disabled={!row.on} accessibilityRole="button" accessibilityLabel={t('dish.unitPick')}>
        <Text style={styles.unitText}>{row.unit ? t(`unitShort.${row.unit as (typeof UNITS)[number]}`) : t('dish.unitNone')}</Text>
      </Pressable>
      <View style={styles.price}>
        <TextField
          style={[styles.field, styles.num]}
          value={row.price}
          onChangeText={(price) => onPatch({ price })}
          keyboardType="decimal-pad"
          maxLength={9}
          editable={row.on}
          placeholder={symbol}
          accessibilityLabel={t('item.priceLabel', { symbol })}
        />
      </View>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 56 },
    checkHit: { width: 44, height: 52, alignItems: 'center', justifyContent: 'center' },
    check: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.outline, alignItems: 'center', justifyContent: 'center' },
    checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    name: { flex: 1, minWidth: 80 },
    qty: { width: 56 },
    price: { width: 66 },
    field: { height: 48, fontSize: 15, paddingHorizontal: 8 },
    num: { textAlign: 'center' },
    unit: { width: 36, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
    unitText: { color: colors.textMuted, fontSize: 14 },
  });
