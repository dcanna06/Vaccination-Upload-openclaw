export interface Facility {
  id: number;
  name: string;
  address: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  pharmacyName: string;
  pharmacistName: string;
  status: 'active' | 'inactive';
  residentCount: number;
  joinedAt: string;
}

export interface Resident {
  id: number;
  facilityId: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'M' | 'F' | 'I' | 'U' | 'X';
  medicareNumber: string;
  room: string;
  wing: string;
  gpName: string;
  allergies: string[];
  status: 'active' | 'inactive';
  eligibility: Record<string, VaccineEligibility>;
}

export interface NewResident {
  facilityId: number;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender: string;
  medicareNumber?: string;
  room?: string;
  wing?: string;
  gpName?: string;
  allergies?: string[];
}

export interface VaccineEligibility {
  isDue: boolean;
  isOverdue: boolean;
  dueDate?: string;
  doseNumber?: number;
}

export interface Clinic {
  id: number;
  facilityId: number;
  name: string;
  clinicDate: string;
  timeRange: string;
  location: string;
  pharmacistName: string;
  vaccines: string[];
  status: 'upcoming' | 'in_progress' | 'done';
  residents: ClinicResident[];
}

export interface ClinicResident {
  residentId: number;
  firstName: string;
  lastName: string;
  room: string;
  eligibility: Record<string, boolean>;
  consent: Record<string, boolean | null>;
}

export interface Message {
  id: number;
  facilityId: number;
  senderId: number;
  senderRole: 'facility_staff' | 'pharmacist' | 'nurse_manager';
  senderName: string;
  body: string;
  createdAt: string;
}

export interface NotificationItem {
  id: number;
  type: 'facility' | 'clinic' | 'consent' | 'message' | 'stock';
  title: string;
  isRead: boolean;
  createdAt: string;
}

export const VACCINE_NAMES: Record<string, string> = {
  flu: 'Influenza',
  covid: 'COVID-19',
  shingrix: 'Shingrix',
  pneumo: 'Pneumococcal',
  dtpa: 'dTpa Booster',
};
