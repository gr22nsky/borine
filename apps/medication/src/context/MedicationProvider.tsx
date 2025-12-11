import { createContext, ReactNode, useContext, useMemo } from 'react';

import { useHistory } from '../hooks/useHistory';
import { useMedications } from '../hooks/useMedications';
import { DailyIntake, Medication, Recurrence, TimeOfDay } from '../types';

type MedicationContextValue = {
  medications: Medication[];
  history: DailyIntake[];
  loading: boolean;
  todayIntake?: DailyIntake;
  addMedication: (
    name: string,
    times: Partial<Record<TimeOfDay, boolean>>,
    startDate: string,
    endDate: string | undefined,
    recurrence: Recurrence
  ) => Promise<Medication | null>;
  removeMedication: (id: string) => Promise<void>;
  toggleIntake: (id: string, time: TimeOfDay, dateKey?: string) => void;
  getIntakeByDate: (date: string) => DailyIntake | undefined;
};

const MedicationContext = createContext<MedicationContextValue | null>(null);

export const MedicationProvider = ({ children }: { children: ReactNode }) => {
  const medicationState = useMedications();
  const historyState = useHistory();

  const value: MedicationContextValue = useMemo(
    () => ({
      medications: medicationState.medications,
      history: historyState.history,
      loading: medicationState.loading || historyState.loading,
      todayIntake: historyState.todayIntake,
      addMedication: medicationState.addMedication,
      removeMedication: medicationState.removeMedication,
      toggleIntake: historyState.toggleIntake,
      getIntakeByDate: historyState.getIntakeByDate
    }),
    [historyState, medicationState]
  );

  return <MedicationContext.Provider value={value}>{children}</MedicationContext.Provider>;
};

export const useMedicationContext = () => {
  const ctx = useContext(MedicationContext);
  if (!ctx) {
    throw new Error('MedicationContext is not available');
  }
  return ctx;
};
