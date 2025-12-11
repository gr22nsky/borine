import { DependencyList, useEffect } from 'react';

// Simple helper to run async effects without lint noise
export const useAsyncEffect = (effect: () => Promise<void>, deps: DependencyList) => {
  useEffect(() => {
    void effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
