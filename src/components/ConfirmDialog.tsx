import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, Palette, useTheme } from '@/theme';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  icon: keyof typeof Ionicons.glyphMap;
  danger?: boolean;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  icon,
  danger,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const accent = danger ? colors.warn : colors.tonal;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Ionicons name={icon} size={36} color={danger ? colors.warn : colors.primaryStrong} />
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.buttons}>
            <Pressable style={[styles.btn, styles.cancel]} onPress={onCancel} accessibilityRole="button">
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, { backgroundColor: accent, borderWidth: danger ? 1 : 0, borderColor: colors.warn }]}
              onPress={onConfirm}
              accessibilityRole="button"
            >
              <Text style={[styles.confirmText, danger && { color: colors.onWarn }]}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  dialog: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '600', marginTop: 10 },
  message: { color: colors.textMuted, fontSize: 15, textAlign: 'center', marginTop: 8 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 22 },
  btn: { flex: 1, height: 48, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center' },
  cancel: { borderWidth: 1.5, borderColor: colors.outline },
  cancelText: { color: colors.text, fontSize: 16 },
  confirmText: { color: colors.onTonal, fontSize: 16, fontWeight: '600' },
});
