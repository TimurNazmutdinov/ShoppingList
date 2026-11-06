import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { t } from '@/i18n';
import { schemeDefs, themeDefaults } from '@/theme';
import { Appearance } from '@/db/appearance';
import { activeSchemeKey } from '@/logic/schemes';
import { IS_PROTOTYPE } from '@/config';
import { LogoMark } from './LogoMark';

type Props = { appearance: Appearance | null; onReady: () => void; onContinue?: () => void };

// Заставка: фон, текст и знак — из активного цветового профиля (как и всё приложение).
// Анимация «сборки» знака — этап 0.6; пока знак статичный.
export function SplashScreen({ appearance, onReady, onContinue }: Props) {
  const system = useColorScheme();
  const def = schemeDefs[activeSchemeKey(appearance?.scheme ?? themeDefaults.schemeSetting, system)];

  useEffect(() => {
    onReady();
  }, [onReady]);

  return (
    <Pressable
      style={[styles.root, { backgroundColor: def.tokens.bg }]}
      onPress={onContinue}
      accessibilityRole="button"
      accessibilityLabel={t('splash.continue')}
    >
      <LogoMark size={140} colors={def.mark} />
      <Text style={[styles.name, { color: def.tokens.text }]}>{t('splash.name')}</Text>
      <Text style={[styles.slogan, { color: def.tokens.textMuted }]}>{t('splash.slogan')}</Text>
      {IS_PROTOTYPE ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t('proto.badge')}</Text>
        </View>
      ) : null}
      {onContinue ? <Text style={[styles.hint, { color: def.tokens.textMuted }]}>{t('splash.continue')}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  name: { fontSize: 28, fontWeight: '700', marginTop: 8 },
  slogan: { fontSize: 15 },
  badge: { backgroundColor: '#FAC775', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, marginTop: 14 },
  badgeText: { color: '#412402', fontSize: 12, fontWeight: '700' },
  hint: { position: 'absolute', bottom: 48, fontSize: 14 },
});
