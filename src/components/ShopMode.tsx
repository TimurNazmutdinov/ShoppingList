import { useEffect, useMemo, useState } from 'react';
import { BackHandler, Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { Palette, listColor, useTheme } from '@/theme';
import { t, tn } from '@/i18n';
import { Item } from '@/db/items';
import { Category, categoryName, groupByCategory } from '@/logic/categories';
import { formatMoney } from '@/logic/money';
import { shopProgress } from '@/logic/shopMode';
import { PrimaryButton } from './PrimaryButton';
import { itemQtyLabel } from './ItemSheet';

type Props = {
  title: string;
  items: Item[];
  categories: Category[];
  symbol: string;
  bottomPad: number; // высота клавиатуры или системной панели
  onToggle: (item: Item) => void;
  onAdd: (title: string) => void;
  onClose: () => void;
};

type Section = { key: string; kind: 'cat' | 'bought'; category: Category | null; data: Item[] };

// Режим «В магазине»: крупные строки, нажатие на товар — «куплено». Экран не гаснет, пока режим открыт; режим не запоминается.
export function ShopMode({ title, items, categories, symbol, bottomPad, onToggle, onAdd, onClose }: Props) {
  useKeepAwake();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showBought, setShowBought] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  const progress = shopProgress(items);
  const toBuy = items.filter((i) => i.boughtAt === null);
  const bought = items.filter((i) => i.boughtAt !== null);
  const sections: Section[] = [
    ...groupByCategory(toBuy, categories).map((g): Section => ({ key: `c${g.category?.id ?? 0}`, kind: 'cat', category: g.category, data: g.items })),
    { key: 'bought', kind: 'bought', category: null, data: showBought ? bought : [] },
  ];

  const add = () => {
    if (!text.trim()) return;
    onAdd(text);
    setText('');
  };

  const renderItem = ({ item }: { item: Item }) => {
    const done = item.boughtAt !== null;
    const qty = itemQtyLabel(item);
    return (
      <Pressable
        style={styles.row}
        onPress={() => onToggle(item)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`${item.title} ${qty}`.trim()}
      >
        <View style={[styles.check, done && styles.checkDone]}>{done ? <Ionicons name="checkmark" size={22} color={colors.onPrimary} /> : null}</View>
        <Text style={[styles.itemTitle, done && styles.itemDone]} numberOfLines={2}>{item.title}</Text>
        {qty ? <Text style={styles.qty}>{qty}</Text> : null}
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable style={styles.close} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('shop.close')}>
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>

      {progress.done ? (
        <View style={styles.doneBox}>
          <View style={styles.doneIcon}>
            <Ionicons name="checkmark" size={44} color={colors.onPrimary} />
          </View>
          <Text style={styles.doneTitle} accessibilityRole="header">{t('shop.done')}</Text>
          <Text style={styles.doneSum}>{[tn('unit.item', progress.total), progress.sum > 0 ? formatMoney(progress.sum, symbol) : ''].filter(Boolean).join(' · ')}</Text>
          <View style={styles.doneButton}>
            <PrimaryButton label={t('shop.finish')} onPress={onClose} />
          </View>
        </View>
      ) : (
        <>
          <View style={styles.progress}>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>{t('shop.left', { left: progress.left, total: progress.total })}</Text>
              {progress.leftPrice > 0 ? <Text style={styles.progressPrice}>{t('shop.leftPrice', { sum: formatMoney(progress.leftPrice, symbol) })}</Text> : null}
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(progress.ratio * 100)}%` }]} />
            </View>
          </View>
          <SectionList
            sections={sections}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            renderSectionHeader={({ section }) => {
              if (section.kind === 'bought') {
                if (bought.length === 0) return null;
                return (
                  <Pressable
                    style={styles.boughtHeader}
                    onPress={() => setShowBought((v) => !v)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: showBought }}
                    accessibilityLabel={t('shop.bought', { count: bought.length })}
                  >
                    <Text style={styles.boughtTitle}>{t('shop.bought', { count: bought.length }).toUpperCase()}</Text>
                    <Ionicons name={showBought ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
                  </Pressable>
                );
              }
              return (
                <View style={styles.catHeader}>
                  <View style={[styles.catDot, { backgroundColor: section.category ? listColor(section.category.color, colors.scheme) : colors.outline }]} />
                  <Text style={styles.catTitle}>{(section.category ? categoryName(section.category) : t('cat.none')).toUpperCase()}</Text>
                </View>
              );
            }}
            stickySectionHeadersEnabled={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        </>
      )}

      <View style={[styles.addBar, { paddingBottom: 12 + bottomPad }]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={t('shop.addPlaceholder')}
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          onSubmitEditing={add}
          maxLength={500}
          accessibilityLabel={t('shop.addPlaceholder')}
        />
        <Pressable style={styles.addBtn} onPress={add} accessibilityRole="button" accessibilityLabel={t('a11y.addItem')}>
          <Ionicons name="add" size={28} color={colors.onPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { ...StyleSheet.absoluteFill, backgroundColor: colors.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingTop: 4 },
    close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    title: { flex: 1, color: colors.text, fontSize: 22, fontWeight: '600' },
    progress: { paddingHorizontal: 16, paddingBottom: 8 },
    progressRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
    progressText: { color: colors.text, fontSize: 20, fontWeight: '700' },
    progressPrice: { color: colors.textMuted, fontSize: 16 },
    track: { height: 10, borderRadius: 5, backgroundColor: colors.track, marginTop: 8, overflow: 'hidden' },
    fill: { height: 10, borderRadius: 5, backgroundColor: colors.primary },
    listContent: { paddingHorizontal: 16, paddingBottom: 24 },
    catHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 14, paddingBottom: 6 },
    catDot: { width: 12, height: 12, borderRadius: 6 },
    catTitle: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      height: 64,
      paddingHorizontal: 14,
      marginBottom: 8,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    check: { width: 32, height: 32, borderRadius: 9, borderWidth: 3, borderColor: colors.outline, alignItems: 'center', justifyContent: 'center' },
    checkDone: { backgroundColor: colors.primary, borderColor: colors.primary },
    itemTitle: { flex: 1, color: colors.text, fontSize: 20 },
    itemDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
    qty: { color: colors.textMuted, fontSize: 17 },
    boughtHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, paddingTop: 6 },
    boughtTitle: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
    doneBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    doneIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    doneTitle: { color: colors.text, fontSize: 28, fontWeight: '700', marginTop: 16 },
    doneSum: { color: colors.textMuted, fontSize: 18, marginTop: 6 },
    doneButton: { alignSelf: 'stretch', marginTop: 28 },
    addBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingHorizontal: 12, paddingTop: 10 },
    input: { flex: 1, minHeight: 48, color: colors.text, fontSize: 17, borderWidth: 1, borderColor: colors.outline, borderRadius: 24, paddingHorizontal: 16, backgroundColor: colors.bg },
    addBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  });
