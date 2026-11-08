import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Palette, useTheme } from '@/theme';
import { t } from '@/i18n';
import { HistoryRow } from '@/logic/history';
import { itemQtyLabel } from './ItemSheet';

type Props = { rows: HistoryRow[]; onPick: (row: HistoryRow) => void };

// «Молоко 1 л»: название и прошлое количество.
export const buyAgainLabel = (row: HistoryRow) => [row.title, itemQtyLabel(row)].filter(Boolean).join(' ');

// «Купить снова» в пустом списке: частые покупки одним касанием, товар добавляется с прошлыми параметрами.
export function BuyAgainBlock({ rows, onPick }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.box}>
      <Text style={styles.title} accessibilityRole="header">{t('again.title')}</Text>
      <Text style={styles.hint}>{t('again.hint')}</Text>
      <View style={styles.chips}>
        {rows.map((row) => (
          <Pressable
            key={row.titleNorm}
            style={styles.chip}
            onPress={() => onPick(row)}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.buyAgain', { text: buyAgainLabel(row) })}
          >
            <Text style={styles.chipText}>{buyAgainLabel(row)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    box: { marginTop: 8, marginBottom: 12 },
    title: { color: colors.text, fontSize: 17, fontWeight: '600' },
    hint: { color: colors.textMuted, fontSize: 13, marginTop: 2, marginBottom: 10 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 24, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.outline },
    chipText: { color: colors.text, fontSize: 15 },
  });
