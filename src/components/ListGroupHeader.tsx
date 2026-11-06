import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, listColor, useTheme } from '@/theme';
import { t } from '@/i18n';

type Props = { title: string; color: string; count: number; onPress: () => void };

// Компактный заголовок группы «список»: цветная точка, название, число товаров; по нажатию открывает список.
export function ListGroupHeader({ title, color, count, onPress }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button" accessibilityLabel={t('a11y.openList', { title })}>
      <View style={[styles.dot, { backgroundColor: listColor(color, colors.scheme) }]} />
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <Text style={styles.count}>{count}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, marginTop: 4 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    title: { color: colors.text, fontSize: 15, fontWeight: '700', flexShrink: 1 },
    count: { color: colors.textMuted, fontSize: 13, flex: 1 },
  });
