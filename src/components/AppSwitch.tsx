import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, useTheme } from '@/theme';

type Props = { value: boolean; onValueChange: (value: boolean) => void; accessibilityLabel: string };

// Общий переключатель. Вкл: яркая дорожка, бегунок справа с галочкой; выкл: контур, малый бегунок слева.
// Состояние видно по положению и значку, а не только по цвету. Зона нажатия 48 dp.
export function AppSwitch({ value, onValueChange, accessibilityLabel }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={styles.hit}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[styles.track, value ? styles.trackOn : styles.trackOff]}>
        {value ? (
          <View style={[styles.thumb, styles.thumbOn]}>
            <Ionicons name="checkmark" size={16} color={colors.switchOn} />
          </View>
        ) : (
          <View style={[styles.thumb, styles.thumbOff]} />
        )}
      </View>
    </Pressable>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    hit: { minWidth: 56, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
    track: { width: 52, height: 32, borderRadius: 16, justifyContent: 'center' },
    trackOn: { backgroundColor: colors.switchOn, alignItems: 'flex-end', paddingRight: 4 },
    trackOff: { borderWidth: 2, borderColor: colors.outline, alignItems: 'flex-start', paddingLeft: 4 },
    thumb: { alignItems: 'center', justifyContent: 'center' },
    thumbOn: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.switchOnThumb },
    thumbOff: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.switchOffThumb },
  });
