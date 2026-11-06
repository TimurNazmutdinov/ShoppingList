import { ReactNode, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, useTheme } from '@/theme';
import { useKeyboardOverlap } from '@/useKeyboard';

type Props = { visible: boolean; onClose: () => void; children: ReactNode };

export function BottomSheet({ visible, onClose, children }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardOverlap();
  // Приложение рисуется под системными панелями: снизу — отступ под навигацию,
  // а при клавиатуре панель сама поднимается (окно Modal на Android не сжимается).
  const bottomInset = keyboard > 0 ? 0 : insets.bottom;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <KeyboardAvoidingView
        style={[styles.root, { paddingBottom: keyboard }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: 24 + bottomInset }]}>
          <View style={styles.handle} />
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill,backgroundColor: colors.backdrop },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    maxHeight: '90%',
  },
  handle: {
    alignSelf: 'center',
    width: 60,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginTop: 12,
    marginBottom: 16,
  },
});
