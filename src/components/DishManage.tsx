import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, useTheme } from '@/theme';
import { t } from '@/i18n';
import { DishEntry, hiddenBuiltinCount } from '@/logic/userDishes';

type Props = {
  entries: DishEntry[];
  onDone: () => void;
  onEdit: (entry: DishEntry) => void;
  onDelete: (entry: DishEntry) => void;
  onNew: () => void;
  onRestore: () => void;
};

// Режим «Изменить» в окне блюд: правка и удаление, новое блюдо, возврат скрытых стандартных.
export function DishManage({ entries, onDone, onEdit, onDelete, onNew, onRestore }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const hidden = hiddenBuiltinCount(entries);
  return (
    <>
      <View style={styles.head}>
        <Text style={styles.title}>{t('dish.manageTitle')}</Text>
        <Pressable style={styles.link} onPress={onDone} accessibilityRole="button">
          <Text style={styles.linkText}>{t('dish.done')}</Text>
        </Pressable>
      </View>
      {entries.map((e) => (
        <View key={e.key} style={styles.row}>
          <View style={styles.nameBox}>
            <Text style={styles.name} numberOfLines={1}>{e.name}</Text>
            <Text style={styles.sub}>{`${t(e.kind === 'own' ? 'dish.mine' : 'dish.builtin')} · ${t('dish.productsN', { n: e.rows.length })}`}</Text>
          </View>
          <Pressable style={styles.act} onPress={() => onEdit(e)} accessibilityRole="button" accessibilityLabel={t('dish.editRow', { title: e.name })}>
            <Ionicons name="create-outline" size={22} color={colors.textMuted} />
          </Pressable>
          <Pressable style={styles.act} onPress={() => onDelete(e)} accessibilityRole="button" accessibilityLabel={t('dish.deleteRow', { title: e.name })}>
            <Ionicons name="trash-outline" size={22} color={colors.warn} />
          </Pressable>
        </View>
      ))}
      <Pressable style={styles.action} onPress={onNew} accessibilityRole="button">
        <Text style={styles.actionText}>{t('dish.new')}</Text>
      </Pressable>
      {hidden > 0 ? (
        <Pressable style={styles.action} onPress={onRestore} accessibilityRole="button">
          <Text style={styles.restoreText}>{t('dish.restore')}</Text>
        </Pressable>
      ) : null}
    </>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    title: { color: colors.text, fontSize: 20, fontWeight: '600', flex: 1 },
    link: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 6 },
    linkText: { color: colors.primaryStrong, fontSize: 15, fontWeight: '700' },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
    nameBox: { flex: 1, paddingVertical: 6 },
    name: { color: colors.text, fontSize: 17 },
    sub: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
    act: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    action: { minHeight: 48, justifyContent: 'center' },
    actionText: { color: colors.primaryStrong, fontSize: 15, fontWeight: '700' },
    restoreText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  });
