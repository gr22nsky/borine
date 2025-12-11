import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { useAsyncEffect } from '@borine/hooks';
import { loadJson, saveJson } from '@borine/storage';
import { getTodayKey } from '@borine/utils';
import { Medication, TimeOfDay } from '../types';
import { STORAGE_KEYS } from '../storage/keys';

const emptyList: Medication[] = [];

export const useMedications = () => {
  const [medications, setMedications] = useState<Medication[]>(emptyList);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const stored = await loadJson<Medication[]>(STORAGE_KEYS.MEDICATION_LIST, emptyList);
    const normalized = stored.map((item) => ({
      ...item,
      startDate: item.startDate ?? getTodayKey(),
      recurrence: item.recurrence ?? { type: 'daily' }
    }));
    setMedications(normalized);
    setLoading(false);
  }, []);

  useAsyncEffect(async () => {
    await load();
  }, [load]);

  const persist = useCallback(async (next: Medication[]) => {
    setMedications(next);
    await saveJson(STORAGE_KEYS.MEDICATION_LIST, next);
  }, []);

  const addMedication = useCallback(
    async (
      name: string,
      times: Partial<Record<TimeOfDay, boolean>>,
      startDate: string,
      endDate: string | undefined,
      recurrence: Medication['recurrence']
    ) => {
      const trimmed = name.trim();
      if (!trimmed) return null;

      const baseName = trimmed;
      const dupCount = medications.filter((m) => m.name === baseName || m.name.startsWith(`${baseName} (`)).length;
      const finalName = dupCount === 0 ? baseName : `${baseName} (${dupCount + 1})`;

      const newMedication: Medication = {
        id: uuidv4(),
        name: finalName,
        times: {
          morning: !!times.morning,
          noon: !!times.noon,
          evening: !!times.evening
        },
        startDate,
        endDate,
        recurrence
      };

      const next = [...medications, newMedication];
      await persist(next);
      return newMedication;
    },
    [medications, persist]
  );

  const removeMedication = useCallback(
    async (id: string) => {
      const next = medications.filter((item) => item.id !== id);
      persist(next);
    },
    [medications, persist]
  );

  return {
    medications,
    loading,
    addMedication,
    removeMedication,
    reload: load
  };
};
