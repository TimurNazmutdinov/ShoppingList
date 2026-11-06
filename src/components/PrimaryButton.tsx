import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { radius, Palette, useTheme } from '@/theme';

type Props = { label: string; onPress: () => void };

export function PrimaryButton({ label, onPress }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable style={styles.btn} onPress={onPress} accessibilityRole="button">
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  text: { color: colors.onPrimary, fontSize: 17, fontWeight: '600' },
});
