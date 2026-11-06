import { getDb, getSetting, setSetting } from './index';
import { DEFAULT_REMINDER_SETTINGS, ReminderSettings, ReminderSource, formatHm, parseHm } from '@/logic/reminders';

// Все настройки напоминаний хранятся одной записью: читаются и пишутся одним запросом.
export async function loadReminderSettings(): Promise<ReminderSettings> {
  const d = DEFAULT_REMINDER_SETTINGS;
  const raw = await getSetting<Record<string, unknown>>('reminders');
  const v = raw && typeof raw === 'object' ? raw : {};
  return {
    enabled: typeof v.enabled === 'boolean' ? v.enabled : d.enabled,
    time: parseHm(v.time) ?? d.time,
    quietEnabled: typeof v.quietEnabled === 'boolean' ? v.quietEnabled : d.quietEnabled,
    quietFrom: parseHm(v.quietFrom) ?? d.quietFrom,
    quietTo: parseHm(v.quietTo) ?? d.quietTo,
  };
}

export async function saveReminderSettings(s: ReminderSettings): Promise<void> {
  await setSetting('reminders', {
    enabled: s.enabled,
    time: formatHm(s.time),
    quietEnabled: s.quietEnabled,
    quietFrom: formatHm(s.quietFrom),
    quietTo: formatHm(s.quietTo),
  });
}

// Не купленные товары с напоминанием от указанной даты. Своя дата товара главнее даты списка:
// у товара с датой решает его «Напомнить», у товара без даты — «Напомнить» списка.
export async function loadReminderSources(fromIso: string): Promise<ReminderSource[]> {
  return getDb().getAllAsync<ReminderSource>(
    `SELECT date, title FROM (
       SELECT COALESCE(i.planned_date, l.planned_date) AS date, i.title AS title, i.sort AS sort, i.id AS id
         FROM items i JOIN lists l ON l.id = i.list_id
        WHERE l.archived_at IS NULL AND i.bought_at IS NULL
          AND ((i.planned_date IS NOT NULL AND i.remind = 1)
            OR (i.planned_date IS NULL AND l.planned_date IS NOT NULL AND l.remind = 1))
     ) WHERE date >= ? ORDER BY date, sort, id`,
    fromIso,
  );
}

export async function wasReminderAsked(): Promise<boolean> {
  return (await getSetting<boolean>('reminders.asked')) === true;
}

export const markReminderAsked = () => setSetting('reminders.asked', true);
