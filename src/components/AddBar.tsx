import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, useTheme } from '@/theme';
import { t } from '@/i18n';
import { BulkItem } from '@/logic/bulk';
import { HistoryRow, QuickQty } from '@/logic/shopping';
import { BulkPreview } from './BulkPreview';
import { BulkTip } from './BulkTip';
import { FrequentRow } from './FrequentRow';
import { itemQtyLabel } from './ItemSheet';
import { quickPriceLabel, quickQtyLabel } from './QtySheet';
import { VoiceButton } from './VoiceButton';
import { VoicePanel } from './VoicePanel';

type Props = {
  text: string;
  onChangeText: (text: string) => void;
  suggestions: HistoryRow[];
  frequent: HistoryRow[]; // «Часто:» — частые покупки, пока строка пуста и в ней курсор
  autoFocus?: boolean; // курсор в строке сразу (ярлык «Добавить товар»)
  quick: QuickQty;
  symbol: string; // символ валюты
  preview: BulkItem[]; // что добавится из набранного списка (пусто — обычный ввод)
  bottomPad: number; // высота клавиатуры или системной панели
  onAdd: (title: string, preset?: HistoryRow) => void;
  onQtyPress: () => void;
  onTipMore: () => void;
};

// Нижняя строка: подсказки и предпросмотр, поле названия, голос, количество с ценой и «+».
export function AddBar({ text, onChangeText, suggestions, frequent, autoFocus, quick, symbol, preview, bottomPad, onAdd, onQtyPress, onTipMore }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [listening, setListening] = useState(false);
  const [focused, setFocused] = useState(false);
  const quickLines = [quickQtyLabel(quick), quickPriceLabel(quick, symbol)].filter(Boolean);
  const hasPreview = preview.length > 0;
  const showFrequent = focused && text.trim() === '' && frequent.length > 0 && !listening && !hasPreview;
  const showTip = text.trim() === '' && !listening && !showFrequent; // подсказка про список: пока строка пуста (кроме ряда «Часто:»)
  return (
    <View style={[styles.bar, { paddingBottom: 12 + bottomPad }]}>
      {suggestions.length > 0 && !hasPreview ? (
        <View style={styles.chips}>
          {suggestions.map((s) => {
            const label = [s.title, itemQtyLabel(s)].filter(Boolean).join(' · ');
            return (
              <Pressable
                key={s.titleNorm}
                style={styles.chip}
                onPress={() => onAdd(s.title, s)}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.suggestion', { text: label })}
              >
                <Text style={styles.chipText}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {showFrequent ? <FrequentRow rows={frequent} onPick={(row) => onAdd(row.title, row)} /> : null}
      {hasPreview ? <BulkPreview items={preview} symbol={symbol} /> : null}
      {listening ? <VoicePanel /> : null}
      {showTip ? <BulkTip onMore={onTipMore} /> : null}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={onChangeText}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={t('list.addPlaceholder')}
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          multiline
          submitBehavior="submit"
          onSubmitEditing={() => onAdd(text)}
          maxLength={500}
          accessibilityLabel={t('list.addPlaceholder')}
        />
        <VoiceButton onListeningChange={setListening} onResult={(spoken) => onChangeText(text.trim() ? `${text.trim()}, ${spoken}` : spoken)} />
        <Pressable
          style={[styles.qtyBtn, quickLines.length > 0 && styles.qtyBtnOn]}
          onPress={onQtyPress}
          accessibilityRole="button"
          accessibilityLabel={quickLines.length > 0 ? `${t('qty.title')}: ${quickLines.join(', ')}` : t('qty.open')}
        >
          {quickLines.length > 0 ? (
            quickLines.map((line) => (
              <Text key={line} style={[styles.qtyText, quickLines.length > 1 && styles.qtyTextSmall]} numberOfLines={1}>{line}</Text>
            ))
          ) : (
            <Ionicons name="calculator-outline" size={22} color={colors.textMuted} />
          )}
        </Pressable>
        <Pressable style={styles.addBtn} onPress={() => onAdd(text)} accessibilityRole="button" accessibilityLabel={t('a11y.addItem')}>
          <Ionicons name="add" size={28} color={colors.onPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    bar: { backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingHorizontal: 12, paddingTop: 10 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    chip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 24, backgroundColor: colors.tonal },
    chipText: { color: colors.onTonal, fontSize: 15, fontWeight: '600' },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    input: {
      flex: 1,
      minHeight: 48,
      maxHeight: 120,
      textAlignVertical: 'center',
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
    qtyBtnOn: { backgroundColor: colors.cardStrong, borderColor: colors.primaryStrong, borderWidth: 2 },
    qtyText: { color: colors.text, fontSize: 14, fontWeight: '700' },
    qtyTextSmall: { fontSize: 12, lineHeight: 15 },
    addBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  });
