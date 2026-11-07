import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { Palette, useTheme } from '@/theme';
import { Lang, getLanguage, t } from '@/i18n';
import { isFlagSet, setFlag } from '@/logic/shopping';
import { ConfirmDialog } from './ConfirmDialog';

const LOCALES: Record<Lang, string> = { ru: 'ru-RU', kk: 'kk-KZ', en: 'en-US' };
const NOTICE_FLAG = 'voiceNoticeShown';

type Props = { onResult: (text: string) => void; onListeningChange?: (listening: boolean) => void };

// Голосовой ввод: распознанная речь попадает в строку добавления. Распознавание может идти через интернет:
// при первом использовании показывается сообщение об этом (с примером, как говорить).
export function VoiceButton({ onResult, onListeningChange }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [listening, setListeningState] = useState(false);
  const [notice, setNotice] = useState(false);
  const setListening = (on: boolean) => {
    setListeningState(on);
    onListeningChange?.(on);
  };

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => setListening(false));
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript?.trim();
    if (event.isFinal && text) onResult(text);
  });
  useSpeechRecognitionEvent('error', () => {
    setListening(false);
    Alert.alert(t('voice.error'));
  });

  const start = async () => {
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('voice.denied'));
      return;
    }
    ExpoSpeechRecognitionModule.start({ lang: LOCALES[getLanguage()], interimResults: false, continuous: false });
  };

  const press = async () => {
    if (listening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    if (!(await isFlagSet(NOTICE_FLAG))) {
      setNotice(true);
      return;
    }
    await start();
  };

  return (
    <>
      <Pressable
        style={[styles.btn, listening && styles.btnOn]}
        onPress={() => press().catch((e) => console.warn(e))}
        accessibilityRole="button"
        accessibilityState={{ selected: listening }}
        accessibilityLabel={listening ? t('voice.stop') : t('voice.start')}
      >
        <Ionicons name={listening ? 'mic' : 'mic-outline'} size={22} color={listening ? colors.onPrimary : colors.textMuted} />
      </Pressable>
      <ConfirmDialog
        visible={notice}
        title={t('voice.noticeTitle')}
        message={`${t('voice.noticeText')}\n\n${t('voice.noticeExample')}`}
        icon="mic-outline"
        cancelLabel={t('common.cancel')}
        confirmLabel={t('voice.noticeOk')}
        onCancel={() => setNotice(false)}
        onConfirm={() => {
          setNotice(false);
          setFlag(NOTICE_FLAG)
            .then(start)
            .catch((e) => console.warn(e));
        }}
      />
    </>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    btn: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.outline, alignItems: 'center', justifyContent: 'center' },
    btnOn: { backgroundColor: colors.primary, borderColor: colors.primaryStrong },
  });
