import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { useAsyncEffect } from '@borine/hooks';
import { loadJson, saveJson } from '@borine/storage';
import { getTodayKey } from '@borine/utils';
import { Task, TimeOfDay } from '../types';
import { STORAGE_KEYS } from '../storage/keys';

const emptyList: Task[] = [];
const emptyIdMap: Record<string, string> = {};

const parseBaseName = (name: string) => {
  const match = name.match(/^(.*) \((\d+)\)$/);
  if (!match) return { base: name, index: 1 };
  return { base: match[1], index: Number(match[2]) || 1 };
};

const normalizeNames = (list: Task[]) => {
  const grouped = new Map<string, Task[]>();
  list.forEach((task) => {
    const { base } = parseBaseName(task.name);
    if (!grouped.has(base)) grouped.set(base, []);
    grouped.get(base)!.push(task);
  });

  const result: Task[] = [];
  const idMap: Record<string, string> = {};

  grouped.forEach((group, base) => {
    const sorted = [...group].sort((a, b) => {
      const pa = parseBaseName(a.name).index;
      const pb = parseBaseName(b.name).index;
      if (pa === pb) return a.name.localeCompare(b.name);
      return pa - pb;
    });
    sorted.forEach((task, idx) => {
      const name = idx === 0 ? base : `${base} (${idx + 1})`;
      const updated: Task = { ...task, name };
      result.push(updated);
      idMap[name] = task.id;
    });
  });

  return { list: result, idMap };
};

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>(emptyList);
  const [idMap, setIdMap] = useState<Record<string, string>>(emptyIdMap);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [stored, storedIdMap] = await Promise.all([
      loadJson<Task[]>(STORAGE_KEYS.TASK_LIST, emptyList),
      loadJson<Record<string, string>>(STORAGE_KEYS.TASK_ID_MAP, emptyIdMap)
    ]);
    const normalized = stored.map((item) => ({
      ...item,
      startDate: item.startDate ?? getTodayKey(),
      recurrence: item.recurrence ?? { type: 'daily' }
    }));
    setTasks(normalized);
    setIdMap(storedIdMap);
    setLoading(false);
  }, []);

  useAsyncEffect(async () => {
    await load();
  }, [load]);

  const persist = useCallback(async (next: Task[]) => {
    setTasks(next);
    await saveJson(STORAGE_KEYS.TASK_LIST, next);
  }, []);

  const persistIdMap = useCallback(async (map: Record<string, string>) => {
    setIdMap(map);
    await saveJson(STORAGE_KEYS.TASK_ID_MAP, map);
  }, []);

  const addTask = useCallback(
    async (
      name: string,
      times: Partial<Record<TimeOfDay, boolean>>,
      startDate: string,
      endDate: string | undefined,
      recurrence: Task['recurrence']
    ) => {
      const trimmed = name.trim();
      if (!trimmed) return null;

      const baseName = trimmed;
      const dupCount = tasks.filter((m) => m.name === baseName || m.name.startsWith(`${baseName} (`)).length;
      const finalName = dupCount === 0 ? baseName : `${baseName} (${dupCount + 1})`;

      const existingId = idMap[finalName];
      const newTask: Task = {
        id: existingId || uuidv4(),
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

      const next = [...tasks, newTask];
      const normalized = normalizeNames(next);
      await Promise.all([persist(normalized.list), persistIdMap({ ...idMap, ...normalized.idMap })]);
      return normalized.list.find((m) => m.id === newTask.id) ?? newTask;
    },
    [idMap, tasks, persist, persistIdMap]
  );

  const removeTask = useCallback(
    async (id: string) => {
      const next = tasks.filter((item) => item.id !== id);
      const { list, idMap: nextMap } = normalizeNames(next);
      await Promise.all([persist(list), persistIdMap(nextMap)]);
    },
    [tasks, persist, persistIdMap]
  );

  const updateTask = useCallback(
    async (
      id: string,
      payload: {
        name: string;
        times: Record<TimeOfDay, boolean>;
        startDate: string;
        endDate?: string;
        recurrence: Task['recurrence'];
      }
    ) => {
      const exists = tasks.find((m) => m.id === id);
      if (!exists) return null;

      const trimmed = payload.name.trim();
      if (!trimmed) return null;

      const next = tasks.map((m) =>
        m.id === id
          ? {
              ...m,
              name: trimmed,
              times: payload.times,
              startDate: payload.startDate,
              endDate: payload.endDate,
              recurrence: payload.recurrence
            }
          : m
      );

      const { list, idMap: nextMap } = normalizeNames(next);
      await Promise.all([persist(list), persistIdMap(nextMap)]);
      return list.find((m) => m.id === id) ?? null;
    },
    [tasks, persist, persistIdMap]
  );

  return {
    tasks,
    loading,
    addTask,
    updateTask,
    removeTask,
    reload: load
  };
};
