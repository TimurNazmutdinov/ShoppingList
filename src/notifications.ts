import { useEffect } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { getLanguage, t } from '@/i18n';
import { onDataChange } from '@/db';
import { loadReminderSettings, loadReminderSources } from '@/db/reminders';
import { PlannedReminder, ReminderSettings, diffSchedule, planReminders, reminderContent, reminderKey } from '@/logic/reminders';
import { todayIso } from '@/logic/dates';

// Важность канала после создания не меняется, поэтому канал сразу создаётся с высокой важностью.
const CHANNEL_ID = 'reminders-v1';
const TEST_ID = 'reminder-test';
const RESCHEDULE_DELAY_MS = 400;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function getPermissionState(): Promise<PermissionState> {
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return 'granted';
  return p.status === 'denied' ? 'denied' : 'undetermined';
}

// Канал создаётся на Android до первого уведомления (и до запроса разрешения на Android 13+).
// Если канал не создался (в Expo Go бывает), уведомления идут через системный канал по умолчанию.
let channelReady = false;

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android' || channelReady) return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: t('reminders.channel'),
      // AndroidImportance.HIGH: всплывает поверх экрана. Сам enum в рантайме недоступен, поэтому число (4).
      importance: 4 as Notifications.AndroidImportance,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F0702A',
      sound: 'default',
    });
    channelReady = true;
  } catch (e) {
    console.warn('notification channel', e);
  }
}

const triggerChannel = () => (channelReady ? { channelId: CHANNEL_ID } : {});

export async function requestPermission(): Promise<PermissionState> {
  await ensureChannel();
  const p = await Notifications.requestPermissionsAsync();
  if (p.granted) return 'granted';
  return p.status === 'denied' ? 'denied' : 'undetermined';
}

export const openPhoneSettings = () => Linking.openSettings();

// Вызывается, когда пользователь впервые включает «Напомнить»: просим разрешение в нужный момент.
export async function askReminderPermission(): Promise<void> {
  if ((await getPermissionState()) === 'undetermined') await requestPermission();
  await rescheduleReminders();
}

// ---- Расписание ----

type NotificationData = { type: 'day'; date: string };

const dataFor = (p: PlannedReminder): NotificationData => ({ type: 'day', date: p.date });

let queue: Promise<void> = Promise.resolve();

// Отменяет наши запланированные и планирует заново ближайшие. Вызовы идут по очереди.
// Ошибка не пробрасывается: приложение работает и без напоминаний.
export function rescheduleReminders(): Promise<void> {
  queue = queue.then(doReschedule).catch((e) => console.warn('reminders', e));
  return queue;
}

async function buildPlan(settings: ReminderSettings, now: Date): Promise<PlannedReminder[]> {
  const sources = await loadReminderSources(todayIso());
  return planReminders(sources, settings, now);
}

// Сколько напоминаний запланировано и когда ближайшее (для блока «Состояние»).
export async function getPlanSummary(): Promise<{ count: number; next: Date | null }> {
  const settings = await loadReminderSettings();
  if (!settings.enabled) return { count: 0, next: null };
  const plan = await buildPlan(settings, new Date());
  return { count: plan.length, next: plan[0]?.at ?? null };
}

// Время срабатывания запланированного уведомления в мс; null, если формат неизвестен.
function triggerMs(n: Notifications.NotificationRequest): number | null {
  const trigger = n.trigger as { type?: string; value?: unknown } | null;
  return trigger?.type === 'date' && typeof trigger.value === 'number' ? trigger.value : null;
}

// Приводит расписание к плану: совпавшие уведомления остаются, лишние отменяются, недостающие добавляются.
async function doReschedule(): Promise<void> {
  const scheduled = (await Notifications.getAllScheduledNotificationsAsync()).filter((n) => n.identifier !== TEST_ID);
  const settings = await loadReminderSettings();
  const permission = await getPermissionState();
  if (!settings.enabled || permission !== 'granted') {
    for (const n of scheduled) await Notifications.cancelScheduledNotificationAsync(n.identifier);
    return;
  }

  await ensureChannel();
  const plan = await buildPlan(settings, new Date());
  const contents = plan.map((p) => ({ ...reminderContent(p), data: dataFor(p) }));
  const keys = plan.map((p, i) => reminderKey(p.at.getTime(), contents[i].title, contents[i].body, contents[i].data));
  const refs = scheduled.map((n) => {
    const at = triggerMs(n);
    return { id: n.identifier, key: at === null ? null : reminderKey(at, n.content.title ?? '', n.content.body ?? '', n.content.data) };
  });

  const { cancel, add } = diffSchedule(refs, keys);
  for (const id of cancel) await Notifications.cancelScheduledNotificationAsync(id);
  for (const i of add) {
    const { title, body, data } = contents[i];
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: plan[i].at, ...triggerChannel() },
    });
  }
}

export async function sendTestNotification(): Promise<void> {
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    identifier: TEST_ID,
    content: { title: t('reminders.testTitle'), body: t('reminders.testBody') },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10, ...triggerChannel() },
  });
}

// ---- Подключение к приложению ----

function isNotificationData(value: unknown): value is NotificationData {
  if (!value || typeof value !== 'object') return false;
  const d = value as Record<string, unknown>;
  return d.type === 'day' && typeof d.date === 'string';
}

// Пересчёт расписания при запуске, возврате в приложение, изменении данных и языка;
// нажатие на уведомление открывает «Сегодня».
export function useReminderSync(): void {
  const router = useRouter();
  const language = getLanguage();

  useEffect(() => {
    rescheduleReminders();
  }, [language]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = onDataChange(() => {
      clearTimeout(timer);
      timer = setTimeout(() => rescheduleReminders(), RESCHEDULE_DELAY_MS);
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') rescheduleReminders();
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
      appState.remove();
    };
  }, []);

  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!isNotificationData(response?.notification.request.content.data)) return;
      router.navigate('/' as never);
    };
    open(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, [router]);
}
