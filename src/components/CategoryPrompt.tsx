import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Palette, useTheme } from '@/theme';
import { t } from '@/i18n';
import { Category, categoryName } from '@/logic/categories';

type Props = { title: string; categories: Category[]; onPick: (categoryId: number) => void; onSkip: () => void };

// Новый товар не из каталога добавился без категории: предлагаем выбрать её одним касанием (или «Позже»).
export function CategoryPrompt({ title, categories, onPick, onSkip }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.box}>
      <Text style={styles.title} numberOfLines={1}>{t('cat.promptTitle', { title })}</Text>
      <FlatList
        horizontal
        data={categories}
        keyExtractor={(c) => String(c.id)}
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.chips}
        ListFooterComponent={
          <Pressable style={styles.later} onPress={onSkip} accessibilityRole="button">
            <Text style={styles.laterText}>{t('cat.promptLater')}</Text>
          </Pressable>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.chip} onPress={() => onPick(item.id)} accessibilityRole="button" accessibilityLabel={categoryName(item)}>
            <Text style={styles.chipText}>{categoryName(item)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    box: { marginHorizontal: 12, marginBottom: 8, padding: 10, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
    title: { color: colors.text, fontSize: 14, marginBottom: 6 },
    chips: { gap: 8, paddingRight: 8 },
    chip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 24, backgroundColor: colors.tonal },
    chipText: { color: colors.onTonal, fontSize: 15, fontWeight: '600' },
    later: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 14 },
    laterText: { color: colors.textMuted, fontSize: 15 },
  });
