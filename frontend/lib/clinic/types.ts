/** Shared types reused from bulk-history page */
export interface HistoryEntry {
  dateOfService?: string;
  vaccineCode?: string;
  vaccineDescription?: string;
  vaccineDose?: string;
  routeOfAdministration?: string;
  status?: string;
  informationCode?: string;
  informationText?: string;
}

export interface DueVaccine {
  antigenCode?: string;
  doseNumber?: string;
  dueDate?: string;
}

export interface IndividualResult {
  rowNumber: number;
  status: string;
  statusCode?: string;
  message?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  medicareCardNumber?: string;
  immunisationHistory: HistoryEntry[];
  vaccineDueDetails: DueVaccine[];
}

export interface ParsedRecord {
  rowNumber: number;
  medicareCardNumber?: string;
  medicareIRN?: string;
  ihiNumber?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  postCode?: string;
}

/** Clinic mode types */
export type ClinicType = 'flu' | 'covid' | 'shingrix' | 'pneumococcal';

export interface ClinicPreset {
  id: ClinicType;
  label: string;
  description: string;
  color: string;
}

export interface EligibilityResult {
  eligible: boolean;
  reason: string;
  /** Clinic-specific detail fields */
  details: Record<string, string>;
}

export interface ClinicPatient {
  result: IndividualResult;
  record?: ParsedRecord;
  age: number | null;
  eligibility: EligibilityResult;
}

export const CLINIC_PRESETS: ClinicPreset[] = [
  {
    id: 'flu',
    label: 'Flu Clinic',
    description: 'Patients without a flu vaccine this year',
    color: 'blue',
  },
  {
    id: 'covid',
    label: 'COVID Clinic',
    description: 'Patients without a COVID vaccine in 6 months',
    color: 'purple',
  },
  {
    id: 'shingrix',
    label: 'Shingrix Clinic',
    description: 'Patients 65+ needing Shingrix doses',
    color: 'amber',
  },
  {
    id: 'pneumococcal',
    label: 'Pneumococcal Clinic',
    description: 'Patients 70+ needing pneumococcal vaccines',
    color: 'rose',
  },
];
