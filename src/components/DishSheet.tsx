import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, radius, useTheme } from '@/theme';
import { t } from '@/i18n';
import { useSettings } from '@/AppSettings';
import { DISHES, Dish, DishRow, dishName } from '@/logic/dishes';
import { formatQty, parseQty } from '@/logic/history';
import { Category } from '@/logic/shopping';
import { BottomSheet } from './BottomSheet';
import { TextField } from './FormField';
import { PrimaryButton } from './PrimaryButton';

export type DishChoice = { title: string; qty: number | null; unit: string | null };

type Props = {
  visible: boolean;
  categories: Category[];
  rowsFor: (dish: Dish) => DishRow[];
  onClose: () => void;
  onAdd: (items: DishChoice[]) => void;
};

type EditRow = { key: string; title: string; qty: string; unit: string | null; on: boolean };

// «Добавить из блюда»: выбираете блюдо, набор продуктов можно поправить и только потом добавить в список.
export function DishSheet({ visible, rowsFor, onClose, onAdd }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <DishFlow rowsFor={rowsFor} onAdd={onAdd} />
    </BottomSheet>
  );
}

function DishFlow({ rowsFor, onAdd }: Pick<Props, 'rowsFor' | 'onAdd'>) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { language } = useSettings();
  const [dish, setDish] = useState<Dish | null>(null);

  if (!dish) {
    return (
      <>
        <Text style={styles.title}>{t('dish.title')}</Text>
        <Text style={styles.hint}>{t('dish.pick')}</Text>
        <View style={styles.dishes}>
          {DISHES.map((d) => (
            <Pressable key={d.id} style={styles.dish} onPress={() => setDish(d)} accessibilityRole="button" accessibilityLabel={dishName(d, language)}>
              <Text style={styles.dishText}>{dishName(d, language)}</Text>
            </Pressable>
          ))}
        </View>
      </>
    );
  }
  return <DishEditor key={dish.id} dish={dish} initial={rowsFor(dish)} onBack={() => setDish(null)} onAdd={onAdd} />;
}

function DishEditor({ dish, initial, onBack, onAdd }: { dish: Dish; initial: DishRow[]; onBack: () => void; onAdd: (items: DishChoice[]) => void }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { language } = useSettings();
  const [rows, setRows] = useState<EditRow[]>(() =>
    initial.map((r) => ({ key: r.key, title: r.title, qty: r.qty === null ? '' : String(r.qty).replace('.', ','), unit: r.unit, on: true })),
  );
  const selected = rows.filter((r) => r.on && r.title.trim());

  const patch = (key: string, p: Partial<EditRow>) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const addOwn = () => setRows((prev) => [...prev, { key: `own-${prev.length}-${Date.now()}`, title: '', qty: '', unit: null, on: true }]);

  return (
    <>
      <Pressable style={styles.back} onPress={onBack} accessibilityRole="button" accessibilityLabel={t('dish.back')}>
        <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
        <Text style={styles.backText}>{t('dish.back')}</Text>
      </Pressable>
      <Text style={styles.title}>{dishName(dish, language)}</Text>
      <Text style={styles.hint}>{t('dish.ingredients')}</Text>
      {rows.map((r) => (
        <View key={r.key} style={styles.row}>
          <Pressable
            style={styles.checkHit}
            onPress={() => patch(r.key, { on: !r.on })}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: r.on }}
            accessibilityLabel={r.title || t('dish.namePlaceholder')}
          >
            <View style={[styles.check, r.on && styles.checkOn]}>{r.on ? <Ionicons name="checkmark" size={16} color={colors.bg} /> : null}</View>
          </Pressable>
          <View style={styles.name}>
            <TextField value={r.title} onChangeText={(title) => patch(r.key, { title })} placeholder={t('dish.namePlaceholder')} maxLength={60} editable={r.on} />
          </View>
          <View style={styles.qty}>
            <TextField value={r.qty} onChangeText={(qty) => patch(r.key, { qty })} keyboardType="decimal-pad" maxLength={6} editable={r.on} accessibilityLabel={t('item.qtyLabel')} />
          </View>
          <Text style={styles.unit}>{r.unit ? formatQty(null, r.unit, (u) => t(`unitShort.${u as 'pcs'}`)) : ''}</Text>
        </View>
      ))}
      <Pressable style={styles.own} onPress={addOwn} accessibilityRole="button">
        <Text style={styles.ownText}>{t('dish.addOwn')}</Text>
      </Pressable>
      <PrimaryButton
        label={t('dish.add', { n: selected.length })}
        onPress={() => {
          if (selected.length > 0) onAdd(selected.map((r) => ({ title: r.title.trim(), qty: parseQty(r.qty), unit: r.unit })));
        }}
      />
    </>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    title: { color: colors.text, fontSize: 20, fontWeight: '600', marginBottom: 4 },
    hint: { color: colors.textMuted, fontSize: 14, marginBottom: 10 },
    dishes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
    dish: { minHeight: 52, paddingHorizontal: 18, justifyContent: 'center', borderRadius: radius.button, backgroundColor: colors.cardStrong },
    dishText: { color: colors.text, fontSize: 17 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 40 },
    backText: { color: colors.textMuted, fontSize: 14 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 56 },
    checkHit: { width: 44, height: 52, alignItems: 'center', justifyContent: 'center' },
    check: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.outline, alignItems: 'center', justifyContent: 'center' },
    checkOn: { backgroundColor: colors.primaryStrong, borderColor: colors.primaryStrong },
    name: { flex: 1 },
    qty: { width: 64 },
    unit: { width: 36, color: colors.textMuted, fontSize: 14 },
    own: { minHeight: 48, justifyContent: 'center', marginBottom: 6 },
    ownText: { color: colors.primaryStrong, fontSize: 16, fontWeight: '700' },
  });
