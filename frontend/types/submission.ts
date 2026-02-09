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

// --- v1.1.0: Submission Results types ---

export interface SubmissionResult {
  id: string;
  completedAt: string;
  submittedBy: string;
  batchName: string;
  environment: 'VENDOR_TEST' | 'PRODUCTION';
  counts: { total: number; success: number; warning: number; error: number };
  records: SubmissionResultRecord[];
  pagination?: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
}

export interface SubmissionResultRecord {
  rowNumber: number;
  individual: IndividualData;
  encounter: EncounterData;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  airStatusCode: string;
  airMessage: string; // VERBATIM from AIR — never modify
  errors: AirError[];
  episodes: EpisodeResult[];
  claimId?: string;
  claimSequenceNumber?: string;
  actionRequired: 'NONE' | 'CONFIRM_OR_CORRECT';
  resubmitCount: number;
}

export interface AirError {
  code: string;
  field: string;
  message: string; // VERBATIM from AIR
}

export interface EpisodeResult {
  id: string;
  vaccine: string;
  status: 'VALID' | 'INVALID';
  code: string;
  message: string; // VERBATIM from AIR
}

export interface IndividualData {
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  medicare: string;
  irn: string;
  ihiNumber?: string;
  postCode?: string;
  addressLineOne?: string;
  locality?: string;
}

export interface EncounterData {
  dateOfService: string;
  vaccineCode: string;
  vaccineDose: string;
  vaccineBatch: string;
  vaccineType: string;
  routeOfAdministration: string;
  providerNumber: string;
}
