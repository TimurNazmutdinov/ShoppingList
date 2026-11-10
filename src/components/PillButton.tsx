import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Palette, useTheme } from '@/theme';

type Props = { label: string; onPress: () => void; filled?: boolean; accessibilityLabel?: string };

// Маленькая кнопка-«таблетка» в шапке. Зона нажатия ≥ 48 dp.
export function PillButton({ label, onPress, filled, accessibilityLabel }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      style={styles.touch}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <View style={[styles.pill, filled && styles.filled]}>
        <Text style={[styles.text, filled && styles.filledText]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  touch: { minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center' },
  pill: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  filled: { backgroundColor: colors.tonal, borderColor: colors.tonal },
  text: { color: colors.text, fontSize: 14 },
  filledText: { color: colors.onTonal, fontWeight: '600' },
});
