import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, radius, useTheme } from '@/theme';
import { t } from '@/i18n';
import { useSettings } from '@/AppSettings';
import { Category } from '@/logic/shopping';
import { currencySymbol } from '@/logic/money';
import { DishEntry, loadDishEntries, removeDishEntry, restoreStandardDishes, saveDishEntry } from '@/logic/userDishes';
import { BottomSheet } from './BottomSheet';
import { ConfirmDialog } from './ConfirmDialog';
import { DishForm } from './DishForm';
import { DishManage } from './DishManage';
import { DishProductRow, EditRow, toEditRow, toProduct } from './DishProductRow';
import { PrimaryButton } from './PrimaryButton';

export type DishChoice = { title: string; qty: number | null; unit: string | null; price: number | null };

type Props = {
  visible: boolean;
  categories: Category[];
  onClose: () => void;
  onAdd: (items: DishChoice[]) => void;
};

type Step =
  | { kind: 'pick' }
  | { kind: 'add'; entry: DishEntry }
  | { kind: 'manage' }
  | { kind: 'form'; entry: DishEntry | null; from: 'pick' | 'manage' };

// «Добавить из блюда»: выбираете блюдо, набор продуктов (с ценами) можно поправить и только потом добавить в список.
// Здесь же свои блюда: «+ Своё блюдо», режим «Изменить» (правка, удаление, возврат стандартных).
export function DishSheet({ visible, categories, onClose, onAdd }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <DishFlow categories={categories} onAdd={onAdd} />
    </BottomSheet>
  );
}

function DishFlow({ categories, onAdd }: Pick<Props, 'categories' | 'onAdd'>) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { language } = useSettings();
  const [entries, setEntries] = useState<DishEntry[]>([]);
  const [version, setVersion] = useState(0);
  const [view, setView] = useState<Step>({ kind: 'pick' });
  const [pendingDelete, setPendingDelete] = useState<DishEntry | null>(null);

  useEffect(() => {
    let live = true;
    loadDishEntries(language, categories)
      .then((loaded) => live && setEntries(loaded))
      .catch((e) => console.warn(e));
    return () => {
      live = false;
    };
  }, [language, categories, version]);

  const reload = () => setVersion((v) => v + 1);
  const run = (task: Promise<unknown>, after: () => void) =>
    task
      .then(() => {
        reload();
        after();
      })
      .catch((e) => console.warn(e));

  const confirm = (
    <ConfirmDialog
      visible={pendingDelete !== null}
      title={t('dish.deleteTitle')}
      message={pendingDelete ? t(pendingDelete.kind === 'own' ? 'dish.deleteOwn' : 'dish.deleteBuiltin', { title: pendingDelete.name }) : undefined}
      icon="trash-outline"
      danger
      cancelLabel={t('common.cancel')}
      confirmLabel={t('dish.delete')}
      onCancel={() => setPendingDelete(null)}
      onConfirm={() => {
        const target = pendingDelete;
        setPendingDelete(null);
        if (target) run(removeDishEntry(target), () => setView((v) => (v.kind === 'form' ? { kind: 'manage' } : v)));
      }}
    />
  );

  let body;
  if (view.kind === 'add') {
    body = <DishEditor key={view.entry.key} entry={view.entry} onBack={() => setView({ kind: 'pick' })} onAdd={onAdd} />;
  } else if (view.kind === 'manage') {
    body = (
      <DishManage
        entries={entries}
        onDone={() => setView({ kind: 'pick' })}
        onEdit={(entry) => setView({ kind: 'form', entry, from: 'manage' })}
        onDelete={setPendingDelete}
        onNew={() => setView({ kind: 'form', entry: null, from: 'manage' })}
        onRestore={() => run(restoreStandardDishes(), () => {})}
      />
    );
  } else if (view.kind === 'form') {
    const { entry, from } = view;
    body = (
      <DishForm
        key={entry?.key ?? 'new'}
        entry={entry}
        onCancel={() => setView(from === 'manage' ? { kind: 'manage' } : { kind: 'pick' })}
        onSave={(title, products) => run(saveDishEntry(entry, title, products), () => setView(from === 'manage' ? { kind: 'manage' } : { kind: 'pick' }))}
        onDelete={entry ? () => setPendingDelete(entry) : undefined}
      />
    );
  } else {
    body = (
      <>
        <View style={styles.head}>
          <Text style={styles.title}>{t('dish.title')}</Text>
          <Pressable style={styles.link} onPress={() => setView({ kind: 'manage' })} accessibilityRole="button">
            <Text style={styles.linkText}>{t('dish.edit')}</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>{t('dish.pick')}</Text>
        <View style={styles.dishes}>
          {entries.map((e) => (
            <Pressable key={e.key} style={styles.dish} onPress={() => setView({ kind: 'add', entry: e })} accessibilityRole="button" accessibilityLabel={e.name}>
              <Text style={styles.dishText}>{e.name}</Text>
            </Pressable>
          ))}
          <Pressable style={[styles.dish, styles.dishAdd]} onPress={() => setView({ kind: 'form', entry: null, from: 'pick' })} accessibilityRole="button">
            <Text style={styles.dishAddText}>{t('dish.own')}</Text>
          </Pressable>
        </View>
      </>
    );
  }
  return (
    <>
      {body}
      {confirm}
    </>
  );
}

function DishEditor({ entry, onBack, onAdd }: { entry: DishEntry; onBack: () => void; onAdd: (items: DishChoice[]) => void }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { currency } = useSettings();
  const symbol = currencySymbol(currency);
  const [rows, setRows] = useState<EditRow[]>(() => entry.rows.map((r) => toEditRow(r.key, r)));
  const selected = rows.filter((r) => r.on && r.title.trim());

  const patch = (key: string, p: Partial<EditRow>) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const addOwn = () => setRows((prev) => [...prev, { key: `own-${prev.length}-${Date.now()}`, title: '', qty: '', unit: null, price: '', on: true }]);

  return (
    <>
      <Pressable style={styles.back} onPress={onBack} accessibilityRole="button" accessibilityLabel={t('dish.back')}>
        <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
        <Text style={styles.backText}>{t('dish.back')}</Text>
      </Pressable>
      <Text style={styles.title}>{entry.name}</Text>
      <Text style={styles.hint}>{t('dish.ingredients')}</Text>
      {rows.map((r) => (
        <DishProductRow key={r.key} row={r} symbol={symbol} onPatch={(p) => patch(r.key, p)} />
      ))}
      <Pressable style={styles.own} onPress={addOwn} accessibilityRole="button">
        <Text style={styles.ownText}>{t('dish.addOwn')}</Text>
      </Pressable>
      <PrimaryButton
        label={t('dish.add', { n: selected.length })}
        onPress={() => {
          if (selected.length > 0) onAdd(selected.map(toProduct));
        }}
      />
    </>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    title: { color: colors.text, fontSize: 20, fontWeight: '600', marginBottom: 4, flex: 1 },
    link: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 6 },
    linkText: { color: colors.primaryStrong, fontSize: 15, fontWeight: '700' },
    hint: { color: colors.textMuted, fontSize: 14, marginBottom: 10 },
    dishes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
    dish: { minHeight: 52, paddingHorizontal: 18, justifyContent: 'center', borderRadius: radius.button, backgroundColor: colors.cardStrong },
    dishText: { color: colors.text, fontSize: 17 },
    dishAdd: { backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primaryStrong },
    dishAddText: { color: colors.primaryStrong, fontSize: 17, fontWeight: '700' },
    back: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 48 },
    backText: { color: colors.textMuted, fontSize: 14 },
    own: { minHeight: 48, justifyContent: 'center', marginBottom: 6 },
    ownText: { color: colors.primaryStrong, fontSize: 16, fontWeight: '700' },
  });
