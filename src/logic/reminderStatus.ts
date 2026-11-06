import { toIsoDate } from './dates';

export type StatusItem = 'notifications' | 'exactAlarms' | 'battery';

export type StatusInput = { notifications: boolean; exactAlarms: boolean; batteryUnrestricted: boolean };

// Что мешает напоминаниям приходить вовремя (в порядке показа).
export function statusProblems(input: StatusInput): StatusItem[] {
  const problems: StatusItem[] = [];
  if (!input.notifications) problems.push('notifications');
  if (!input.exactAlarms) problems.push('exactAlarms');
  if (!input.batteryUnrestricted) problems.push('battery');
  return problems;
}

export type NextWhen = { day: 'today' | 'tomorrow' | 'date'; iso: string; time: string };

const pad = (n: number) => String(n).padStart(2, '0');

// Когда ближайшее напоминание: сегодня / завтра / в другой день (дата в iso), и время «ЧЧ:ММ».
export function describeNext(at: Date | null, now: Date): NextWhen | null {
  if (!at) return null;
  const iso = toIsoDate(at);
  const today = toIsoDate(now);
  const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const day = iso === today ? 'today' : iso === toIsoDate(tomorrowDate) ? 'tomorrow' : 'date';
  return { day, iso, time: `${pad(at.getHours())}:${pad(at.getMinutes())}` };
}
