import { Share } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// Системное «Поделиться» для текста (мессенджеры).
export async function shareText(message: string): Promise<void> {
  await Share.share({ message });
}

async function ensureSharing(): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('sharing unavailable');
}

// Пишет файл во временную папку и отдаёт в системное меню «Поделиться».
export async function shareFile(name: string, content: string, mimeType: string): Promise<void> {
  await ensureSharing();
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name });
}

// HTML → PDF → «Поделиться».
export async function sharePdf(html: string, title: string): Promise<void> {
  await ensureSharing();
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: title });
}

// Выбор файла на телефоне; возвращает его текст или null, если пользователь отменил выбор.
export async function pickFileText(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
  if (result.canceled || !result.assets?.[0]) return null;
  return new File(result.assets[0].uri).text();
}
