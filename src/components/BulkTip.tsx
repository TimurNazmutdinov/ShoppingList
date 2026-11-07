import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Palette, useTheme } from '@/theme';
import { t } from '@/i18n';

type Props = { onMore: () => void };

// Подсказка над строкой добавления (всегда, пока строка пуста): что можно вводить списком, текстом или голосом.
export function BulkTip({ onMore }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.box}>
      <Text style={styles.text}>
        {t('tip.text')}{' '}
        <Text style={styles.link} onPress={onMore} accessibilityRole="link">{t('tip.more')}</Text>
      </Text>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    box: { backgroundColor: colors.cardStrong, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8, minHeight: 48, justifyContent: 'center' },
    text: { color: colors.text, fontSize: 13, lineHeight: 18 },
    link: { color: colors.primaryStrong, fontWeight: '700' },
  });
