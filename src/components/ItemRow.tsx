import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, radius, useTheme } from '@/theme';
import { t } from '@/i18n';
import { Item } from '@/db/items';
import { currencySymbol, formatMoney } from '@/logic/money';
import { useSettings } from '@/AppSettings';
import { itemQtyLabel } from './ItemSheet';
import { SwipeRow } from './SwipeRow';

type Props = {
  item: Item;
  onToggle: (item: Item) => void; // галочка или смахивание вправо
  onRemove: (item: Item) => void; // смахивание влево
  onOpen: (item: Item) => void;
  onEditQty: (item: Item) => void; // нажатие на количество и цену справа
  onSwiped: () => void; // пользователь воспользовался смахиванием (для подсказки)
};

// Строка товара: галочка, название, заметка, количество; смахивание вправо — куплено/вернуть, влево — удалить.
export function ItemRow({ item, onToggle, onRemove, onOpen, onEditQty, onSwiped }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const done = item.boughtAt !== null;
  const { currency } = useSettings();
  const qty = [itemQtyLabel(item), item.price === null ? '' : formatMoney(item.price, currencySymbol(currency))].filter(Boolean).join(' · ');
  return (
    <SwipeRow
      right={{ label: done ? t('list.swipeBack') : t('list.swipeBought'), icon: done ? 'arrow-undo' : 'checkmark', bg: colors.primary, fg: colors.onPrimary }}
      left={{ label: t('list.swipeDelete'), icon: 'trash-outline', bg: colors.warn, fg: colors.onWarn }}
      onSwipeRight={() => {
        onSwiped();
        onToggle(item);
      }}
      onSwipeLeft={() => {
        onSwiped();
        onRemove(item);
      }}
    >
      <Pressable style={styles.row} onPress={() => onOpen(item)} accessibilityRole="button" accessibilityLabel={`${item.title} ${qty}`}>
        <Pressable
          style={styles.checkHit}
          onPress={() => onToggle(item)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={done ? t('a11y.uncheckItem') : t('a11y.checkItem')}
        >
          <View style={[styles.check, done && styles.checkDone]}>{done ? <Ionicons name="checkmark" size={16} color={colors.onPrimary} /> : null}</View>
        </Pressable>
        <View style={styles.body}>
          <Text style={[styles.title, done && styles.done]} numberOfLines={2}>{item.title}</Text>
          {item.note ? <Text style={styles.note} numberOfLines={1}>{item.note}</Text> : null}
        </View>
        <Pressable
          style={[styles.qtyHit, qty !== '' && styles.qtyHas]}
          onPress={() => onEditQty(item)}
          accessibilityRole="button"
          accessibilityLabel={`${t('qty.title')}: ${qty || t('list.addPrice')}`}
        >
          <Text style={[styles.qty, qty === '' && styles.qtyEmpty]}>{qty || t('list.addPrice')}</Text>
        </Pressable>
      </Pressable>
    </SwipeRow>
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
    },
    checkHit: { width: 52, height: 56, alignItems: 'center', justifyContent: 'center' },
    check: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: colors.outline, alignItems: 'center', justifyContent: 'center' },
    checkDone: { backgroundColor: colors.primary, borderColor: colors.primary },
    body: { flex: 1, paddingVertical: 8 },
    title: { color: colors.text, fontSize: 17 },
    done: { color: colors.textMuted, textDecorationLine: 'line-through' },
    note: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
    qtyHit: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 10, marginLeft: 6, borderRadius: 10 },
    qtyHas: { backgroundColor: colors.cardStrong, borderBottomWidth: 2, borderBottomColor: colors.primary },
    qty: { color: colors.textMuted, fontSize: 15 },
    qtyEmpty: { fontSize: 13 },
  });
