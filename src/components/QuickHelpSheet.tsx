import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Palette, radius, useTheme } from '@/theme';
import { t } from '@/i18n';
import { BottomSheet } from './BottomSheet';
import { PrimaryButton } from './PrimaryButton';

type Props = { visible: boolean; onClose: () => void };

// «Быстрый ввод»: справка с примерами — несколько товаров, количество, цена, голос.
export function QuickHelpSheet({ visible, onClose }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const section = (title: string, text: string, example: string) => (
    <View key={title} style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
      <Text style={styles.example}>{example}</Text>
    </View>
  );
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>{t('help.title')}</Text>
      {section(t('help.multiTitle'), t('help.multiText'), t('help.multiEx'))}
      {section(t('help.qtyTitle'), t('help.qtyText'), t('help.qtyEx'))}
      {section(t('help.priceTitle'), t('help.priceText'), t('help.priceEx'))}
      {section(t('help.voiceTitle'), t('help.voiceText'), t('help.voiceEx'))}
      <View style={styles.ok}>
        <PrimaryButton label={t('help.ok')} onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    title: { color: colors.text, fontSize: 20, fontWeight: '600', marginBottom: 4 },
    section: { marginTop: 12 },
    sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
    text: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
    example: {
      alignSelf: 'flex-start',
      marginTop: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radius.button,
      backgroundColor: colors.cardStrong,
      color: colors.text,
      fontSize: 14,
    },
    ok: { marginTop: 18 },
  });
