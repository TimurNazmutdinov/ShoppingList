import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ListColorKey, Palette, listColor, radius, useTheme } from '@/theme';
import { t } from '@/i18n';
import { Item, ShoppingList, copyList, createList, deleteList, ensureSampleList, loadItems, loadLists, resetBought, updateList } from '@/logic/shopping';
import { cardDateLabel } from '@/logic/schedule';
import { daysLeft } from '@/logic/dates';
import { currencySymbol, formatMoney } from '@/logic/money';
import { useSettings } from '@/AppSettings';
import { ShareKind, shareList } from '@/logic/sharing';
import { ShareSheet } from '@/components/ShareSheet';
import { useImportFlow } from '@/useImportFlow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ListSheet } from '@/components/ListSheet';
import { CopySheet } from '@/components/CopySheet';
import { BottomSheet } from '@/components/BottomSheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export default function ListsScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { currency } = useSettings();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [menu, setMenu] = useState<ShoppingList | null>(null);
  const [edit, setEdit] = useState<{ open: boolean; list: ShoppingList | null }>({ open: false, list: null });
  const [copy, setCopy] = useState<{ list: ShoppingList; items: Item[] } | null>(null);
  const [confirm, setConfirm] = useState<ShoppingList | null>(null);
  const [shareFor, setShareFor] = useState<ShoppingList | null>(null);

  const reload = useCallback(async () => setLists(await loadLists()), []);
  useFocusEffect(
    useCallback(() => {
      ensureSampleList()
        .then(reload)
        .catch((e) => console.warn(e));
    }, [reload]),
  );

  const save = (title: string, color: ListColorKey, plannedDate: string | null, remind: boolean) => {
    const list = edit.list;
    (list ? updateList(list.id, title, color, plannedDate, remind) : createList(title, color, plannedDate, remind).then(() => undefined))
      .then(reload)
      .catch((e) => console.warn(e));
    setEdit({ open: false, list: null });
  };

  const importFlow = useImportFlow(() => {
    reload().catch((e) => console.warn(e));
  });

  const doShare = (list: ShoppingList, kind: ShareKind) => {
    setShareFor(null);
    shareList(list.id, kind, currencySymbol(currency)).catch((e) => {
      console.warn(e);
      Alert.alert(t('share.failed'));
    });
  };

  const open = (list: ShoppingList) => router.push({ pathname: '/list/[id]', params: { id: String(list.id) } } as never);

  const startCopy = (list: ShoppingList) => {
    setMenu(null);
    loadItems(list.id)
      .then((items) => setCopy({ list, items }))
      .catch((e) => console.warn(e));
  };

  const menuRow = (icon: keyof typeof Ionicons.glyphMap, label: string, onPress: () => void, danger = false) => (
    <Pressable style={styles.menuRow} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={22} color={danger ? colors.warn : colors.textMuted} />
      <Text style={[styles.menuText, danger && { color: colors.warn }]}>{label}</Text>
    </Pressable>
  );

  const renderList = ({ item: l }: { item: ShoppingList }) => {
    const color = listColor(l.color, colors.scheme);
    const progress = l.total === 0 ? 0 : (l.total - l.left) / l.total;
    const base = l.total === 0 ? t('lists.noItems') : l.left === 0 ? t('lists.allDone') : t('lists.left', { left: l.left, total: l.total });
    const status = l.leftPrice > 0 ? `${base} · ${formatMoney(l.leftPrice, currencySymbol(currency))}` : base;
    return (
      <Pressable
        style={styles.card}
        onPress={() => open(l)}
        accessibilityRole="button"
        accessibilityLabel={`${t('a11y.openList', { title: l.title })}. ${status}`}
      >
        <View style={styles.cardTop}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={styles.cardTitle} numberOfLines={1}>{l.title}</Text>
          {l.plannedDate ? (
            <View style={styles.dateBadge}>
              <Ionicons name={l.remind ? 'notifications-outline' : 'calendar-outline'} size={14} color={daysLeft(l.plannedDate) < 0 ? colors.warn : colors.textMuted} />
              <Text style={[styles.dateText, daysLeft(l.plannedDate) < 0 && { color: colors.warn }]}>
                {cardDateLabel(l.plannedDate, t('date.today'), t('date.tomorrow'))}
              </Text>
            </View>
          ) : null}
          <Pressable style={styles.menu} onPress={() => setMenu(l)} accessibilityRole="button" accessibilityLabel={t('a11y.listMenu')}>
            <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
        <Text style={styles.status}>{status}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: color }]} />
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader
        title={t('lists.title')}
        right={
          <Pressable style={styles.headerBtn} onPress={importFlow.start} accessibilityRole="button" accessibilityLabel={t('import.button')}>
            <Ionicons name="download-outline" size={24} color={colors.textMuted} />
          </Pressable>
        }
      />
      <FlatList
        data={lists}
        keyExtractor={(l) => String(l.id)}
        renderItem={renderList}
        ListEmptyComponent={<Text style={styles.empty}>{t('lists.empty')}</Text>}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      />

      <Pressable style={styles.fab} onPress={() => setEdit({ open: true, list: null })} accessibilityRole="button" accessibilityLabel={t('a11y.newList')}>
        <Ionicons name="add" size={24} color={colors.onPrimary} />
        <Text style={styles.fabText}>{t('lists.new')}</Text>
      </Pressable>

      <BottomSheet visible={menu !== null} onClose={() => setMenu(null)}>
        {menu ? (
          <>
            <Text style={styles.menuTitle} numberOfLines={1}>{menu.title}</Text>
            {menuRow('create-outline', t('lists.menuEdit'), () => {
              setEdit({ open: true, list: menu });
              setMenu(null);
            })}
            {menuRow('copy-outline', t('lists.menuCopy'), () => startCopy(menu))}
            {menuRow('share-social-outline', t('share.title'), () => {
              setShareFor(menu);
              setMenu(null);
            })}
            {menu.total - menu.left > 0
              ? menuRow('refresh-outline', t('lists.menuReset'), () => {
                  resetBought(menu.id)
                    .then(reload)
                    .catch((e) => console.warn(e));
                  setMenu(null);
                })
              : null}
            {menuRow('trash-outline', t('lists.menuDelete'), () => {
              setConfirm(menu);
              setMenu(null);
            }, true)}
          </>
        ) : null}
      </BottomSheet>

      <ShareSheet list={shareFor} onClose={() => setShareFor(null)} onPick={doShare} />
      {importFlow.dialog}
      <ListSheet
        visible={edit.open}
        list={edit.list}
        onClose={() => setEdit({ open: false, list: null })}
        onSave={save}
        onDelete={(l) => {
          setEdit({ open: false, list: null });
          setConfirm(l);
        }}
      />
      <CopySheet
        list={copy?.list ?? null}
        items={copy?.items ?? []}
        onClose={() => setCopy(null)}
        onCopy={(source, r) => {
          setCopy(null);
          copyList(source.id, r.title, r.plannedDate, r.remind, r.itemIds)
            .then(reload)
            .catch((e) => console.warn(e));
        }}
      />
      <ConfirmDialog
        visible={confirm !== null}
        title={t('lists.deleteTitle')}
        message={confirm ? t('lists.deleteMessage', { title: confirm.title }) : undefined}
        icon="trash-outline"
        danger
        cancelLabel={t('common.cancel')}
        confirmLabel={t('common.delete')}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) deleteList(confirm.id).then(reload).catch((e) => console.warn(e));
          setConfirm(null);
        }}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg, padding: 20, paddingBottom: 0 },
    content: { paddingTop: 16, paddingBottom: 96 },
    empty: { color: colors.textMuted, fontSize: 15, marginTop: 8 },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radius.card,
      paddingLeft: 14,
      paddingVertical: 12,
      paddingRight: 4,
      marginBottom: 10,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dot: { width: 14, height: 14, borderRadius: 7 },
    cardTitle: { color: colors.text, fontSize: 18, fontWeight: '600', flex: 1 },
    dateBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dateText: { color: colors.textMuted, fontSize: 13 },
    menu: { width: 48, height: 40, alignItems: 'center', justifyContent: 'center' },
    status: { color: colors.textMuted, fontSize: 14, marginTop: 2, marginRight: 10 },
    track: { height: 6, borderRadius: 3, backgroundColor: colors.track, marginTop: 10, marginRight: 10 },
    fill: { height: 6, borderRadius: 3 },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 52,
      paddingHorizontal: 18,
      borderRadius: 18,
      backgroundColor: colors.primary,
      borderWidth: 1,
      borderColor: colors.outline,
    },
    fabText: { color: colors.onPrimary, fontSize: 16, fontWeight: '700' },
    headerBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    menuTitle: { color: colors.text, fontSize: 20, fontWeight: '600', marginBottom: 6 },
    menuRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56 },
    menuText: { color: colors.text, fontSize: 17 },
  });
