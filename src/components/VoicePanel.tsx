import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, useTheme } from '@/theme';
import { t } from '@/i18n';

// Панель над строкой добавления, пока идёт запись: что говорить.
export function VoicePanel() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.box} accessible accessibilityLiveRegion="polite" accessibilityLabel={`${t('voice.listening')} ${t('voice.listeningHint')}`}>
      <View style={styles.ring}>
        <View style={styles.mic}>
          <Ionicons name="mic" size={24} color={colors.onPrimary} />
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{t('voice.listening')}</Text>
        <Text style={styles.hint}>{t('voice.listeningHint')}</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    box: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.cardStrong, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8 },
    ring: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
    mic: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    body: { flex: 1 },
    title: { color: colors.text, fontSize: 16, fontWeight: '700' },
    hint: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  });
