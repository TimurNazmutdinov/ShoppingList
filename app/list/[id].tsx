import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Palette, listColor, radius, useTheme } from '@/theme';
import { t } from '@/i18n';
import { useSettings } from '@/AppSettings';
import { useKeyboardOverlap } from '@/useKeyboard';
import {
  Category, HistoryRow, Item, ItemPatch, NO_QTY, QuickQty, ShoppingList, addFromText, addMany, createCategory, isFlagSet, loadBuyAgain, loadCategories, loadItems,
  loadList, rememberLastList, removeItem, restoreItem, saveItem, setFlag, setItemQtyPrice, suggestAll, toggleBought,
} from '@/logic/shopping';
import { bulkPreview, priceMarkers } from '@/logic/bulk';
import { categoryName, groupByCategory } from '@/logic/categories';
import { currencySymbol, formatMoney, listTotals } from '@/logic/money';
import { budgetStatus } from '@/logic/budget';
import { BUY_AGAIN_EMPTY, BUY_AGAIN_ROW } from '@/logic/buyAgain';
import { AddBar } from '@/components/AddBar';
import { BuyAgainBlock } from '@/components/BuyAgainBlock';
import { DishButton } from '@/components/DishButton';
import { DishSheet } from '@/components/DishSheet';
import { ItemRow } from '@/components/ItemRow';
import { ItemSheet } from '@/components/ItemSheet';
import { QtySheet } from '@/components/QtySheet';
import { QuickHelpSheet } from '@/components/QuickHelpSheet';
import { ShopButton } from '@/components/ShopButton';
import { ShopMode } from '@/components/ShopMode';
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
  const { id, focus } = useLocalSearchParams<{ id: string; focus?: string }>(); // focus=1 — пришли с ярлыка «Добавить товар»
  const listId = Number(id);

  const [list, setList] = useState<ShoppingList | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [text, setText] = useState('');
  const [quick, setQuick] = useState<QuickQty>(NO_QTY);
  const [qtyOpen, setQtyOpen] = useState(false);
  const [dishOpen, setDishOpen] = useState(false);
  const [shop, setShop] = useState(false); // режим «В магазине»: не запоминается, при открытии списка всегда выключен
  const [suggestions, setSuggestions] = useState<HistoryRow[]>([]);
  const [again, setAgain] = useState<HistoryRow[]>([]); // «Купить снова» / «Часто:»
  const [editing, setEditing] = useState<Item | null>(null);
  const [showBought, setShowBought] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [hintDone, setHintDone] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [qtyItem, setQtyItem] = useState<Item | null>(null); // товар, у которого правят количество и цену
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sym = currencySymbol(currency);

  const reload = useCallback(async () => {
    setList(await loadList(listId));
    setItems(await loadItems(listId));
    setCategories(await loadCategories());
  }, [listId]);

  useFocusEffect(
    useCallback(() => {
      reload().catch((e) => console.warn(e));
      rememberLastList(listId).catch(() => {});
      isFlagSet(HINT_FLAG).then(setHintDone).catch(() => {});
    }, [reload, listId]),
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

  useEffect(() => {
    let cancelled = false;
    loadBuyAgain(items, rememberItems, BUY_AGAIN_ROW)
      .then((rows) => !cancelled && setAgain(rows))
      .catch((e) => console.warn(e));
    return () => {
      cancelled = true;
    };
  }, [items, rememberItems]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const shownSuggestions = text.trim() ? suggestions : [];
  const preview = useMemo(() => bulkPreview(text, priceMarkers(sym)), [text, sym]);
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
    await addFromText(listId, title, { remember: rememberItems, preset, quick, currency: sym });
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
      onEditQty={setQtyItem}
      onSwiped={markHintDone}
    />
  );

  const totals = listTotals(items);
  const bs = budgetStatus(totals.total, list?.budget);
  const header = (
    <View>
      {totals.priced && !bs ? (
        <Text style={styles.totals}>
          {t('list.totals', { bought: formatMoney(totals.bought, sym), left: formatMoney(totals.left, sym), total: formatMoney(totals.total, sym) })}
        </Text>
      ) : null}
      {items.length === 0 ? (
        again.length > 0 ? (
          <BuyAgainBlock rows={again.slice(0, BUY_AGAIN_EMPTY)} onPick={(row) => add(row.title, row).catch((e) => console.warn(e))} />
        ) : (
          <Text style={styles.empty}>{t('list.empty')}</Text>
        )
      ) : null}
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
        <Pressable style={styles.back} onPress={() => setHelpOpen(true)} accessibilityRole="button" accessibilityLabel={t('help.open')}>
          <Ionicons name="help-circle-outline" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.listArea}>
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
          ListFooterComponent={<View style={{ height: 72 }} />}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
        {keyboard === 0 && items.length > 0 ? <ShopButton onPress={() => setShop(true)} /> : null}
        {keyboard === 0 ? <DishButton onPress={() => setDishOpen(true)} /> : null}
      </View>

      {toast ? <Toast text={toast.text} actionLabel={t('list.undo')} onAction={toast.action} /> : null}

      {bs && keyboard === 0 ? (
        <View
          style={[styles.budget, bs.over > 0 && styles.budgetOver]}
          accessible
          accessibilityLabel={`${t('budget.totalLabel')} ${formatMoney(bs.total, sym)}, ${t('budget.of', { budget: formatMoney(bs.budget, sym) })}. ${
            bs.over > 0 ? t('budget.over', { over: formatMoney(bs.over, sym) }) : t('budget.leftIn', { left: formatMoney(bs.left, sym) })
          }`}
        >
          <View style={styles.budgetRow}>
            <Text style={styles.budgetText}>
              {t('budget.totalLabel')} <Text style={styles.budgetStrong}>{formatMoney(bs.total, sym)}</Text>
            </Text>
            <Text style={styles.budgetMuted}>{t('budget.of', { budget: formatMoney(bs.budget, sym) })}</Text>
          </View>
          <View style={styles.budgetTrack}>
            <View style={[styles.budgetFill, { width: `${Math.round(bs.ratio * 100)}%`, backgroundColor: bs.over > 0 ? colors.warn : colors.primaryStrong }]} />
          </View>
          <Text style={[styles.budgetNote, bs.over > 0 && styles.budgetNoteOver]}>
            {bs.over > 0 ? t('budget.over', { over: formatMoney(bs.over, sym) }) : t('budget.leftIn', { left: formatMoney(bs.left, sym) })}
          </Text>
        </View>
      ) : null}

      <AddBar
        text={text}
        onChangeText={setText}
        suggestions={shownSuggestions}
        frequent={again}
        autoFocus={focus === '1'}
        quick={quick}
        symbol={sym}
        preview={preview}
        bottomPad={bottomPad}
        onAdd={(title, preset) => add(title, preset).catch((e) => console.warn(e))}
        onQtyPress={() => setQtyOpen(true)}
        onTipMore={() => setHelpOpen(true)}
      />
      <QuickHelpSheet visible={helpOpen} onClose={() => setHelpOpen(false)} />
      {qtyItem ? (
        <QtySheet
          key={qtyItem.id}
          visible
          value={{ qty: qtyItem.qty, unit: qtyItem.unit, price: qtyItem.price }}
          onClose={() => setQtyItem(null)}
          onChange={(v) => {
            const target = qtyItem;
            setQtyItem(null);
            setItemQtyPrice(target, v, rememberItems)
              .then(reload)
              .catch((e) => console.warn(e));
          }}
        />
      ) : null}

      <DishSheet
        visible={dishOpen}
        categories={categories}
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

      {shop ? (
        <ShopMode
          title={list?.title ?? ''}
          items={items}
          categories={categories}
          symbol={sym}
          bottomPad={bottomPad}
          onToggle={(item) => {
            toggleBought(item, rememberItems)
              .then(reload)
              .catch((e) => console.warn(e));
          }}
          onAdd={(title) => {
            addFromText(listId, title, { remember: rememberItems, currency: sym })
              .then(reload)
              .catch((e) => console.warn(e));
          }}
          onClose={() => setShop(false)}
        />
      ) : null}
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
    listArea: { flex: 1 },
    scroll: { flex: 1, paddingHorizontal: 16 },
    totals: { color: colors.textMuted, fontSize: 13, marginBottom: 8 },
    budget: { marginHorizontal: 12, marginBottom: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
    budgetOver: { borderColor: colors.warn },
    budgetRow: { flexDirection: 'row', justifyContent: 'space-between' },
    budgetText: { color: colors.text, fontSize: 15 },
    budgetStrong: { fontWeight: '700' },
    budgetMuted: { color: colors.textMuted, fontSize: 15 },
    budgetTrack: { height: 8, borderRadius: 4, backgroundColor: colors.track, marginTop: 8, overflow: 'hidden' },
    budgetFill: { height: 8, borderRadius: 4 },
    budgetNote: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
    budgetNoteOver: { color: colors.warn, fontWeight: '700' },
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
