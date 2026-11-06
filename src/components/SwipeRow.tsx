import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '@/theme';

const THRESHOLD = 96;

type Action = { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string };
type Props = {
  children: ReactNode;
  right: Action; // смахнули вправо
  left: Action; // смахнули влево
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
};

// Строка со смахиванием: вправо и влево, с «открывающимся» цветным фоном. Только стандартные средства RN.
export function SwipeRow({ children, right, left, onSwipeRight, onSwipeLeft }: Props) {
  const [x] = useState(() => new Animated.Value(0));
  const [dir, setDir] = useState<'right' | 'left' | null>(null);
  const width = useRef(320);
  const callbacks = useRef({ onSwipeRight, onSwipeLeft });
  useEffect(() => {
    callbacks.current = { onSwipeRight, onSwipeLeft };
  });

  // Refs читаются только внутри обработчиков жестов, не при отрисовке.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_e, g) => {
        x.setValue(g.dx);
        setDir(g.dx > 0 ? 'right' : g.dx < 0 ? 'left' : null);
      },
      onPanResponderRelease: (_e, g) => {
        const fire = g.dx > THRESHOLD ? 'right' : g.dx < -THRESHOLD ? 'left' : null;
        if (!fire) {
          Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(() => setDir(null));
          return;
        }
        Animated.timing(x, { toValue: fire === 'right' ? width.current : -width.current, duration: 140, useNativeDriver: true }).start(() => {
          if (fire === 'right') callbacks.current.onSwipeRight();
          else callbacks.current.onSwipeLeft();
          x.setValue(0);
          setDir(null);
        });
      },
      onPanResponderTerminate: () => {
        Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(() => setDir(null));
      },
    }),
  );

  const action = dir === 'right' ? right : dir === 'left' ? left : null;
  return (
    <View style={styles.wrap} onLayout={(e) => (width.current = e.nativeEvent.layout.width)}>
      {action ? (
        <View style={[styles.reveal, { backgroundColor: action.bg, justifyContent: dir === 'right' ? 'flex-start' : 'flex-end' }]}>
          <Ionicons name={action.icon} size={22} color={action.fg} />
          <Text style={[styles.label, { color: action.fg }]}>{action.label}</Text>
        </View>
      ) : null}
      <Animated.View style={{ transform: [{ translateX: x }] }} {...pan.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 6, borderRadius: radius.card, overflow: 'hidden' },
  reveal: { ...StyleSheet.absoluteFill, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  label: { fontSize: 15, fontWeight: '700' },
});
