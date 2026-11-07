import { StyleSheet, View } from 'react-native';
import { listColor, useTheme } from '@/theme';
import { FRAME_RADIUS, FRAME_WIDTH } from './groupFrame';

// Низ рамки группы «список» (цвет — цвет списка).
export function ListGroupFooter({ color }: { color: string }) {
  const colors = useTheme();
  return <View style={[styles.bottom, { borderColor: listColor(color, colors.scheme) }]} />;
}

const styles = StyleSheet.create({
  bottom: {
    height: FRAME_RADIUS,
    borderBottomWidth: FRAME_WIDTH,
    borderLeftWidth: FRAME_WIDTH,
    borderRightWidth: FRAME_WIDTH,
    borderBottomLeftRadius: FRAME_RADIUS,
    borderBottomRightRadius: FRAME_RADIUS,
  },
});
