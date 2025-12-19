import { useEffect, useRef } from 'react';

import { DailyLog, Task } from '../types';
import { refreshTaskNotifications } from '../notifications/scheduler';

export const useNotificationSync = (tasks: Task[], history: DailyLog[]) => {
  const syncing = useRef(false);

  useEffect(() => {
    if (syncing.current) return;
    syncing.current = true;
    void (async () => {
      try {
        await refreshTaskNotifications(tasks, history);
      } catch (err) {
        console.warn('notification sync failed', err);
      } finally {
        syncing.current = false;
      }
    })();
  }, [tasks, history]);
};
