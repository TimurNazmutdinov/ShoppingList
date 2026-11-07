import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, listColor, radius, useTheme } from '@/theme';
import { t } from '@/i18n';
import { ScheduledItem } from '@/db/schedule';
import { itemQtyLabel } from './ItemSheet';
import { FRAME_PAD, FRAME_WIDTH } from './groupFrame';

type Props = { item: ScheduledItem; last: boolean; onToggle: (item: ScheduledItem) => void; onOpen: (item: ScheduledItem) => void };

// Строка товара на экранах «Сегодня» и «Календарь»: галочка, название, количество. Бока рамки списка; заголовок и низ рисуют свои компоненты.
export function ScheduledRow({ item, last, onToggle, onOpen }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const done = item.boughtAt !== null;
  const qty = itemQtyLabel(item);
  return (
    <View style={[styles.side, { borderColor: listColor(item.listColor, colors.scheme) }]}>
      <Pressable
        style={[styles.row, last && styles.rowLast]}
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
        <Text style={[styles.title, done && styles.done]} numberOfLines={2}>{item.title}</Text>
        {qty ? <Text style={styles.qty}>{qty}</Text> : null}
      </Pressable>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    side: { paddingHorizontal: FRAME_PAD, borderLeftWidth: FRAME_WIDTH, borderRightWidth: FRAME_WIDTH },
    rowLast: { marginBottom: 0 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 52,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radius.card,
      paddingRight: 14,
      marginBottom: 5,
    },
    checkHit: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
    check: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: colors.outline, alignItems: 'center', justifyContent: 'center' },
    checkDone: { backgroundColor: colors.primaryStrong, borderColor: colors.primaryStrong },
    title: { flex: 1, color: colors.text, fontSize: 17, paddingVertical: 8 },
    done: { color: colors.textMuted, textDecorationLine: 'line-through' },
    qty: { color: colors.textMuted, fontSize: 15, marginLeft: 10 },
  });
