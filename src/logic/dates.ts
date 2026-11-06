import { t, tl, tn } from '@/i18n';

const DAY_MS = 24 * 60 * 60 * 1000;
const NEAR_DAYS = 3;

const pad = (n: number) => String(n).padStart(2, '0');

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// «Четверг, 5 ноября».
export function formatDayTitle(iso: string): string {
  const d = parseIsoDate(iso);
  return t('date.dayTitle', {
    weekday: tl('weekdays')[d.getDay()],
    day: d.getDate(),
    month: tl('monthsGenitive')[d.getMonth()],
  });
}

// Дата со сдвигом в днях.
export function addDays(iso: string, n: number): string {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + n);
  return toIsoDate(d);
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

// Сколько дней от сегодня до даты (отрицательное — уже прошло).
export function daysLeft(iso: string): number {
  const today = parseIsoDate(todayIso());
  return Math.round((parseIsoDate(iso).getTime() - today.getTime()) / DAY_MS);
}

export function isNearDeadline(iso: string): boolean {
  return daysLeft(iso) <= NEAR_DAYS;
}

export function formatShort(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}.${m}`;
}

export function formatFull(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export function formatLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return t('date.long', { day: d, month: tl('monthsGenitive')[m - 1], year: y });
}

// «через 12 дней», «завтра», «сегодня», «просрочено 2 дня».
export function formatRelative(iso: string): string {
  const n = daysLeft(iso);
  if (n < 0) return t('date.overdue', { days: tn('unit.day', -n) });
  if (n === 0) return t('date.today');
  if (n === 1) return t('date.tomorrow');
  return t('date.inDays', { days: tn('unit.day', n) });
}

// «осталось 12 дней», «осталось 1 день», «просрочено 3 дня».
export function formatLeftLong(iso: string): string {
  const n = daysLeft(iso);
  if (n < 0) return t('date.overdue', { days: tn('unit.day', -n) });
  if (n === 0) return t('date.dueToday');
  return t('date.left', { days: tn('unit.day', n) });
}
