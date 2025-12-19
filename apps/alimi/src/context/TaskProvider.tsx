import { createContext, ReactNode, useContext, useMemo } from 'react';

import { useTaskHistory } from '../hooks/useTaskHistory';
import { useTasks } from '../hooks/useTasks';
import { DailyLog, Recurrence, Task, TimeOfDay } from '../types';

type TaskContextValue = {
  tasks: Task[];
  history: DailyLog[];
  loading: boolean;
  todayLog?: DailyLog;
  addTask: (
    name: string,
    times: Partial<Record<TimeOfDay, boolean>>,
    startDate: string,
    endDate: string | undefined,
    recurrence: Recurrence
  ) => Promise<Task | null>;
  updateTask: (
    id: string,
    payload: {
      name: string;
      times: Record<TimeOfDay, boolean>;
      startDate: string;
      endDate?: string;
      recurrence: Recurrence;
    }
  ) => Promise<Task | null>;
  removeTask: (id: string) => Promise<void>;
  toggleIntake: (id: string, time: TimeOfDay, dateKey?: string) => void;
  getLogByDate: (date: string) => DailyLog | undefined;
};

const TaskContext = createContext<TaskContextValue | null>(null);

export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const taskState = useTasks();
  const historyState = useTaskHistory();

  const value: TaskContextValue = useMemo(
    () => ({
      tasks: taskState.tasks,
      history: historyState.history,
      loading: taskState.loading || historyState.loading,
      todayLog: historyState.todayLog,
      addTask: taskState.addTask,
      updateTask: taskState.updateTask,
      removeTask: taskState.removeTask,
      toggleIntake: historyState.toggleIntake,
      getLogByDate: historyState.getLogByDate
    }),
    [historyState, taskState]
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

export const useTaskContext = () => {
  const ctx = useContext(TaskContext);
  if (!ctx) {
    throw new Error('TaskContext is not available');
  }
  return ctx;
};
