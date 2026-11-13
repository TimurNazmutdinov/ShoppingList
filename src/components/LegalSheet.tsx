import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { Palette, useTheme } from '@/theme';
import { t } from '@/i18n';
import { BottomSheet } from './BottomSheet';

export type LegalDoc = 'terms' | 'privacy';

// Пользовательское соглашение или политика конфиденциальности: тексты из i18n, читаются без интернета.
export function LegalSheet({ doc, onClose }: { doc: LegalDoc | null; onClose: () => void }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { height } = useWindowDimensions();
  return (
    <BottomSheet visible={doc !== null} onClose={onClose}>
      <Text style={styles.docTitle}>{doc === 'privacy' ? t('terms.docPrivacy') : t('terms.docTerms')}</Text>
      <ScrollView style={{ maxHeight: height * 0.6 }}>
        <Text style={styles.docBody}>{doc === 'privacy' ? t('terms.privacyBody') : t('terms.termsBody')}</Text>
      </ScrollView>
    </BottomSheet>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    docTitle: { color: colors.text, fontSize: 20, fontWeight: '600', marginBottom: 8 },
    docBody: { color: colors.text, fontSize: 15, lineHeight: 22, paddingBottom: 12 },
  });
