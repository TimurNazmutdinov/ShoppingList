import { Alert } from 'react-native';
import { t } from '@/i18n';

// Запускает операцию с БД. При ошибке показывает короткое сообщение без технического текста.
// Возвращает true, если всё получилось.
export async function guard(action: () => Promise<unknown>, message = t('error.save')): Promise<boolean> {
  try {
    await action();
    return true;
  } catch (e) {
    console.warn(e);
    Alert.alert(t('error.title'), message);
    return false;
  }
}
