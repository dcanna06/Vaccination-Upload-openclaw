import { create } from 'zustand';

interface UploadState {
  file: File | null;
  parsedRows: unknown[];
  isUploading: boolean;
  error: string | null;
  setFile: (file: File | null) => void;
  setParsedRows: (rows: unknown[]) => void;
  setIsUploading: (uploading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  file: null,
  parsedRows: [],
  isUploading: false,
  error: null,
  setFile: (file) => set({ file }),
  setParsedRows: (rows) => set({ parsedRows: rows }),
  setIsUploading: (uploading) => set({ isUploading: uploading }),
  setError: (error) => set({ error }),
  reset: () => set({ file: null, parsedRows: [], isUploading: false, error: null }),
}));
