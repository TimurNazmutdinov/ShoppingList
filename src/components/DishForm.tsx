import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Palette, useTheme } from '@/theme';
import { t } from '@/i18n';
import { useSettings } from '@/AppSettings';
import { currencySymbol } from '@/logic/money';
import { DishEntry, DishProduct, MAX_DISH_PRODUCTS } from '@/logic/userDishes';
import { DishProductRow, EditRow, emptyRow, toEditRow, toProduct } from './DishProductRow';
import { FormField, TextField } from './FormField';
import { PrimaryButton } from './PrimaryButton';

type Props = {
  entry: DishEntry | null; // null — новое блюдо
  onCancel: () => void;
  onSave: (title: string, products: DishProduct[]) => void;
  onDelete?: () => void;
};

// Правка блюда: название и продукты (количество, единица, цена). Снятая галочка — продукт не сохраняется.
export function DishForm({ entry, onCancel, onSave, onDelete }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { currency } = useSettings();
  const symbol = currencySymbol(currency);
  const [name, setName] = useState(entry?.name ?? '');
  const [rows, setRows] = useState<EditRow[]>(() => (entry ? entry.rows.map((r) => toEditRow(r.key, r)) : [emptyRow('new-0')]));
  const products = rows.filter((r) => r.on && r.title.trim()).map(toProduct);
  const canSave = name.trim().length > 0 && products.length > 0;

  const patch = (key: string, p: Partial<EditRow>) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const addRow = () => setRows((prev) => (prev.length >= MAX_DISH_PRODUCTS ? prev : [...prev, emptyRow(`new-${prev.length}-${Date.now()}`)]));

  return (
    <>
      <View style={styles.head}>
        <Text style={styles.title}>{t('dish.formTitle')}</Text>
        {onDelete ? (
          <Pressable style={styles.link} onPress={onDelete} accessibilityRole="button">
            <Text style={styles.deleteText}>{t('dish.delete')}</Text>
          </Pressable>
        ) : null}
      </View>
      <FormField label={t('dish.nameLabel')}>
        <TextField value={name} onChangeText={setName} maxLength={60} accessibilityLabel={t('dish.nameLabel')} />
      </FormField>
      <Text style={styles.hint}>{t('dish.ingredients')}</Text>
      {rows.map((r) => (
        <DishProductRow key={r.key} row={r} symbol={symbol} onPatch={(p) => patch(r.key, p)} />
      ))}
      <Pressable style={styles.add} onPress={addRow} accessibilityRole="button">
        <Text style={styles.addText}>{t('dish.addProduct')}</Text>
      </Pressable>
      <View style={styles.buttons}>
        <Pressable style={styles.cancel} onPress={onCancel} accessibilityRole="button">
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </Pressable>
        <View style={styles.save}>
          <PrimaryButton label={t('dish.save')} onPress={() => canSave && onSave(name.trim(), products)} disabled={!canSave} />
        </View>
      </View>
    </>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    title: { color: colors.text, fontSize: 20, fontWeight: '600', flex: 1 },
    link: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 6 },
    deleteText: { color: colors.warn, fontSize: 15, fontWeight: '700' },
    hint: { color: colors.textMuted, fontSize: 14, marginBottom: 6 },
    add: { minHeight: 48, justifyContent: 'center', marginBottom: 6 },
    addText: { color: colors.primaryStrong, fontSize: 16, fontWeight: '700' },
    buttons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    cancel: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 16 },
    cancelText: { color: colors.textMuted, fontSize: 17, fontWeight: '600' },
    save: { flex: 1 },
  });
