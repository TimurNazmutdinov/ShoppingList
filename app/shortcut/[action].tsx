import { useEffect } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { resolveShortcut } from '@/logic/shopping';
import { isShortcutAction } from '@/logic/shortcuts';

// Вход через ярлык на иконке (shoppinglist://shortcut/add | today | new): сразу ведёт на нужный экран.
export default function ShortcutScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { action } = useLocalSearchParams<{ action: string }>();

  useEffect(() => {
    if (!isShortcutAction(action)) {
      router.replace('/' as never);
      return;
    }
    resolveShortcut(action)
      .then((target) => {
        if (target.kind === 'today') {
          router.replace('/' as never);
          return;
        }
        if (target.kind === 'newList') {
          router.replace({ pathname: '/lists', params: { new: '1' } } as never);
          return;
        }
        // «Списки» под экраном: «назад» вернёт к ним, а не закроет приложение
        router.replace('/lists' as never);
        router.push({ pathname: '/list/[id]', params: { id: String(target.id), focus: '1' } } as never);
      })
      .catch((e) => {
        console.warn(e);
        router.replace('/' as never);
      });
  }, [action, router]);

  return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
}
