import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, useTheme } from '@/theme';
import { t } from '@/i18n';

// Плавающая кнопка «В магазин» слева над строкой добавления, напротив «Блюд»: включает крупный режим покупок.
export function ShopButton({ onPress }: { onPress: () => void }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable style={styles.button} onPress={onPress} accessibilityRole="button" accessibilityLabel={t('shop.enter')}>
      <Ionicons name="cart-outline" size={22} color={colors.textMuted} />
      <Text style={styles.text}>{t('shop.enter')}</Text>
    </Pressable>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    button: {
      position: 'absolute',
      left: 12,
      bottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 48,
      paddingLeft: 14,
      paddingRight: 18,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.outline,
      backgroundColor: colors.card,
      elevation: 3,
    },
    text: { color: colors.text, fontSize: 15, fontWeight: '600' },
  });
