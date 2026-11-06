import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, listColor, radius, useTheme } from '@/theme';
import { t } from '@/i18n';
import { ScheduledItem } from '@/db/schedule';
import { itemQtyLabel } from './ItemSheet';

type Props = { item: ScheduledItem; onToggle: (item: ScheduledItem) => void; onOpen: (item: ScheduledItem) => void };

// Строка товара на экранах «Сегодня» и «Календарь»: галочка, название, количество и список.
export function ScheduledRow({ item, onToggle, onOpen }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const done = item.boughtAt !== null;
  const qty = itemQtyLabel(item);
  return (
    <Pressable
      style={styles.row}
      onPress={() => onOpen(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.title} ${qty}. ${t('a11y.openItemList', { title: item.listTitle })}`}
    >
      <Pressable
        style={styles.checkHit}
        onPress={() => onToggle(item)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={done ? t('a11y.uncheckItem') : t('a11y.checkItem')}
      >
        <View style={[styles.check, done && styles.checkDone]}>{done ? <Ionicons name="checkmark" size={16} color={colors.bg} /> : null}</View>
      </Pressable>
      <View style={styles.body}>
        <Text style={[styles.title, done && styles.done]} numberOfLines={1}>{item.title}</Text>
        <View style={styles.listRow}>
          <View style={[styles.dot, { backgroundColor: listColor(item.listColor, colors.scheme) }]} />
          <Text style={styles.listName} numberOfLines={1}>{item.listTitle}</Text>
        </View>
      </View>
      {qty ? <Text style={styles.qty}>{qty}</Text> : null}
    </Pressable>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 56,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radius.card,
      paddingRight: 14,
      marginBottom: 6,
    },
    checkHit: { width: 52, height: 56, alignItems: 'center', justifyContent: 'center' },
    check: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: colors.outline, alignItems: 'center', justifyContent: 'center' },
    checkDone: { backgroundColor: colors.primaryStrong, borderColor: colors.primaryStrong },
    body: { flex: 1, paddingVertical: 8 },
    title: { color: colors.text, fontSize: 17 },
    done: { color: colors.textMuted, textDecorationLine: 'line-through' },
    listRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    listName: { color: colors.textMuted, fontSize: 13, flexShrink: 1 },
    qty: { color: colors.textMuted, fontSize: 15, marginLeft: 10 },
  });
