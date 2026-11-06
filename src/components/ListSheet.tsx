import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DEFAULT_LIST_COLOR, ListColorKey, Palette, listColor, listColorDefs, useTheme } from '@/theme';
import { t } from '@/i18n';
import { useSettings } from '@/AppSettings';
import { ShoppingList } from '@/db/lists';
import { BottomSheet } from './BottomSheet';
import { DateField } from './DateField';
import { FormField, TextField } from './FormField';
import { PrimaryButton } from './PrimaryButton';

type Props = {
  visible: boolean;
  list: ShoppingList | null; // null — создание нового
  onClose: () => void;
  onSave: (title: string, color: ListColorKey, plannedDate: string | null, remind: boolean) => void;
  onDelete: (list: ShoppingList) => void;
};

// Создание и правка списка: название и цвет.
export function ListSheet({ visible, list, onClose, onSave, onDelete }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ListForm list={list} onSave={onSave} onDelete={onDelete} />
    </BottomSheet>
  );
}

function ListForm({ list, onSave, onDelete }: Pick<Props, 'list' | 'onSave' | 'onDelete'>) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { language } = useSettings();
  const [title, setTitle] = useState(list?.title ?? '');
  const [color, setColor] = useState<ListColorKey>((list?.color as ListColorKey) ?? DEFAULT_LIST_COLOR);
  const [date, setDate] = useState<string | null>(list?.plannedDate ?? null);
  const [remind, setRemind] = useState(list?.remind ?? false);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (!title.trim()) {
      setError(t('validation.titleRequired'));
      return;
    }
    onSave(title, color, date, remind && date !== null);
  };

  return (
    <>
      <Text style={styles.title}>{list ? t('lists.edit') : t('lists.new')}</Text>
      <FormField label={t('lists.titleLabel')} error={error}>
        <TextField value={title} onChangeText={setTitle} placeholder={t('lists.titlePlaceholder')} maxLength={40} autoFocus={!list} />
      </FormField>
      <Text style={styles.label}>{t('lists.colorLabel')}</Text>
      <View style={styles.colors}>
        {listColorDefs.map((c) => {
          const active = c.key === color;
          const name = c.name[language];
          return (
            <Pressable
              key={c.key}
              style={[styles.dot, { backgroundColor: listColor(c.key, colors.scheme) }, active && styles.dotActive]}
              onPress={() => setColor(c.key)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t('a11y.pickColor', { name })}
            >
              {active ? <Ionicons name="checkmark" size={22} color={colors.bg} /> : null}
            </Pressable>
          );
        })}
      </View>
      <DateField date={date} remind={remind} onChange={(d, r) => { setDate(d); setRemind(r); }} />
      <View style={styles.buttons}>
        {list ? (
          <Pressable style={styles.delete} onPress={() => onDelete(list)} accessibilityRole="button" accessibilityLabel={t('common.delete')}>
            <Text style={styles.deleteText}>{t('common.delete')}</Text>
          </Pressable>
        ) : null}
        <View style={styles.save}>
          <PrimaryButton label={t('common.save')} onPress={save} />
        </View>
      </View>
    </>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    title: { color: colors.text, fontSize: 20, fontWeight: '600', marginBottom: 8 },
    label: { color: colors.textMuted, fontSize: 14, marginBottom: 8 },
    colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
    dot: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    dotActive: { borderWidth: 3, borderColor: colors.text },
    buttons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    delete: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 16 },
    deleteText: { color: colors.warn, fontSize: 17, fontWeight: '600' },
    save: { flex: 1 },
  });
