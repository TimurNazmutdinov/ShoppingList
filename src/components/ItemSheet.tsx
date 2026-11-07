import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Palette, radius, useTheme } from '@/theme';
import { t } from '@/i18n';
import { Item, ItemPatch } from '@/db/items';
import { Category, categoryName } from '@/logic/categories';
import { UNITS, formatQty, parseQty } from '@/logic/history';
import { currencySymbol, parsePrice } from '@/logic/money';
import { useSettings } from '@/AppSettings';
import { BottomSheet } from './BottomSheet';
import { DateField } from './DateField';
import { FormField, TextField } from './FormField';
import { PrimaryButton } from './PrimaryButton';

type Props = {
  item: Item | null; // null — панель закрыта
  categories: Category[];
  onClose: () => void;
  onSave: (id: number, patch: ItemPatch) => void;
  onDelete: (item: Item) => void;
  onCreateCategory: (title: string) => Promise<number>;
};

// Правка товара: обязательно только название; остальное — по желанию.
export function ItemSheet({ item, categories, onClose, onSave, onDelete, onCreateCategory }: Props) {
  return (
    <BottomSheet visible={item !== null} onClose={onClose}>
      {item ? <ItemForm key={item.id} item={item} categories={categories} onSave={onSave} onDelete={onDelete} onCreateCategory={onCreateCategory} /> : null}
    </BottomSheet>
  );
}

function ItemForm({ item, categories, onSave, onDelete, onCreateCategory }: Omit<Props, 'item' | 'onClose'> & { item: Item }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [title, setTitle] = useState(item.title);
  const [qty, setQty] = useState(item.qty === null ? '' : String(item.qty).replace('.', ','));
  const [unit, setUnit] = useState<string | null>(item.unit);
  const { currency } = useSettings();
  const [price, setPrice] = useState(item.price === null ? '' : String(item.price).replace('.', ','));
  const [note, setNote] = useState(item.note ?? '');
  const [categoryId, setCategoryId] = useState<number | null>(item.categoryId);
  const [date, setDate] = useState<string | null>(item.plannedDate);
  const [remind, setRemind] = useState(item.remind);
  const [adding, setAdding] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (!title.trim()) {
      setError(t('validation.titleRequired'));
      return;
    }
    onSave(item.id, { title, qty: parseQty(qty), unit, price: parsePrice(price), note: note.trim() || null, categoryId, plannedDate: date, remind: remind && date !== null });
  };

  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    setCategoryId(await onCreateCategory(name));
    setNewCategory('');
    setAdding(false);
  };

  const chip = (key: string, label: string, active: boolean, onPress: () => void) => (
    <Pressable
      key={key}
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
      <Text style={styles.title}>{t('item.edit')}</Text>
      <FormField label={t('item.titleLabel')} error={error}>
        <TextField value={title} onChangeText={setTitle} autoCapitalize="sentences" maxLength={80} />
      </FormField>
      <View style={styles.qtyRow}>
        <View style={styles.qtyField}>
          <FormField label={t('item.qtyLabel')}>
            <TextField value={qty} onChangeText={setQty} keyboardType="decimal-pad" maxLength={8} accessibilityLabel={t('item.qtyLabel')} />
          </FormField>
        </View>
        <View style={styles.units}>
          {UNITS.map((u) => chip(u, t(`unitShort.${u}`), unit === u, () => setUnit(unit === u ? null : u)))}
        </View>
      </View>

      <FormField label={t('item.priceLabel', { symbol: currencySymbol(currency) })}>
        <TextField value={price} onChangeText={setPrice} keyboardType="decimal-pad" maxLength={12} accessibilityLabel={t('item.priceLabel', { symbol: currencySymbol(currency) })} />
      </FormField>

      <Text style={styles.label}>{t('item.category')}</Text>
      <View style={styles.chips}>
        {categories.map((c) => chip(String(c.id), categoryName(c), categoryId === c.id, () => setCategoryId(categoryId === c.id ? null : c.id)))}
        {chip('add', `+ ${t('cat.add')}`, adding, () => setAdding((v) => !v))}
      </View>
      {adding ? (
        <View style={styles.addRow}>
          <View style={styles.addInput}>
            <TextField value={newCategory} onChangeText={setNewCategory} placeholder={t('cat.addPlaceholder')} maxLength={30} onSubmitEditing={() => addCategory()} />
          </View>
          <Pressable style={styles.addOk} onPress={() => addCategory()} accessibilityRole="button" accessibilityLabel={t('common.add')}>
            <Text style={styles.addOkText}>{t('common.add')}</Text>
          </Pressable>
        </View>
      ) : null}

      <DateField date={date} remind={remind} onChange={(d, r) => { setDate(d); setRemind(r); }} />
      <FormField label={t('item.noteLabel')}>
        <TextField value={note} onChangeText={setNote} maxLength={200} />
      </FormField>
      <Text style={styles.hint}>{t('item.optionalHint')}</Text>
      <View style={styles.buttons}>
        <Pressable style={styles.delete} onPress={() => onDelete(item)} accessibilityRole="button" accessibilityLabel={t('common.delete')}>
          <Text style={styles.deleteText}>{t('common.delete')}</Text>
        </Pressable>
        <View style={styles.save}>
          <PrimaryButton label={t('common.save')} onPress={save} />
        </View>
      </View>
    </>
  );
}

// Подпись «0,8 кг» для строки списка.
export function itemQtyLabel(item: Pick<Item, 'qty' | 'unit'>): string {
  return formatQty(item.qty, item.unit, (u) => t(`unitShort.${u as (typeof UNITS)[number]}`));
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    title: { color: colors.text, fontSize: 20, fontWeight: '600', marginBottom: 8 },
    label: { color: colors.textMuted, fontSize: 14, marginBottom: 6 },
    qtyRow: { marginBottom: 0 },
    qtyField: { width: 140 },
    units: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    chip: {
      minHeight: 44,
      minWidth: 52,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.button,
      borderWidth: 1,
      borderColor: colors.outline,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.outline },
    chipText: { color: colors.text, fontSize: 15 },
    chipTextActive: { color: colors.onPrimary, fontWeight: '700' },
    addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    addInput: { flex: 1 },
    addOk: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 12 },
    addOkText: { color: colors.primaryStrong, fontSize: 16, fontWeight: '700' },
    hint: { color: colors.textMuted, fontSize: 13, marginBottom: 12 },
    buttons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    delete: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 16 },
    deleteText: { color: colors.warn, fontSize: 17, fontWeight: '600' },
    save: { flex: 1 },
  });
