export const getTodayKey = () => formatDateKey(new Date());

export const formatDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDisplayDate = (value: string) => {
  const parts = value.split('-').map(Number);
  if (parts.length !== 3) return value;
  const [year, month, day] = parts;
  return `${year}년 ${month}월 ${day}일`;
};

export const isWithinLastDays = (dateKey: string, days: number, base: Date = new Date()) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return false;
  const target = new Date(year, month - 1, day);
  const diff = base.getTime() - target.getTime();
  const dayMs = 1000 * 60 * 60 * 24;
  return diff >= 0 && diff <= days * dayMs;
};

export const isBetweenDates = (targetKey: string, startKey: string, endKey?: string) => {
  if (!startKey) return false;
  const target = new Date(targetKey);
  const start = new Date(startKey);
  if (target < start) return false;
  if (!endKey) return true;
  const end = new Date(endKey);
  return target <= end;
};

export const getWeekdayIndex = (dateKey: string) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return -1;
  return new Date(y, m - 1, d).getDay(); // 0=Sun
};

export const countScheduledDoses = (medication: { times: Record<string, boolean> }) =>
  ['morning', 'noon', 'evening'].filter((t) => medication.times?.[t]).length;
