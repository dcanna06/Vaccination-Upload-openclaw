import { create } from 'zustand';

interface UploadState {
  file: File | null;
  parsedRows: unknown[];
  groupedBatches: unknown[];
  isUploading: boolean;
  error: string | null;
  setFile: (file: File | null) => void;
  setParsedRows: (rows: unknown[]) => void;
  setGroupedBatches: (batches: unknown[]) => void;
  setIsUploading: (uploading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  file: null,
  parsedRows: [],
  groupedBatches: [],
  isUploading: false,
  error: null,
  setFile: (file) => set({ file }),
  setParsedRows: (rows) => set({ parsedRows: rows }),
  setGroupedBatches: (batches) => set({ groupedBatches: batches }),
  setIsUploading: (uploading) => set({ isUploading: uploading }),
  setError: (error) => set({ error }),
  reset: () => set({ file: null, parsedRows: [], groupedBatches: [], isUploading: false, error: null }),
}));
