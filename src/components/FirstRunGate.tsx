import { ReactNode, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Palette, radius, useTheme } from '@/theme';
import { Lang, languageNames, languages, t } from '@/i18n';
import { useSettings } from '@/AppSettings';
import { saveTermsAccepted } from '@/db/appearance';
import { LegalDoc, LegalSheet } from './LegalSheet';
import { PrimaryButton } from './PrimaryButton';

// Первый запуск: сначала выбор языка, затем принятие соглашения и политики конфиденциальности; потом само приложение.
export function FirstRunGate({ languageSet, termsAccepted, children }: { languageSet: boolean; termsAccepted: boolean; children: ReactNode }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const s = useSettings();
  const [langDone, setLangDone] = useState(languageSet);
  const [accepted, setAccepted] = useState(termsAccepted);
  const [checked, setChecked] = useState(false);
  const [doc, setDoc] = useState<LegalDoc | null>(null);

  if (!langDone) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.title} accessibilityRole="header">Язык · Тіл · Language</Text>
        {languages.map((l: Lang) => {
          const active = s.language === l;
          return (
            <Pressable
              key={l}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => s.setLanguageSetting(l)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={languageNames[l]}
            >
              <Text style={styles.optionText}>{languageNames[l]}</Text>
              {active ? <Ionicons name="checkmark-circle" size={24} color={colors.primaryStrong} /> : null}
            </Pressable>
          );
        })}
        <View style={styles.button}>
          <PrimaryButton label={t('firstRun.next')} onPress={() => { s.setLanguageSetting(s.language); setLangDone(true); }} />
        </View>
      </SafeAreaView>
    );
  }

  if (!accepted) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.title} accessibilityRole="header">{t('terms.title')}</Text>
        <Text style={styles.intro}>{t('terms.intro')}</Text>
        {(['terms', 'privacy'] as LegalDoc[]).map((d) => (
          <Pressable key={d} style={styles.option} onPress={() => setDoc(d)} accessibilityRole="button">
            <Text style={styles.optionText}>{d === 'terms' ? t('terms.docTerms') : t('terms.docPrivacy')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))}
        <Pressable style={styles.check} onPress={() => setChecked((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked }}>
          <View style={[styles.box, checked && styles.boxOn]}>{checked ? <Ionicons name="checkmark" size={18} color={colors.onPrimary} /> : null}</View>
          <Text style={styles.checkText}>{t('terms.accept')}</Text>
        </Pressable>
        <View style={styles.button}>
          <PrimaryButton
            label={t('terms.start')}
            disabled={!checked}
            onPress={() => {
              saveTermsAccepted().catch((e) => console.warn(e));
              setAccepted(true);
            }}
          />
        </View>
        <LegalSheet doc={doc} onClose={() => setDoc(null)} />
      </SafeAreaView>
    );
  }

  return <>{children}</>;
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center', gap: 10 },
    title: { color: colors.text, fontSize: 24, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
    intro: { color: colors.textMuted, fontSize: 15, textAlign: 'center', marginBottom: 8 },
    option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, paddingHorizontal: 16, borderRadius: radius.card, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
    optionActive: { borderColor: colors.primaryStrong, borderWidth: 2 },
    optionText: { color: colors.text, fontSize: 17 },
    check: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, marginTop: 6 },
    box: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: colors.outline, alignItems: 'center', justifyContent: 'center' },
    boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    checkText: { color: colors.text, fontSize: 15, flex: 1 },
    button: { marginTop: 10 },
  });
