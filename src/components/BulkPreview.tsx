import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Palette, useTheme } from '@/theme';
import { t, tn } from '@/i18n';
import { BulkItem } from '@/logic/bulk';
import { UNITS, formatQty } from '@/logic/history';
import { formatMoney } from '@/logic/money';

const MAX_LINES = 5;

type Props = { items: BulkItem[]; symbol: string };

// Предпросмотр над строкой добавления: что именно добавится из набранного списка («молоко 1 л 450 ₸, хлеб»).
export function BulkPreview({ items, symbol }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const shown = items.slice(0, MAX_LINES);
  const priced = items.filter((i) => i.price !== undefined);
  const total = priced.reduce((sum, i) => sum + (i.price ?? 0), 0);
  return (
    <View style={styles.box} accessible accessibilityLabel={`${t('bulk.willAdd')} ${tn('unit.item', items.length)}`}>
      <Text style={styles.head}>{`${t('bulk.willAdd')} ${tn('unit.item', items.length)}`.toUpperCase()}</Text>
      {shown.map((i, index) => {
        const label = [
          formatQty(i.qty, i.unit, (u) => t(`unitShort.${u as (typeof UNITS)[number]}`)),
          i.price === undefined ? '' : formatMoney(i.price, symbol),
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <View key={`${index}-${i.title}`} style={styles.line}>
            <Text style={styles.title} numberOfLines={1}>{i.title}</Text>
            {label ? <Text style={styles.label}>{label}</Text> : null}
          </View>
        );
      })}
      {items.length > MAX_LINES ? <Text style={styles.label}>{`… +${items.length - MAX_LINES}`}</Text> : null}
      {priced.length > 0 ? (
        <View style={styles.total}>
          <Text style={styles.totalText}>{t('bulk.total')}</Text>
          <Text style={styles.totalText}>{formatMoney(total, symbol)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    box: { backgroundColor: colors.cardStrong, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8 },
    head: { color: colors.primaryStrong, fontSize: 12, fontWeight: '700', letterSpacing: 0.3, marginBottom: 2 },
    line: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 2 },
    title: { color: colors.text, fontSize: 15, flexShrink: 1 },
    label: { color: colors.textMuted, fontSize: 14 },
    total: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.cardBorder, marginTop: 6, paddingTop: 6 },
    totalText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  });
