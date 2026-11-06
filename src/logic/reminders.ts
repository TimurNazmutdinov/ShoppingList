import { t } from '@/i18n';
import { parseIsoDate } from './dates';

// Чистая логика напоминаний: какие уведомления и когда запланировать. Без доступа к БД и ОС.
// Одно уведомление на день: «Сегодня купить: молоко, хлеб и ещё 3».

export type Hm = { h: number; m: number };

export type ReminderSettings = {
  enabled: boolean;
  time: Hm;
  quietEnabled: boolean;
  quietFrom: Hm;
  quietTo: Hm;
};

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  time: { h: 9, m: 0 },
  quietEnabled: true,
  quietFrom: { h: 22, m: 0 },
  quietTo: { h: 8, m: 0 },
};

// Лимит ОС на запланированные уведомления (на Android — 500, на iOS — 64), берём с запасом.
export const MAX_SCHEDULED = 50;
const MAX_TITLES = 3;

// Товар с напоминанием: дата уже вычислена (своя или списка).
export type ReminderSource = { date: string; title: string };

export type PlannedReminder = { at: Date; date: string; titles: string[] };

// ---- Время ----

const pad = (n: number) => String(n).padStart(2, '0');

export const formatHm = (hm: Hm): string => `${pad(hm.h)}:${pad(hm.m)}`;

export function parseHm(value: unknown): Hm | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h <= 23 && m <= 59 ? { h, m } : null;
}

const minutes = (hm: Hm) => hm.h * 60 + hm.m;

// Момент внутри тихих часов → конец тихих часов. Окно может переходить через полночь.
export function applyQuietHours(at: Date, settings: Pick<ReminderSettings, 'quietEnabled' | 'quietFrom' | 'quietTo'>): Date {
  if (!settings.quietEnabled) return at;
  const from = minutes(settings.quietFrom);
  const to = minutes(settings.quietTo);
  if (from === to) return at;
  const now = at.getHours() * 60 + at.getMinutes();
  const result = new Date(at.getFullYear(), at.getMonth(), at.getDate(), settings.quietTo.h, settings.quietTo.m);
  if (from < to) return now >= from && now < to ? result : at;
  if (now >= from) {
    result.setDate(result.getDate() + 1);
    return result;
  }
  return now < to ? result : at;
}

// ---- Расчёт ----

// Ближайшие напоминания: по возрастанию времени, не больше limit. Прошедшее время не планируется.
export function planReminders(sources: readonly ReminderSource[], settings: ReminderSettings, now: Date, limit: number = MAX_SCHEDULED): PlannedReminder[] {
  if (!settings.enabled) return [];
  const byDate = new Map<string, string[]>();
  for (const s of sources) {
    const titles = byDate.get(s.date) ?? [];
    titles.push(s.title);
    byDate.set(s.date, titles);
  }
  const planned: PlannedReminder[] = [];
  for (const [date, titles] of byDate) {
    const day = parseIsoDate(date);
    const at = applyQuietHours(new Date(day.getFullYear(), day.getMonth(), day.getDate(), settings.time.h, settings.time.m), settings);
    if (at.getTime() > now.getTime()) planned.push({ at, date, titles });
  }
  return planned.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, Math.max(0, limit));
}

// ---- Тексты ----

export type ReminderContent = { title: string; body: string };

// «Сегодня купить» / «молоко, хлеб, яйца и ещё 3».
export function reminderContent(p: PlannedReminder): ReminderContent {
  const shown = p.titles.slice(0, MAX_TITLES).join(', ');
  const rest = p.titles.length - MAX_TITLES;
  return { title: t('reminder.title'), body: rest > 0 ? `${shown} ${t('reminder.more', { n: rest })}` : shown };
}

// Значение для строки в Настройках: «Вкл» или «Выкл».
export function reminderSummary(settings: ReminderSettings, allowed: boolean): string {
  return settings.enabled && allowed ? t('reminders.on') : t('reminders.off');
}

// ---- Сверка расписания ----

export type ScheduledRef = { id: string; key: string | null };

// Ключ напоминания: момент + текст + данные. Совпавшие ключи не нужно отменять и планировать заново.
export const reminderKey = (atMs: number, title: string, body: string, data: unknown): string =>
  JSON.stringify([atMs, title, body, data]);

// Что отменить (id) и что запланировать (индексы в planned), чтобы расписание совпало с планом.
// Ключ null (не удалось прочитать) — всегда отменяется. Одинаковые ключи считаются по количеству.
export function diffSchedule(scheduled: ScheduledRef[], plannedKeys: string[]): { cancel: string[]; add: number[] } {
  const wanted = new Map<string, number>();
  for (const key of plannedKeys) wanted.set(key, (wanted.get(key) ?? 0) + 1);

  const kept = new Map<string, number>();
  const cancel: string[] = [];
  for (const s of scheduled) {
    const left = s.key === null ? 0 : (wanted.get(s.key) ?? 0);
    if (s.key !== null && left > 0) {
      wanted.set(s.key, left - 1);
      kept.set(s.key, (kept.get(s.key) ?? 0) + 1);
    } else cancel.push(s.id);
  }

  const add: number[] = [];
  plannedKeys.forEach((key, i) => {
    const left = kept.get(key) ?? 0;
    if (left > 0) kept.set(key, left - 1);
    else add.push(i);
  });
  return { cancel, add };
}
