import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Palette, radius, useTheme } from '@/theme';
import { t } from '@/i18n';
import { PrimaryButton } from './PrimaryButton';

type Row = { icon: keyof typeof Ionicons.glyphMap; title: string; text: string };

// Один экран после соглашения: что умеет приложение. Показывается один раз.
export function FeaturesIntro({ onDone }: { onDone: () => void }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const rows: Row[] = [
    { icon: 'cart-outline', title: t('intro.listsTitle'), text: t('intro.listsText') },
    { icon: 'alarm-outline', title: t('intro.remindTitle'), text: t('intro.remindText') },
    { icon: 'restaurant-outline', title: t('intro.dishesTitle'), text: t('intro.dishesText') },
    { icon: 'calendar-outline', title: t('intro.viewTitle'), text: t('intro.viewText') },
    { icon: 'basket-outline', title: t('intro.shopTitle'), text: t('intro.shopText') },
  ];
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title} accessibilityRole="header">{t('intro.title')}</Text>
        {rows.map((r) => (
          <View key={r.icon} style={styles.row} accessible accessibilityLabel={`${r.title}. ${r.text}`}>
            <View style={styles.iconBox}>
              <Ionicons name={r.icon} size={24} color={colors.primaryStrong} />
            </View>
            <View style={styles.texts}>
              <Text style={styles.rowTitle}>{r.title}</Text>
              <Text style={styles.rowText}>{r.text}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.button}>
        <PrimaryButton label={t('terms.start')} onPress={onDone} />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg, padding: 24 },
    scroll: { flexGrow: 1, justifyContent: 'center', gap: 18 },
    title: { color: colors.text, fontSize: 24, fontWeight: '600', textAlign: 'center', marginBottom: 6 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    iconBox: { width: 48, height: 48, borderRadius: radius.card, backgroundColor: colors.tonal, alignItems: 'center', justifyContent: 'center' },
    texts: { flex: 1 },
    rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
    rowText: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
    button: { marginTop: 10 },
  });
