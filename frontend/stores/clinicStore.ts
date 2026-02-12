import { create } from 'zustand';
import type { IndividualResult, ParsedRecord, ClinicType } from '@/lib/clinic/types';

interface ClinicState {
  results: IndividualResult[];
  records: ParsedRecord[];
  selectedClinic: ClinicType | null;
  setResults: (results: IndividualResult[]) => void;
  setRecords: (records: ParsedRecord[]) => void;
  setSelectedClinic: (clinic: ClinicType | null) => void;
  reset: () => void;
}

export const useClinicStore = create<ClinicState>((set) => ({
  results: [],
  records: [],
  selectedClinic: null,
  setResults: (results) => set({ results }),
  setRecords: (records) => set({ records }),
  setSelectedClinic: (clinic) => set({ selectedClinic: clinic }),
  reset: () => set({ results: [], records: [], selectedClinic: null }),
}));
