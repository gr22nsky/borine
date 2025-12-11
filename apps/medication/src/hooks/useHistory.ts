import { useCallback, useMemo, useState } from 'react';

import { useAsyncEffect } from '@borine/hooks';
import { loadJson, saveJson } from '@borine/storage';
import { formatDateKey, getTodayKey } from '@borine/utils';
import { STORAGE_KEYS } from '../storage/keys';
import { DailyIntake, TimeOfDay } from '../types';

const emptyHistory: DailyIntake[] = [];

const ensureSlots = (slots?: Record<TimeOfDay, boolean>) => ({
  morning: !!slots?.morning,
  noon: !!slots?.noon,
  evening: !!slots?.evening
});

export const useHistory = () => {
  const [history, setHistory] = useState<DailyIntake[]>(emptyHistory);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const stored = await loadJson<DailyIntake[]>(STORAGE_KEYS.MEDICATION_HISTORY, emptyHistory);
    setHistory(stored);
    setLoading(false);
  }, []);

  useAsyncEffect(async () => {
    await load();
  }, [load]);

  const toggleIntake = useCallback(
    (medicationId: string, time: TimeOfDay, dateKey: string = getTodayKey()) => {
      const formattedDate = formatDateKey(new Date(dateKey));

      setHistory((prev) => {
        const record = prev.find((item) => item.date === formattedDate);
        const updatedRecord: DailyIntake = record
          ? { ...record }
          : { date: formattedDate, taken: {} };

        const currentSlots = ensureSlots(updatedRecord.taken[medicationId]);
        updatedRecord.taken[medicationId] = {
          ...currentSlots,
          [time]: !currentSlots[time]
        };

        const nextHistory = record
          ? prev.map((item) => (item.date === formattedDate ? updatedRecord : item))
          : [...prev, updatedRecord];

        void saveJson(STORAGE_KEYS.MEDICATION_HISTORY, nextHistory);
        return nextHistory;
      });
    },
    []
  );

  const getIntakeByDate = useCallback(
    (date: string) => history.find((item) => item.date === date),
    [history]
  );

  const todayIntake = useMemo(() => history.find((item) => item.date === getTodayKey()), [history]);

  return {
    history,
    loading,
    todayIntake,
    toggleIntake,
    getIntakeByDate,
    reload: load
  };
};
