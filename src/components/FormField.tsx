import { ReactNode, useMemo } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { radius, Palette, useTheme } from '@/theme';

type Props = { label: string; error?: string | null; children: ReactNode };

export function FormField({ label, error, children }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function TextField(props: TextInputProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      {...props}
      style={[styles.input, props.multiline && styles.multiline, props.style]}
    />
  );
}

export const fieldBox = (colors: Palette) =>
  ({
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.button,
  }) as const;

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  field: { marginBottom: 14 },
  label: { color: colors.textMuted, fontSize: 14, marginBottom: 6 },
  input: { ...fieldBox(colors), color: colors.text, fontSize: 17, paddingHorizontal: 16, height: 52 },
  multiline: { height: 96, paddingTop: 14, textAlignVertical: 'top' },
  error: { color: colors.warn, fontSize: 13, marginTop: 6 },
});
