import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { radius, Palette, useTheme } from '@/theme';

type Props = { label: string; onPress: () => void; disabled?: boolean };

export function PrimaryButton({ label, onPress, disabled }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      style={[styles.btn, disabled && styles.btnOff]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
    >
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
  btnOff: { opacity: 0.45 },
  text: { color: colors.onPrimary, fontSize: 17, fontWeight: '600' },
});
