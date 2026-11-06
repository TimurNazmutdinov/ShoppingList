import {
  addDays,
  daysLeft,
  formatDayTitle,
  formatLeftLong,
  formatLong,
  formatRelative,
  formatShort,
  isNearDeadline,
  parseIsoDate,
  toIsoDate,
} from '@/logic/dates';

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 10, 4, 15, 30)); // 4 ноября 2026, день
});
afterEach(() => jest.useRealTimers());

describe('daysLeft', () => {
  it('сегодня — 0, завтра — 1, вчера — -1', () => {
    expect(daysLeft('2026-11-04')).toBe(0);
    expect(daysLeft('2026-11-05')).toBe(1);
    expect(daysLeft('2026-11-03')).toBe(-1);
  });

  it('считает через конец месяца и года', () => {
    expect(daysLeft('2026-12-31')).toBe(57);
    expect(daysLeft('2027-01-01')).toBe(58);
  });

  it('не зависит от времени суток', () => {
    jest.setSystemTime(new Date(2026, 10, 4, 23, 59));
    expect(daysLeft('2026-11-05')).toBe(1);
    jest.setSystemTime(new Date(2026, 10, 4, 0, 1));
    expect(daysLeft('2026-11-05')).toBe(1);
  });

  it('переход на зимнее время не сбивает счёт', () => {
    jest.setSystemTime(new Date(2026, 9, 20, 12));
    expect(daysLeft('2026-11-04')).toBe(15);
  });
});

describe('isNearDeadline (≤ 3 дней)', () => {
  it.each([
    ['2026-11-01', true], // просрочено
    ['2026-11-04', true],
    ['2026-11-07', true], // ровно 3
    ['2026-11-08', false], // 4
  ])('%s → %s', (iso, expected) => {
    expect(isNearDeadline(iso)).toBe(expected);
  });
});

describe('текстовые подписи', () => {
  it('formatRelative', () => {
    expect(formatRelative('2026-11-02')).toBe('просрочено 2 дня');
    expect(formatRelative('2026-11-04')).toBe('сегодня');
    expect(formatRelative('2026-11-05')).toBe('завтра');
    expect(formatRelative('2026-11-16')).toBe('через 12 дней');
  });

  it('formatLeftLong', () => {
    expect(formatLeftLong('2026-10-30')).toBe('просрочено 5 дней');
    expect(formatLeftLong('2026-11-04')).toBe('срок сегодня');
    expect(formatLeftLong('2026-11-05')).toBe('осталось 1 день');
    expect(formatLeftLong('2026-11-06')).toBe('осталось 2 дня');
    expect(formatLeftLong('2026-11-16')).toBe('осталось 12 дней');
    expect(formatLeftLong('2026-11-25')).toBe('осталось 21 день');
  });

  it('форматы даты', () => {
    expect(formatShort('2026-11-05')).toBe('05.11');
    expect(formatLong('2026-11-05')).toBe('5 ноября 2026');
    expect(formatDayTitle('2026-11-05')).toBe('Четверг, 5 ноября');
  });
});

describe('граничные даты', () => {
  it('31-е число', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-31', 1)).toBe('2026-04-01');
    expect(addDays('2026-05-01', -1)).toBe('2026-04-30');
  });

  it('переход года', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('29 февраля', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01'); // 2027 не високосный
    expect(toIsoDate(parseIsoDate('2028-02-29'))).toBe('2028-02-29');
    expect(formatLong('2028-02-29')).toBe('29 февраля 2028');
  });

  it('daysLeft через 29 февраля', () => {
    jest.setSystemTime(new Date(2028, 1, 28, 10));
    expect(daysLeft('2028-03-01')).toBe(2);
  });
});
