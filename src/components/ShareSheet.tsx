import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, useTheme } from '@/theme';
import { t } from '@/i18n';
import { ShareKind } from '@/logic/sharing';
import { ShoppingList } from '@/db/lists';
import { BottomSheet } from './BottomSheet';

type Props = { list: ShoppingList | null; onClose: () => void; onPick: (list: ShoppingList, kind: ShareKind) => void };

// «Поделиться»: текстом в мессенджер, файлом для этого же приложения, .txt или PDF.
export function ShareSheet({ list, onClose, onPick }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const rows: { kind: ShareKind; icon: keyof typeof Ionicons.glyphMap; title: string; hint: string }[] = [
    { kind: 'text', icon: 'chatbubble-ellipses-outline', title: t('share.text'), hint: t('share.textHint') },
    { kind: 'file', icon: 'document-attach-outline', title: t('share.file'), hint: t('share.fileHint') },
    { kind: 'txt', icon: 'document-text-outline', title: t('share.txt'), hint: t('share.txtHint') },
    { kind: 'pdf', icon: 'print-outline', title: t('share.pdf'), hint: t('share.pdfHint') },
  ];
  return (
    <BottomSheet visible={list !== null} onClose={onClose}>
      {list ? (
        <>
          <Text style={styles.title} numberOfLines={1}>{t('share.title')}: {list.title}</Text>
          {rows.map((r) => (
            <Pressable key={r.kind} style={styles.row} onPress={() => onPick(list, r.kind)} accessibilityRole="button" accessibilityLabel={r.title}>
              <Ionicons name={r.icon} size={24} color={colors.textMuted} />
              <View style={styles.body}>
                <Text style={styles.rowTitle}>{r.title}</Text>
                <Text style={styles.hint}>{r.hint}</Text>
              </View>
            </Pressable>
          ))}
        </>
      ) : null}
    </BottomSheet>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    title: { color: colors.text, fontSize: 20, fontWeight: '600', marginBottom: 6 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, paddingVertical: 6 },
    body: { flex: 1 },
    rowTitle: { color: colors.text, fontSize: 17 },
    hint: { color: colors.textMuted, fontSize: 13, marginTop: 1 },
  });
