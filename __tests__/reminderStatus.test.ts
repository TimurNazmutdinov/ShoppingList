import { describeNext, statusProblems } from '@/logic/reminderStatus';

describe('statusProblems', () => {
  it('всё в порядке → проблем нет', () => {
    expect(statusProblems({ notifications: true, exactAlarms: true, batteryUnrestricted: true })).toEqual([]);
  });

  it('проблемы идут в порядке показа', () => {
    expect(statusProblems({ notifications: false, exactAlarms: false, batteryUnrestricted: false })).toEqual([
      'notifications',
      'exactAlarms',
      'battery',
    ]);
    expect(statusProblems({ notifications: true, exactAlarms: false, batteryUnrestricted: true })).toEqual(['exactAlarms']);
  });
});

describe('describeNext', () => {
  const now = new Date(2026, 10, 6, 12, 0);

  it('нет напоминаний → null', () => {
    expect(describeNext(null, now)).toBeNull();
  });

  it('сегодня, завтра, другой день', () => {
    expect(describeNext(new Date(2026, 10, 6, 18, 5), now)).toEqual({ day: 'today', iso: '2026-11-06', time: '18:05' });
    expect(describeNext(new Date(2026, 10, 7, 9, 0), now)).toEqual({ day: 'tomorrow', iso: '2026-11-07', time: '09:00' });
    expect(describeNext(new Date(2026, 10, 12, 9, 0), now)).toEqual({ day: 'date', iso: '2026-11-12', time: '09:00' });
  });

  it('завтра через границу месяца', () => {
    expect(describeNext(new Date(2026, 11, 1, 9, 0), new Date(2026, 10, 30, 20, 0))?.day).toBe('tomorrow');
  });
});
