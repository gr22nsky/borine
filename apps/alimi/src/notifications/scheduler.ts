import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { formatDateKey, getTodayKey, getWeekdayIndex, isBetweenDates } from '@borine/utils';
import {
  defaultMealTimes,
  loadMealTimes,
  loadNotificationEnabled,
  MealTimes
} from '../storage/settings';
import { DailyLog, Task, TimeOfDay } from '../types';

type SlotConfig = { key: TimeOfDay; label: string };

const timeSlots: SlotConfig[] = [
  { key: 'morning', label: '아침' },
  { key: 'noon', label: '점심' },
  { key: 'evening', label: '저녁' }
];

let notificationHandlerSet = false;

const ensureHandler = () => {
  if (notificationHandlerSet) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true
    })
  });
  notificationHandlerSet = true;
};

const ensurePermission = async () => {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }
  const request = await Notifications.requestPermissionsAsync();
  return request.granted || request.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
};

const ensureChannel = async () => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('alimi-reminders', {
    name: 'Alimi Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    enableVibrate: true,
    enableLights: false
  });
};

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const isActiveForDate = (task: Task, dateKey: string) => {
  if (!isBetweenDates(dateKey, task.startDate, task.endDate)) return false;
  if (task.recurrence.type === 'daily') return true;
  const weekday = getWeekdayIndex(dateKey);
  return task.recurrence.days.includes(weekday);
};

const parseTimeToDate = (dateKey: string, value: string) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [hour, minute] = value.split(':').map(Number);
  if (!y || !m || !d || isNaN(hour) || isNaN(minute)) return null;
  return new Date(y, m - 1, d, hour, minute, 0, 0);
};

const isTaken = (history: DailyLog[], dateKey: string, taskId: string, slot: TimeOfDay) => {
  const record = history.find((item) => item.date === dateKey);
  return !!record?.taken?.[taskId]?.[slot];
};

const buildBody = (slotLabel: string, tasks: Task[]) => {
  if (tasks.length === 0) return '';
  if (tasks.length === 1) return `${slotLabel} 할 일: ${tasks[0].name}\n지금 확인해보세요.`;
  const [first, ...rest] = tasks;
  return `${slotLabel} 할 일: ${first.name} 외 ${rest.length}개\n지금 확인해보세요.`;
};

const scheduleForDate = async (
  dateKey: string,
  mealTimes: MealTimes,
  tasks: Task[],
  history: DailyLog[]
) => {
  const active = tasks.filter((task) => isActiveForDate(task, dateKey));
  if (active.length === 0) return;

  for (const slot of timeSlots) {
    const pending = active.filter((task) => task.times[slot.key] && !isTaken(history, dateKey, task.id, slot.key));
    if (pending.length === 0) continue;

    const timeValue = mealTimes[slot.key] || defaultMealTimes[slot.key];
    const triggerDate = parseTimeToDate(dateKey, timeValue);
    if (!triggerDate || triggerDate.getTime() <= Date.now()) continue;

    const body = buildBody(slot.label, pending);
    const trigger: Notifications.DateTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      ...(Platform.OS === 'android' ? { channelId: 'alimi-reminders' } : null)
    };

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '보리네 알리미',
        body,
        sound: true,
        data: { slot: slot.key, date: dateKey },
        priority: Notifications.AndroidNotificationPriority.HIGH
      },
      trigger
    });
  }
};

export const refreshTaskNotifications = async (tasks: Task[], history: DailyLog[]) => {
  ensureHandler();
  const enabled = await loadNotificationEnabled();
  if (!enabled) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return;
  }
  const granted = await ensurePermission();
  if (!granted) return;
  await ensureChannel();

  const mealTimes = await loadMealTimes();

  await Notifications.cancelAllScheduledNotificationsAsync();

  const dates: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    dates.push(i === 0 ? getTodayKey() : formatDateKey(addDays(new Date(), i)));
  }

  for (const dateKey of dates) await scheduleForDate(dateKey, mealTimes, tasks, history);
};
