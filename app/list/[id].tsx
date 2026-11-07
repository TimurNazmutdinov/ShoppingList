import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Palette, listColor, radius, useTheme } from '@/theme';
import { getLanguage, t } from '@/i18n';
import { useSettings } from '@/AppSettings';
import { useKeyboardOverlap } from '@/useKeyboard';
import {
  Category, HistoryRow, Item, ItemPatch, NO_QTY, QuickQty, ShoppingList, addFromText, addMany, createCategory, isFlagSet, loadCategories, loadItems,
  loadList, removeItem, restoreItem, saveItem, setFlag, suggestAll, toggleBought,
} from '@/logic/shopping';
import { categoryName, groupByCategory } from '@/logic/categories';
import { currencySymbol, formatMoney, listTotals } from '@/logic/money';
import { AddBar } from '@/components/AddBar';
import { DishSheet } from '@/components/DishSheet';
import { dishRows } from '@/logic/dishes';
import { ItemRow } from '@/components/ItemRow';
import { ItemSheet } from '@/components/ItemSheet';
import { QtySheet } from '@/components/QtySheet';
import { Toast } from '@/components/Toast';

const TOAST_MS = 6000;
const HINT_FLAG = 'swipeHintDone';

type ToastState = { text: string; action: () => void };
type Section = { key: string; kind: 'cat' | 'bought'; category: Category | null; data: Item[] };

export default function ListScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardOverlap();
  const { rememberItems, currency } = useSettings();
  const { id } = useLocalSearchParams<{ id: string }>();
  const listId = Number(id);

  const [list, setList] = useState<ShoppingList | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [text, setText] = useState('');
  const [quick, setQuick] = useState<QuickQty>(NO_QTY);
  const [qtyOpen, setQtyOpen] = useState(false);
  const [dishOpen, setDishOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<HistoryRow[]>([]);
  const [editing, setEditing] = useState<Item | null>(null);
  const [showBought, setShowBought] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [hintDone, setHintDone] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    setList(await loadList(listId));
    setItems(await loadItems(listId));
    setCategories(await loadCategories());
  }, [listId]);

  useFocusEffect(
    useCallback(() => {
      reload().catch((e) => console.warn(e));
      isFlagSet(HINT_FLAG).then(setHintDone).catch(() => {});
    }, [reload]),
  );

  useEffect(() => {
    if (!text.trim()) return;
    let cancelled = false;
    suggestAll(text, rememberItems)
      .then((rows) => !cancelled && setSuggestions(rows))
      .catch((e) => console.warn(e));
    return () => {
      cancelled = true;
    };
  }, [text, rememberItems]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const shownSuggestions = text.trim() ? suggestions : [];
  const toBuy = items.filter((i) => i.boughtAt === null);
  const bought = items.filter((i) => i.boughtAt !== null).sort((a, b) => (b.boughtAt ?? '').localeCompare(a.boughtAt ?? ''));
  const groups = groupByCategory(toBuy, categories);
  const sections: Section[] = [
    ...groups.map((g): Section => ({ key: `c${g.category?.id ?? 0}`, kind: 'cat', category: g.category, data: g.items })),
    { key: 'bought', kind: 'bought', category: null, data: showBought ? bought : [] },
  ];

  const say = (message: string, action: () => void) => {
    setToast({ text: message, action });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  };

  const markHintDone = () => {
    if (hintDone) return;
    setHintDone(true);
    setFlag(HINT_FLAG).catch(() => {});
  };

  const add = async (title: string, preset?: HistoryRow) => {
    await addFromText(listId, title, { remember: rememberItems, preset, quick });
    setText('');
    setQuick(NO_QTY);
    await reload();
  };

  // Покупка и возврат: сообщение говорит, что произошло, и даёт отменить.
  const toggle = async (item: Item) => {
    const nowBought = await toggleBought(item, rememberItems);
    await reload();
    say(nowBought ? t('toast.bought', { title: item.title }) : t('toast.restored', { title: item.title }), () => {
      toggleBought({ ...item, boughtAt: nowBought ? new Date().toISOString() : null }, false)
        .then(reload)
        .catch((e) => console.warn(e));
      setToast(null);
    });
  };

  const remove = async (item: Item) => {
    await removeItem(item);
    setEditing(null);
    await reload();
    say(t('toast.deleted', { title: item.title }), () => {
      restoreItem(item)
        .then(reload)
        .catch((e) => console.warn(e));
      setToast(null);
    });
  };

  const renderRow = ({ item }: { item: Item }) => (
    <ItemRow
      item={item}
      onToggle={(it) => toggle(it).catch((e) => console.warn(e))}
      onRemove={(it) => remove(it).catch((e) => console.warn(e))}
      onOpen={setEditing}
      onSwiped={markHintDone}
    />
  );

  const totals = listTotals(items);
  const sym = currencySymbol(currency);
  const header = (
    <View>
      {totals.priced ? (
        <Text style={styles.totals}>
          {t('list.totals', { bought: formatMoney(totals.bought, sym), left: formatMoney(totals.left, sym), total: formatMoney(totals.total, sym) })}
        </Text>
      ) : null}
      {items.length === 0 ? <Text style={styles.empty}>{t('list.empty')}</Text> : null}
      {!hintDone && toBuy.length > 0 ? (
        <View style={styles.hint} accessible accessibilityLabel={`${t('swipe.hintLeft')} / ${t('swipe.hintRight')}`}>
          <Ionicons name="arrow-back" size={14} color={colors.textMuted} />
          <Text style={styles.hintText}>{t('swipe.hintLeft')}</Text>
          <View style={styles.hintGap} />
          <Text style={styles.hintText}>{t('swipe.hintRight')}</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
        </View>
      ) : null}
    </View>
  );

  const bottomPad = keyboard > 0 ? keyboard : insets.bottom;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        {list ? <View style={[styles.dot, { backgroundColor: listColor(list.color, colors.scheme) }]} /> : null}
        <Text style={styles.title} numberOfLines={1}>{list?.title ?? ''}</Text>
        <Pressable style={styles.back} onPress={() => setDishOpen(true)} accessibilityRole="button" accessibilityLabel={t('dish.button')}>
          <Ionicons name="restaurant-outline" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      <SectionList
        style={styles.scroll}
        sections={sections}
        keyExtractor={(i) => String(i.id)}
        renderItem={renderRow}
        renderSectionHeader={({ section }) => {
          if (section.kind === 'bought') {
            return bought.length > 0 ? (
              <Pressable style={styles.boughtHeader} onPress={() => setShowBought((v) => !v)} accessibilityRole="button">
                <Ionicons name={showBought ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textMuted} />
                <Text style={styles.boughtTitle}>{t('list.bought', { n: bought.length })}</Text>
              </Pressable>
            ) : null;
          }
          if (!section.category && groups.length === 1) return null;
          return (
            <View style={styles.catHeader}>
              <View style={[styles.catDot, { backgroundColor: section.category ? listColor(section.category.color, colors.scheme) : colors.outline }]} />
              <Text style={styles.catTitle}>{(section.category ? categoryName(section.category) : t('cat.none')).toUpperCase()}</Text>
            </View>
          );
        }}
        ListHeaderComponent={header}
        ListFooterComponent={<View style={{ height: 24 }} />}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />

      {toast ? <Toast text={toast.text} actionLabel={t('list.undo')} onAction={toast.action} /> : null}

      <AddBar
        text={text}
        onChangeText={setText}
        suggestions={shownSuggestions}
        quick={quick}
        bottomPad={bottomPad}
        onAdd={(title, preset) => add(title, preset).catch((e) => console.warn(e))}
        onQtyPress={() => setQtyOpen(true)}
      />

      <DishSheet
        visible={dishOpen}
        categories={categories}
        rowsFor={(dish) => dishRows(dish, getLanguage(), categories)}
        onClose={() => setDishOpen(false)}
        onAdd={(chosen) => {
          setDishOpen(false);
          addMany(listId, chosen, rememberItems)
            .then(reload)
            .catch((e) => console.warn(e));
        }}
      />
      <QtySheet
        visible={qtyOpen}
        value={quick}
        onClose={() => setQtyOpen(false)}
        onChange={(v) => {
          setQuick(v);
          setQtyOpen(false);
        }}
      />
      <ItemSheet
        item={editing}
        categories={categories}
        onClose={() => setEditing(null)}
        onCreateCategory={async (title) => {
          const newId = await createCategory(title);
          setCategories(await loadCategories());
          return newId;
        }}
        onSave={(itemId, patch: ItemPatch) => {
          saveItem(itemId, patch, rememberItems)
            .then(reload)
            .catch((e) => console.warn(e));
          setEditing(null);
        }}
        onDelete={(item) => remove(item).catch((e) => console.warn(e))}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8 },
    back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    dot: { width: 14, height: 14, borderRadius: 7 },
    title: { color: colors.text, fontSize: 24, fontWeight: '700', flex: 1 },
    scroll: { flex: 1, paddingHorizontal: 16 },
    totals: { color: colors.textMuted, fontSize: 13, marginBottom: 8 },
    empty: { color: colors.textMuted, fontSize: 15, marginTop: 24 },
    hint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, paddingHorizontal: 12, minHeight: 32, borderRadius: 16, backgroundColor: colors.cardStrong },
    hintText: { color: colors.text, fontSize: 13, fontWeight: '600' },
    hintGap: { flex: 1 },
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
    catHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 6, paddingHorizontal: 2 },
    catDot: { width: 10, height: 10, borderRadius: 5 },
    catTitle: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
    boughtHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, marginTop: 8 },
    boughtTitle: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
    input: {
      flex: 1,
      minHeight: 48,
      color: colors.text,
      fontSize: 17,
      borderWidth: 1,
      borderColor: colors.outline,
      borderRadius: 24,
      paddingHorizontal: 16,
      backgroundColor: colors.bg,
    },
    qtyBtn: {
      minWidth: 48,
      height: 48,
      maxWidth: 88,
      paddingHorizontal: 10,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.outline,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
