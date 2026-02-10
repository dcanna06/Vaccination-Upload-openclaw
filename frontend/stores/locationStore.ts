import { create } from 'zustand';
import type { Location } from '@/types/location';

interface LocationState {
  locations: Location[];
  selectedLocationId: number | null;
  isLoading: boolean;
  error: string | null;
  setLocations: (locations: Location[]) => void;
  setSelectedLocationId: (id: number | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  locations: [],
  selectedLocationId:
    typeof window !== 'undefined'
      ? Number(localStorage.getItem('selectedLocationId')) || null
      : null,
  isLoading: false,
  error: null,
  setLocations: (locations) => set({ locations }),
  setSelectedLocationId: (id) => {
    if (typeof window !== 'undefined') {
      if (id !== null) {
        localStorage.setItem('selectedLocationId', String(id));
      } else {
        localStorage.removeItem('selectedLocationId');
      }
    }
    set({ selectedLocationId: id });
  },
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  reset: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedLocationId');
    }
    set({ locations: [], selectedLocationId: null, isLoading: false, error: null });
  },
}));
