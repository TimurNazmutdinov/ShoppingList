import { tl } from '@/i18n';
import { daysLeft, parseIsoDate, toIsoDate } from './dates';

// Дата товара: своя, иначе дата списка.
export function effectiveDate(itemDate: string | null, listDate: string | null): string | null {
  return itemDate ?? listDate;
}

// Недели месяца с понедельника: пустые ячейки — null. month0 — как в Date (0 = январь).
export function buildMonth(year: number, month0: number): (string | null)[][] {
  const first = new Date(year, month0, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month0 + 1, 0).getDate();
  const cells: (string | null)[] = [...Array<null>(lead).fill(null)];
  for (let d = 1; d <= days; d++) cells.push(toIsoDate(new Date(year, month0, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function monthRange(year: number, month0: number): { from: string; to: string } {
  return { from: toIsoDate(new Date(year, month0, 1)), to: toIsoDate(new Date(year, month0 + 1, 0)) };
}

// Не больше трёх точек на день, цвета без повторов.
export function dayMarks(entries: readonly { date: string; color: string }[]): Map<string, string[]> {
  const marks = new Map<string, string[]>();
  for (const e of entries) {
    const colors = marks.get(e.date) ?? [];
    if (!colors.includes(e.color) && colors.length < 3) colors.push(e.color);
    marks.set(e.date, colors);
  }
  return marks;
}

// «сегодня», «завтра», «пт, 8 нояб»; прошедшая дата — тоже в таком виде, просрочку определяет экран.
export function cardDateLabel(iso: string, todayLabel: string, tomorrowLabel: string): string {
  const n = daysLeft(iso);
  if (n === 0) return todayLabel;
  if (n === 1) return tomorrowLabel;
  const d = parseIsoDate(iso);
  return `${tl('weekdaysShort')[d.getDay()].toLowerCase()}, ${d.getDate()} ${tl('monthsShort')[d.getMonth()]}`;
}

// Для экрана «Сегодня»: на сегодня и с прошлых дней.
export function splitDue<T extends { effectiveDate: string }>(items: readonly T[], today: string): { today: T[]; overdue: T[] } {
  return {
    today: items.filter((i) => i.effectiveDate === today),
    overdue: items.filter((i) => i.effectiveDate < today),
  };
}
