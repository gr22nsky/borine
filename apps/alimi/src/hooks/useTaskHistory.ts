import { useCallback, useMemo, useState } from 'react';

import { useAsyncEffect } from '@borine/hooks';
import { loadJson, saveJson } from '@borine/storage';
import { formatDateKey, getTodayKey } from '@borine/utils';
import { STORAGE_KEYS } from '../storage/keys';
import { DailyLog, TimeOfDay } from '../types';

const emptyHistory: DailyLog[] = [];

const ensureSlots = (slots?: Record<TimeOfDay, boolean>) => ({
  morning: !!slots?.morning,
  noon: !!slots?.noon,
  evening: !!slots?.evening
});

export const useTaskHistory = () => {
  const [history, setHistory] = useState<DailyLog[]>(emptyHistory);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const stored = await loadJson<DailyLog[]>(STORAGE_KEYS.TASK_HISTORY, emptyHistory);
    setHistory(stored);
    setLoading(false);
  }, []);

  useAsyncEffect(async () => {
    await load();
  }, [load]);

  const toggleIntake = useCallback(
    (taskId: string, time: TimeOfDay, dateKey: string = getTodayKey()) => {
      const formattedDate = formatDateKey(new Date(dateKey));

      setHistory((prev) => {
        const record = prev.find((item) => item.date === formattedDate);
        const updatedRecord: DailyLog = record
          ? { ...record }
          : { date: formattedDate, taken: {} };

        const currentSlots = ensureSlots(updatedRecord.taken[taskId]);
        updatedRecord.taken[taskId] = {
          ...currentSlots,
          [time]: !currentSlots[time]
        };

        const nextHistory = record
          ? prev.map((item) => (item.date === formattedDate ? updatedRecord : item))
          : [...prev, updatedRecord];

        void saveJson(STORAGE_KEYS.TASK_HISTORY, nextHistory);
        return nextHistory;
      });
    },
    []
  );

  const getLogByDate = useCallback(
    (date: string) => history.find((item) => item.date === date),
    [history]
  );

  const todayLog = useMemo(() => history.find((item) => item.date === getTodayKey()), [history]);

  return {
    history,
    loading,
    todayLog,
    toggleIntake,
    getLogByDate,
    reload: load
  };
};
