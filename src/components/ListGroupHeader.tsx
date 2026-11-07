import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, listColor, useTheme } from '@/theme';
import { t } from '@/i18n';
import { FRAME_PAD, FRAME_RADIUS, FRAME_WIDTH } from './groupFrame';

type Props = { title: string; color: string; onPress: () => void };

// Заголовок группы «список» — верх рамки: цветная точка и название; по нажатию открывает список.
export function ListGroupHeader({ title, color, onPress }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const lc = listColor(color, colors.scheme);
  return (
    <View style={[styles.top, { borderColor: lc }]}>
      <Pressable style={styles.row} onPress={onPress} accessibilityRole="button" accessibilityLabel={t('a11y.openList', { title })}>
        <View style={[styles.dot, { backgroundColor: lc }]} />
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    top: {
      marginTop: 10,
      paddingHorizontal: FRAME_PAD,
      borderTopWidth: FRAME_WIDTH,
      borderLeftWidth: FRAME_WIDTH,
      borderRightWidth: FRAME_WIDTH,
      borderTopLeftRadius: FRAME_RADIUS,
      borderTopRightRadius: FRAME_RADIUS,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    title: { color: colors.text, fontSize: 15, fontWeight: '700', flexShrink: 1, flex: 1 },
  });
