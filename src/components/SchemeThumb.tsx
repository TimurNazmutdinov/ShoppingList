import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, SchemeKey, schemeDefs, useTheme } from '@/theme';
import { useSettings } from '@/AppSettings';

type Props = { schemeKey: SchemeKey; selected: boolean; onPress: () => void };

// Миниатюра схемы: рисуется из её токенов (фон, две карточки, кружок акцента).
export function SchemeThumb({ schemeKey, selected, onPress }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { language } = useSettings();
  const def = schemeDefs[schemeKey];
  const tk = def.tokens;
  const name = def.name[language];
  return (
    <Pressable
      style={styles.cell}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={name}
    >
      <View style={[styles.thumb, { backgroundColor: tk.bg, borderColor: tk.cardBorder }, selected && { borderColor: colors.primaryStrong, borderWidth: 3 }]}>
        <View style={[styles.bar, { backgroundColor: tk.card, borderColor: tk.cardBorder }]} />
        <View style={[styles.bar, { backgroundColor: tk.card, borderColor: tk.cardBorder }]} />
        <View style={[styles.dot, { backgroundColor: tk.primary === tk.bg ? tk.primaryStrong : tk.primary }]} />
        {selected ? (
          <View style={[styles.check, { backgroundColor: colors.primaryStrong }]}>
            <Ionicons name="checkmark" size={14} color={colors.bg} />
          </View>
        ) : null}
      </View>
      <Text style={styles.name} numberOfLines={2}>{name}</Text>
    </Pressable>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    cell: { width: '20%', alignItems: 'center', paddingHorizontal: 3, marginBottom: 10, minHeight: 48 },
    thumb: { width: '100%', aspectRatio: 0.82, borderRadius: 10, borderWidth: 1, padding: 6, justifyContent: 'space-between' },
    bar: { height: 12, borderRadius: 4, borderWidth: 1 },
    dot: { width: 14, height: 14, borderRadius: 7, alignSelf: 'center' },
    check: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    name: { color: colors.text, fontSize: 11, textAlign: 'center', marginTop: 4 },
  });
