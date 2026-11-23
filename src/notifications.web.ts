// Веб (PWA): напоминания недоступны — Safari не планирует уведомления без сервера. Заглушки с тем же API.
export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function getPermissionState(): Promise<PermissionState> {
  return 'denied';
}

export async function requestPermission(): Promise<PermissionState> {
  return 'denied';
}

export const openPhoneSettings = async (): Promise<void> => {};

export async function askReminderPermission(): Promise<void> {}

export async function rescheduleReminders(): Promise<void> {}

export async function getPlanSummary(): Promise<{ count: number; next: Date | null }> {
  return { count: 0, next: null };
}

export async function sendTestNotification(): Promise<void> {}

export function useReminderSync(): void {}
