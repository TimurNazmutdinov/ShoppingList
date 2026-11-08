import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Palette, useTheme } from '@/theme';
import { t } from '@/i18n';
import { HistoryRow } from '@/logic/history';
import { buyAgainLabel } from './BuyAgainBlock';

type Props = { rows: HistoryRow[]; onPick: (row: HistoryRow) => void };

// «Часто:» над строкой ввода в непустом списке: прокрутка вбок, нажатие добавляет товар с прошлыми параметрами.
export function FrequentRow({ rows, onPick }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{t('again.row')}</Text>
      <FlatList
        style={styles.list}
        horizontal
        data={rows}
        keyExtractor={(row) => row.titleNorm}
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.chips}
        renderItem={({ item: row }) => (
          <Pressable
            style={styles.chip}
            onPress={() => onPick(row)}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.buyAgain', { text: buyAgainLabel(row) })}
          >
            <Text style={styles.chipText}>{buyAgainLabel(row)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    label: { color: colors.textMuted, fontSize: 14, marginRight: 8 },
    list: { flex: 1 },
    chips: { gap: 8, paddingRight: 8 },
    chip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 24, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.outline },
    chipText: { color: colors.text, fontSize: 15 },
  });
