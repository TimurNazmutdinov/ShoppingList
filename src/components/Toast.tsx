import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Palette, radius, useTheme } from '@/theme';

type Props = { text: string; actionLabel: string; onAction: () => void };

// Короткое сообщение над строкой ввода: что произошло и кнопка «Отменить».
export function Toast({ text, actionLabel, onAction }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.root} accessibilityLiveRegion="polite">
      <Text style={styles.text} numberOfLines={2}>{text}</Text>
      <Pressable style={styles.btn} onPress={onAction} accessibilityRole="button">
        <Text style={styles.btnText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    root: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginBottom: 8,
      paddingLeft: 16,
      borderRadius: radius.card,
      backgroundColor: colors.text,
    },
    text: { flex: 1, color: colors.bg, fontSize: 15 },
    btn: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16 },
    btnText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  });
