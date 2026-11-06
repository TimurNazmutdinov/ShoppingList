import { ReactNode, useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Palette, useTheme } from '@/theme';
import { ScreenHeader } from './ScreenHeader';

type Props = { title: string; empty: string; right?: ReactNode; footer?: ReactNode };

export function EmptyScreen({ title, empty, right, footer }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader title={title} right={right} />
      <Text style={styles.empty}>{empty}</Text>
      {footer}
    </SafeAreaView>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  empty: { color: colors.textMuted, fontSize: 15, marginTop: 24 },
});
