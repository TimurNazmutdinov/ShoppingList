import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, useTheme } from '@/theme';
import { t } from '@/i18n';

// Плавающая кнопка «Блюда» справа над строкой добавления: значок и надпись.
export function DishButton({ onPress }: { onPress: () => void }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable style={styles.button} onPress={onPress} accessibilityRole="button" accessibilityLabel={t('dish.button')}>
      <Ionicons name="restaurant-outline" size={22} color={colors.onTonal} />
      <Text style={styles.text}>{t('dish.button')}</Text>
    </Pressable>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    button: {
      position: 'absolute',
      right: 12,
      bottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 48,
      paddingLeft: 14,
      paddingRight: 18,
      borderRadius: 24,
      backgroundColor: colors.tonal,
      elevation: 3,
    },
    text: { color: colors.onTonal, fontSize: 15, fontWeight: '600' },
  });
