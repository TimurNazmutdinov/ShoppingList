import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, useTheme } from '@/theme';
import { t } from '@/i18n';
import { Item, ShoppingList } from '@/logic/shopping';
import { CopyMode, copyTitle, selectForCopy } from '@/logic/copy';
import { BottomSheet } from './BottomSheet';
import { DateField } from './DateField';
import { FormField, TextField } from './FormField';
import { PrimaryButton } from './PrimaryButton';

type CopyResult = { title: string; plannedDate: string | null; remind: boolean; itemIds: number[] };
type Props = {
  list: ShoppingList | null; // null — панель закрыта
  items: Item[];
  onClose: () => void;
  onCopy: (source: ShoppingList, result: CopyResult) => void;
};

// Копия списка: можно поправить название, дату покупки, напоминание и состав.
export function CopySheet({ list, items, onClose, onCopy }: Props) {
  return (
    <BottomSheet visible={list !== null} onClose={onClose}>
      {list ? <CopyForm key={list.id} list={list} items={items} onCopy={onCopy} /> : null}
    </BottomSheet>
  );
}

function CopyForm({ list, items, onCopy }: { list: ShoppingList; items: Item[]; onCopy: Props['onCopy'] }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [title, setTitle] = useState(copyTitle(list.title, t('copy.suffix')));
  const [date, setDate] = useState<string | null>(list.plannedDate);
  const [remind, setRemind] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(() => new Set(selectForCopy(items, 'all')));
  const [error, setError] = useState<string | null>(null);

  const setMode = (mode: CopyMode) => setSelected(new Set(selectForCopy(items, mode)));
  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const create = () => {
    if (!title.trim()) {
      setError(t('validation.titleRequired'));
      return;
    }
    onCopy(list, { title, plannedDate: date, remind: remind && date !== null, itemIds: items.filter((i) => selected.has(i.id)).map((i) => i.id) });
  };

  return (
    <>
      <Text style={styles.title}>{t('copy.title')}</Text>
      <FormField label={t('copy.name')} error={error}>
        <TextField value={title} onChangeText={setTitle} maxLength={40} />
      </FormField>

      <DateField date={date} remind={remind} onChange={(d, r) => { setDate(d); setRemind(r); }} />

      <View style={styles.composeHead}>
        <Text style={styles.label}>{t('copy.compose')} · {t('copy.count', { n: selected.size })}</Text>
        <View style={styles.modes}>
          {(['all', 'unbought', 'none'] as const).map((m) => (
            <Pressable key={m} style={styles.mode} onPress={() => setMode(m)} accessibilityRole="button">
              <Text style={styles.modeText}>{t(`copy.${m}`)}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.items}>
        {items.map((i) => {
          const on = selected.has(i.id);
          return (
            <Pressable key={i.id} style={styles.item} onPress={() => toggle(i.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={i.title}>
              <View style={[styles.box, on && styles.boxOn]}>{on ? <Ionicons name="checkmark" size={16} color={colors.bg} /> : null}</View>
              <Text style={[styles.itemText, i.boughtAt !== null && styles.itemBought]} numberOfLines={1}>{i.title}</Text>
            </Pressable>
          );
        })}
      </View>
      <PrimaryButton label={t('copy.create')} onPress={create} />
    </>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    title: { color: colors.text, fontSize: 20, fontWeight: '600', marginBottom: 8 },
    label: { color: colors.textMuted, fontSize: 14 },
    composeHead: { marginTop: 8, marginBottom: 4 },
    modes: { flexDirection: 'row', gap: 8, marginTop: 6 },
    mode: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.outline },
    modeText: { color: colors.text, fontSize: 14 },
    items: { marginBottom: 12 },
    item: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
    box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.outline, alignItems: 'center', justifyContent: 'center' },
    boxOn: { backgroundColor: colors.primaryStrong, borderColor: colors.primaryStrong },
    itemText: { flex: 1, color: colors.text, fontSize: 16 },
    itemBought: { color: colors.textMuted, textDecorationLine: 'line-through' },
  });
