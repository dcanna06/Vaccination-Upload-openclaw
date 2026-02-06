export type BatchStatus = 'draft' | 'validating' | 'validated' | 'submitting' | 'completed' | 'failed';

export interface SubmissionProgress {
  totalBatches: number;
  completedBatches: number;
  successfulRecords: number;
  failedRecords: number;
  pendingConfirmation: number;
  currentBatch: number;
  status: 'running' | 'paused' | 'completed' | 'error';
}

export interface SubmissionRecord {
  id: string;
  rowNumber: number;
  status: 'pending' | 'success' | 'warning' | 'error' | 'confirmed';
  airStatusCode?: string;
  airMessage?: string;
  claimId?: string;
  claimSequenceNumber?: string;
}

export interface SubmissionBatch {
  id: string;
  fileName: string;
  totalRecords: number;
  successful: number;
  failed: number;
  warnings: number;
  pendingConfirmation: number;
  status: BatchStatus;
  createdAt: string;
  completedAt?: string;
}
