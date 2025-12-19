import { loadJson, saveJson } from '@borine/storage';

export type MealTimes = {
  morning: string;
  noon: string;
  evening: string;
};

export const SETTINGS_KEYS = {
  MEAL_TIMES: 'BORINE_SETTINGS_MEAL_TIMES',
  NOTIFICATION_ENABLED: 'BORINE_SETTINGS_NOTIFICATION_ENABLED'
};

export const defaultMealTimes: MealTimes = {
  morning: '08:00',
  noon: '12:30',
  evening: '19:00'
};

export const loadMealTimes = () => loadJson<MealTimes>(SETTINGS_KEYS.MEAL_TIMES, defaultMealTimes);

export const saveMealTimes = (value: MealTimes) => saveJson(SETTINGS_KEYS.MEAL_TIMES, value);

export const loadNotificationEnabled = () =>
  loadJson<boolean>(SETTINGS_KEYS.NOTIFICATION_ENABLED, true);

export const saveNotificationEnabled = (value: boolean) =>
  saveJson(SETTINGS_KEYS.NOTIFICATION_ENABLED, value);
