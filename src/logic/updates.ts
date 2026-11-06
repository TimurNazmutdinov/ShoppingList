import { Lang, languages } from '@/i18n';

export type UpdateInfo = {
  version: string;
  versionCode: number;
  url: string;
  apkUrl: string | null; // прямая ссылка на APK для автоустановки; нет — открываем страницу релиза
  size: number | null; // байты
  notes: Record<Lang, string[]>;
};

// Скачиваем только с GitHub по https и только файл .apk.
const APK_HOSTS = ['github.com', 'objects.githubusercontent.com', 'release-assets.githubusercontent.com'];

export function isAllowedApkUrl(url: string): boolean {
  const m = /^https:\/\/([a-z0-9.-]+)(?::443)?\/([^?#]*)/i.exec(url);
  return m !== null && APK_HOSTS.includes(m[1].toLowerCase()) && m[2].toLowerCase().endsWith('.apk');
}

// Размер скачанного файла должен совпасть с заявленным в latest.json (если он заявлен).
export function sizeMatches(expected: number | null, actual: number): boolean {
  return actual > 0 && (expected === null || expected === actual);
}

export function megabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0);
}

export type CheckResult =
  | { status: 'update'; info: UpdateInfo }
  | { status: 'latest'; version: string }
  | { status: 'error' };

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

// Разбор latest.json. Любая неполадка в файле → null (приложение продолжает работать).
export function parseLatest(raw: unknown): UpdateInfo | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (!isNonEmptyString(o.version) || !isNonEmptyString(o.url)) return null;
  if (typeof o.versionCode !== 'number' || !Number.isInteger(o.versionCode) || o.versionCode < 1) return null;
  if (!o.url.startsWith('https://')) return null;

  const notes = { ru: [], kk: [], en: [] } as Record<Lang, string[]>;
  if (typeof o.notes === 'object' && o.notes !== null) {
    const n = o.notes as Record<string, unknown>;
    for (const lang of languages) {
      const list = n[lang];
      if (Array.isArray(list)) notes[lang] = list.filter(isNonEmptyString);
    }
  }
  const apkUrl = typeof o.apkUrl === 'string' && isAllowedApkUrl(o.apkUrl) ? o.apkUrl : null;
  const size = typeof o.size === 'number' && Number.isInteger(o.size) && o.size > 0 ? o.size : null;
  return { version: o.version, versionCode: o.versionCode, url: o.url, apkUrl, size, notes };
}

export function isNewer(info: UpdateInfo, currentVersionCode: number): boolean {
  return info.versionCode > currentVersionCode;
}

// Заметки на языке приложения; если их нет — на русском, затем на английском.
export function notesFor(info: UpdateInfo, lang: Lang): string[] {
  return [info.notes[lang], info.notes.ru, info.notes.en].find((list) => list.length > 0) ?? [];
}

export function evaluate(raw: unknown, currentVersionCode: number, currentVersion: string): CheckResult {
  const info = parseLatest(raw);
  if (!info) return { status: 'error' };
  return isNewer(info, currentVersionCode)
    ? { status: 'update', info }
    : { status: 'latest', version: currentVersion };
}
