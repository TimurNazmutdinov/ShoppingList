import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, useTheme } from '@/theme';
import { t } from '@/i18n';
import { HistoryRow, QuickQty } from '@/logic/shopping';
import { itemQtyLabel } from './ItemSheet';
import { quickQtyLabel } from './QtySheet';
import { VoiceButton } from './VoiceButton';

type Props = {
  text: string;
  onChangeText: (text: string) => void;
  suggestions: HistoryRow[];
  quick: QuickQty;
  bottomPad: number; // высота клавиатуры или системной панели
  onAdd: (title: string, preset?: HistoryRow) => void;
  onQtyPress: () => void;
};

// Нижняя строка: подсказки из истории, поле названия, быстрый ввод количества и «+».
export function AddBar({ text, onChangeText, suggestions, quick, bottomPad, onAdd, onQtyPress }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const quickLabel = quickQtyLabel(quick);
  return (
    <View style={[styles.bar, { paddingBottom: 12 + bottomPad }]}>
      {suggestions.length > 0 ? (
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
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={onChangeText}
          placeholder={t('list.addPlaceholder')}
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          multiline
          submitBehavior="submit"
          onSubmitEditing={() => onAdd(text)}
          maxLength={500}
          accessibilityLabel={t('list.addPlaceholder')}
        />
        <VoiceButton onResult={(spoken) => onChangeText(text.trim() ? `${text.trim()}, ${spoken}` : spoken)} />
        <Pressable
          style={[styles.qtyBtn, quickLabel !== '' && styles.qtyBtnOn]}
          onPress={onQtyPress}
          accessibilityRole="button"
          accessibilityLabel={quickLabel ? `${t('qty.title')}: ${quickLabel}` : t('qty.open')}
        >
          {quickLabel ? <Text style={styles.qtyText} numberOfLines={1}>{quickLabel}</Text> : <Ionicons name="scale-outline" size={22} color={colors.textMuted} />}
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
    chip: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 20, backgroundColor: colors.primary },
    chipText: { color: colors.onPrimary, fontSize: 15, fontWeight: '600' },
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
    addBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  });
