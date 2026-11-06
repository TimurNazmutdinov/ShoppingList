import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';

// Сколько клавиатура закрывает снизу физического экрана (dp), 0 если скрыта.
// Приложение рисуется под системными панелями, окно при клавиатуре не сжимается, поэтому считаем сами.
export function useKeyboardOverlap(): number {
  const [overlap, setOverlap] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setOverlap(Math.max(0, Dimensions.get('screen').height - e.endCoordinates.screenY));
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setOverlap(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return overlap;
}
