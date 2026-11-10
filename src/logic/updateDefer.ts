import { tl } from '@/i18n';

// Экран обновления можно отложить кнопкой «Позже», но не дольше трёх суток с того момента, когда приложение
// впервые увидело эту версию. Потом экран снова обязательный.
export const DEFER_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

// Когда приложение впервые увидело обновление с этим versionCode.
export type UpdateSeen = { versionCode: number; at: number };

export function isUpdateSeen(v: unknown): v is UpdateSeen {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.versionCode === 'number' && Number.isInteger(o.versionCode) && o.versionCode > 0 && typeof o.at === 'number' && Number.isFinite(o.at);
}

// Для той же версии срок не сдвигается; вышла другая версия (новее) — три дня считаются заново.
export function registerSeen(prev: UpdateSeen | null, versionCode: number, now: number): UpdateSeen {
  return prev && prev.versionCode === versionCode ? prev : { versionCode, at: now };
}

export const deferDeadline = (seen: UpdateSeen): number => seen.at + DEFER_DAYS * DAY_MS;

// «Позже» доступно, пока не прошли трое суток с первого показа.
export const canDefer = (seen: UpdateSeen, now: number): boolean => now < deferDeadline(seen);

// Последний день отсрочки на языке приложения: «11 ноября».
export function deadlineLabel(seen: UpdateSeen): string {
  const d = new Date(deferDeadline(seen));
  return `${d.getDate()} ${tl('monthsGenitive')[d.getMonth()]}`;
}

// Экран обновления показывается: всегда при ручной проверке («Настройки» → «Проверить сейчас»);
// при автопроверке (запуск, возврат в приложение) — если не нажали «Позже» или отсрочка уже вышла.
export function shouldShowUpdate(opts: { manual: boolean; postponed: boolean; deferrable: boolean }): boolean {
  return opts.manual || !opts.postponed || !opts.deferrable;
}
