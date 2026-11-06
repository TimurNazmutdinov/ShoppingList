import {
  DEFAULT_REMINDER_SETTINGS,
  ReminderSettings,
  applyQuietHours,
  diffSchedule,
  formatHm,
  parseHm,
  planReminders,
  reminderContent,
  reminderKey,
} from '@/logic/reminders';

const settings = (patch: Partial<ReminderSettings> = {}): ReminderSettings => ({ ...DEFAULT_REMINDER_SETTINGS, ...patch });
const now = new Date(2026, 10, 6, 12, 0); // 6 ноября 2026, 12:00

describe('время', () => {
  it('parseHm / formatHm', () => {
    expect(parseHm('09:05')).toEqual({ h: 9, m: 5 });
    expect(parseHm('24:00')).toBeNull();
    expect(parseHm('9-05')).toBeNull();
    expect(parseHm(5)).toBeNull();
    expect(formatHm({ h: 9, m: 5 })).toBe('09:05');
  });

  it('тихие часы через полночь переносят на конец', () => {
    const s = settings();
    expect(applyQuietHours(new Date(2026, 10, 7, 23, 0), s)).toEqual(new Date(2026, 10, 8, 8, 0));
    expect(applyQuietHours(new Date(2026, 10, 7, 6, 30), s)).toEqual(new Date(2026, 10, 7, 8, 0));
    expect(applyQuietHours(new Date(2026, 10, 7, 12, 0), s)).toEqual(new Date(2026, 10, 7, 12, 0));
    expect(applyQuietHours(new Date(2026, 10, 7, 23, 0), settings({ quietEnabled: false }))).toEqual(new Date(2026, 10, 7, 23, 0));
  });
});

describe('planReminders', () => {
  const sources = [
    { date: '2026-11-08', title: 'Молоко' },
    { date: '2026-11-08', title: 'Хлеб' },
    { date: '2026-11-07', title: 'Яйца' },
    { date: '2026-11-06', title: 'Соль' },
  ];

  it('одно уведомление на день, по возрастанию времени, в выбранное время', () => {
    const plan = planReminders(sources, settings({ time: { h: 10, m: 30 } }), now);
    expect(plan.map((p) => p.date)).toEqual(['2026-11-07', '2026-11-08']);
    expect(plan[1].titles).toEqual(['Молоко', 'Хлеб']);
    expect(plan[0].at).toEqual(new Date(2026, 10, 7, 10, 30));
  });

  it('сегодняшнее время уже прошло → не планируется; ещё не наступило → планируется', () => {
    expect(planReminders([{ date: '2026-11-06', title: 'Соль' }], settings({ time: { h: 9, m: 0 } }), now)).toEqual([]);
    expect(planReminders([{ date: '2026-11-06', title: 'Соль' }], settings({ time: { h: 18, m: 0 } }), now)).toHaveLength(1);
  });

  it('выключено → пусто; лимит работает', () => {
    expect(planReminders(sources, settings({ enabled: false }), now)).toEqual([]);
    expect(planReminders(sources, settings(), now, 1)).toHaveLength(1);
  });

  it('время в тихих часах переносится на их конец', () => {
    const [p] = planReminders([{ date: '2026-11-07', title: 'Яйца' }], settings({ time: { h: 23, m: 0 } }), now);
    expect(p.at).toEqual(new Date(2026, 10, 8, 8, 0));
  });
});

describe('reminderContent', () => {
  it('«Сегодня купить: молоко, хлеб и ещё 3»', () => {
    const at = new Date(2026, 10, 7, 9, 0);
    expect(reminderContent({ at, date: '2026-11-07', titles: ['молоко', 'хлеб'] })).toEqual({ title: 'Сегодня купить', body: 'молоко, хлеб' });
    expect(reminderContent({ at, date: '2026-11-07', titles: ['молоко', 'хлеб', 'яйца', 'сыр', 'соль', 'чай'] }).body).toBe('молоко, хлеб, яйца и ещё 3');
  });
});

describe('diffSchedule', () => {
  it('совпавшее остаётся, лишнее отменяется, недостающее добавляется', () => {
    const k1 = reminderKey(1, 'a', 'b', {});
    const k2 = reminderKey(2, 'a', 'b', {});
    const k3 = reminderKey(3, 'a', 'b', {});
    expect(diffSchedule([{ id: 'x', key: k1 }, { id: 'y', key: k2 }, { id: 'z', key: null }], [k1, k3])).toEqual({ cancel: ['y', 'z'], add: [1] });
  });
});
