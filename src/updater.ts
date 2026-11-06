import { File, Directory, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { APP_PACKAGE } from '@/config';
import { sizeMatches } from '@/logic/updates';

const APK_MIME = 'application/vnd.android.package-archive';
const FLAG_GRANT_READ_URI_PERMISSION = 1;

export type Download = { promise: Promise<File>; cancel: () => void };

// Скачивает APK в кэш приложения (старые загрузки удаляются). Проверяет размер.
export function startDownload(url: string, expectedSize: number | null, onProgress: (done: number, total: number) => void): Download {
  const dir = new Directory(Paths.cache, 'updates');
  if (dir.exists) dir.delete();
  dir.create({ intermediates: true, idempotent: true });
  const target = new File(dir, 'shoppinglist-update.apk');
  const task = File.createDownloadTask(url, target, {
    onProgress: ({ bytesWritten, totalBytes }) => onProgress(bytesWritten, totalBytes > 0 ? totalBytes : (expectedSize ?? 0)),
  });
  const promise = (async () => {
    const file = await task.downloadAsync();
    if (!file || !sizeMatches(expectedSize, file.size)) throw new Error('bad size');
    return file;
  })();
  return { promise, cancel: () => task.cancel() };
}

// Системный установщик Android. Ответ пользователя («Установить») — в самом установщике.
export async function installApk(file: File): Promise<void> {
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: file.contentUri,
    type: APK_MIME,
    flags: FLAG_GRANT_READ_URI_PERMISSION,
  });
}

// Настройка «Установка неизвестных приложений» для ShoppingList.
export async function openInstallSettings(): Promise<void> {
  await IntentLauncher.startActivityAsync('android.settings.MANAGE_UNKNOWN_APP_SOURCES', {
    data: `package:${APP_PACKAGE}`,
  });
}
