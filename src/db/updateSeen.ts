import { getSetting, setSetting } from './index';
import { UpdateSeen, isUpdateSeen } from '@/logic/updateDefer';

// Когда приложение впервые увидело нынешнюю версию обновления (для срока кнопки «Позже»).
export async function loadUpdateSeen(): Promise<UpdateSeen | null> {
  const value = await getSetting<unknown>('updateSeen');
  return isUpdateSeen(value) ? value : null;
}

export const saveUpdateSeen = (seen: UpdateSeen) => setSetting('updateSeen', seen);
