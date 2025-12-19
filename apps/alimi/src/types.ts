export type TimeOfDay = 'morning' | 'noon' | 'evening';

export type Task = {
  id: string;
  name: string;
  times: Record<TimeOfDay, boolean>;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  recurrence: Recurrence;
};

export type DailyLog = {
  date: string; // YYYY-MM-DD
  taken: Record<string, Record<TimeOfDay, boolean>>;
};

export type Recurrence =
  | { type: 'daily' }
  | { type: 'weekly'; days: number[] }; // 0=Sunday ... 6=Saturday
