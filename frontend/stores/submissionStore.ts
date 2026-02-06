import { create } from 'zustand';
import type { SubmissionProgress } from '@/types/submission';

interface SubmissionState {
  submissionId: string | null;
  progress: SubmissionProgress | null;
  setSubmissionId: (id: string | null) => void;
  setProgress: (progress: SubmissionProgress | null) => void;
  reset: () => void;
}

export const useSubmissionStore = create<SubmissionState>((set) => ({
  submissionId: null,
  progress: null,
  setSubmissionId: (id) => set({ submissionId: id }),
  setProgress: (progress) => set({ progress }),
  reset: () => set({ submissionId: null, progress: null }),
}));
