import { ReactNode, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Palette, useTheme } from '@/theme';

type Props = { title: string; right?: ReactNode };

export function ScreenHeader({ title, right }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {right}
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 26, fontWeight: '700' },
});
