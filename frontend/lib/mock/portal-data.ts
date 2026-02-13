import type { Facility, Resident, Clinic, ClinicResident, Message, NotificationItem } from '@/types/portals';

// ─── Facilities ───────────────────────────────────────────────────────────────
export const FACILITIES: Facility[] = [
  {
    id: 1, name: 'Sunrise Aged Care', address: '42 Elm St, Brunswick VIC 3056',
    contactPerson: 'Amanda Rogers', contactPhone: '03 9555 1234', contactEmail: 'amanda@sunrise.com.au',
    pharmacyName: 'HealthPlus Pharmacy', pharmacistName: 'Dr. Sarah Chen',
    status: 'active', residentCount: 47, joinedAt: '2024-03-15',
  },
  {
    id: 2, name: 'Sunny Acres Aged Care', address: '15 Oak Ave, Melbourne VIC 3000',
    contactPerson: 'Jane Mitchell', contactPhone: '03 9555 5678', contactEmail: 'jane@sunnyacres.com.au',
    pharmacyName: 'CareFirst Pharmacy', pharmacistName: 'Dr. Sarah Chen',
    status: 'active', residentCount: 35, joinedAt: '2024-01-10',
  },
  {
    id: 3, name: 'Oceanview Residence', address: '88 Beach Rd, St Kilda VIC 3182',
    contactPerson: 'Tom Harris', contactPhone: '03 9555 9999', contactEmail: 'tom@oceanview.com.au',
    pharmacyName: 'HealthPlus Pharmacy', pharmacistName: 'Dr. Sarah Chen',
    status: 'active', residentCount: 28, joinedAt: '2024-06-01',
  },
  {
    id: 4, name: 'Greenfield Lodge', address: '7 Park Lane, Carlton VIC 3053',
    contactPerson: 'Susan Lee', contactPhone: '03 9555 3333', contactEmail: 'susan@greenfield.com.au',
    pharmacyName: 'MediCare Pharmacy', pharmacistName: 'Dr. James Wong',
    status: 'active', residentCount: 52, joinedAt: '2023-11-20',
  },
  {
    id: 5, name: 'Willowbrook Care', address: '120 River Rd, Hawthorn VIC 3122',
    contactPerson: 'Peter Brown', contactPhone: '03 9555 7777', contactEmail: 'peter@willowbrook.com.au',
    pharmacyName: 'CareFirst Pharmacy', pharmacistName: 'Dr. Sarah Chen',
    status: 'inactive', residentCount: 0, joinedAt: '2024-02-28',
  },
];

// ─── Residents ────────────────────────────────────────────────────────────────
export const RESIDENTS: Resident[] = [
  {
    id: 1, facilityId: 1, firstName: 'Margaret', lastName: 'Thompson',
    dateOfBirth: '1938-04-12', gender: 'F', medicareNumber: '2123 45678 1',
    room: 'A-101', wing: 'East', gpName: 'Dr. Williams',
    allergies: ['Egg'], status: 'active',
    eligibility: {
      flu: { isDue: true, isOverdue: false, dueDate: '2026-03-01' },
      covid: { isDue: true, isOverdue: false, dueDate: '2026-03-15' },
      shingrix: { isDue: false, isOverdue: false },
      pneumo: { isDue: false, isOverdue: false },
      dtpa: { isDue: false, isOverdue: false },
    },
  },
  {
    id: 2, facilityId: 1, firstName: 'Robert', lastName: 'Wilson',
    dateOfBirth: '1942-08-22', gender: 'M', medicareNumber: '3456 78901 2',
    room: 'A-102', wing: 'East', gpName: 'Dr. Patel',
    allergies: [], status: 'active',
    eligibility: {
      flu: { isDue: true, isOverdue: true, dueDate: '2026-01-15' },
      covid: { isDue: false, isOverdue: false },
      shingrix: { isDue: true, isOverdue: false, dueDate: '2026-04-01', doseNumber: 1 },
      pneumo: { isDue: false, isOverdue: false },
      dtpa: { isDue: false, isOverdue: false },
    },
  },
  {
    id: 3, facilityId: 1, firstName: 'Dorothy', lastName: 'Chen',
    dateOfBirth: '1935-11-03', gender: 'F', medicareNumber: '4567 89012 3',
    room: 'B-201', wing: 'West', gpName: 'Dr. Williams',
    allergies: ['Penicillin', 'Latex'], status: 'active',
    eligibility: {
      flu: { isDue: true, isOverdue: false, dueDate: '2026-03-01' },
      covid: { isDue: true, isOverdue: true, dueDate: '2025-12-01' },
      shingrix: { isDue: false, isOverdue: false },
      pneumo: { isDue: true, isOverdue: false, dueDate: '2026-05-01' },
      dtpa: { isDue: false, isOverdue: false },
    },
  },
  {
    id: 4, facilityId: 1, firstName: 'Harold', lastName: 'Jenkins',
    dateOfBirth: '1940-02-14', gender: 'M', medicareNumber: '5678 90123 4',
    room: 'B-202', wing: 'West', gpName: 'Dr. Patel',
    allergies: [], status: 'active',
    eligibility: {
      flu: { isDue: false, isOverdue: false },
      covid: { isDue: true, isOverdue: false, dueDate: '2026-04-10' },
      shingrix: { isDue: true, isOverdue: false, dueDate: '2026-04-01', doseNumber: 2 },
      pneumo: { isDue: false, isOverdue: false },
      dtpa: { isDue: true, isOverdue: false, dueDate: '2026-06-01' },
    },
  },
  {
    id: 5, facilityId: 1, firstName: 'Edith', lastName: 'Garcia',
    dateOfBirth: '1937-07-29', gender: 'F', medicareNumber: '6789 01234 5',
    room: 'C-301', wing: 'North', gpName: 'Dr. Singh',
    allergies: ['Sulfa'], status: 'active',
    eligibility: {
      flu: { isDue: true, isOverdue: false, dueDate: '2026-03-01' },
      covid: { isDue: false, isOverdue: false },
      shingrix: { isDue: false, isOverdue: false },
      pneumo: { isDue: true, isOverdue: true, dueDate: '2025-11-15' },
      dtpa: { isDue: false, isOverdue: false },
    },
  },
  {
    id: 6, facilityId: 2, firstName: 'Frank', lastName: 'Morrison',
    dateOfBirth: '1941-05-18', gender: 'M', medicareNumber: '7890 12345 6',
    room: '101', wing: 'Main', gpName: 'Dr. Lee',
    allergies: [], status: 'active',
    eligibility: {
      flu: { isDue: true, isOverdue: false, dueDate: '2026-03-01' },
      covid: { isDue: true, isOverdue: false, dueDate: '2026-03-20' },
      shingrix: { isDue: false, isOverdue: false },
      pneumo: { isDue: false, isOverdue: false },
      dtpa: { isDue: false, isOverdue: false },
    },
  },
  {
    id: 7, facilityId: 2, firstName: 'Betty', lastName: 'O\'Brien',
    dateOfBirth: '1936-12-08', gender: 'F', medicareNumber: '8901 23456 7',
    room: '102', wing: 'Main', gpName: 'Dr. Lee',
    allergies: ['Egg', 'Gelatin'], status: 'active',
    eligibility: {
      flu: { isDue: true, isOverdue: true, dueDate: '2026-01-20' },
      covid: { isDue: true, isOverdue: false, dueDate: '2026-03-20' },
      shingrix: { isDue: true, isOverdue: false, dueDate: '2026-05-01', doseNumber: 1 },
      pneumo: { isDue: false, isOverdue: false },
      dtpa: { isDue: false, isOverdue: false },
    },
  },
  {
    id: 8, facilityId: 2, firstName: 'Arthur', lastName: 'Nguyen',
    dateOfBirth: '1939-03-25', gender: 'M', medicareNumber: '9012 34567 8',
    room: '201', wing: 'Annex', gpName: 'Dr. Park',
    allergies: [], status: 'active',
    eligibility: {
      flu: { isDue: true, isOverdue: false, dueDate: '2026-03-01' },
      covid: { isDue: false, isOverdue: false },
      shingrix: { isDue: false, isOverdue: false },
      pneumo: { isDue: true, isOverdue: false, dueDate: '2026-06-01' },
      dtpa: { isDue: true, isOverdue: false, dueDate: '2026-07-01' },
    },
  },
  {
    id: 9, facilityId: 2, firstName: 'Rose', lastName: 'Kelly',
    dateOfBirth: '1943-09-11', gender: 'F', medicareNumber: '0123 45678 9',
    room: '202', wing: 'Annex', gpName: 'Dr. Park',
    allergies: ['Latex'], status: 'inactive',
    eligibility: {
      flu: { isDue: false, isOverdue: false },
      covid: { isDue: false, isOverdue: false },
      shingrix: { isDue: false, isOverdue: false },
      pneumo: { isDue: false, isOverdue: false },
      dtpa: { isDue: false, isOverdue: false },
    },
  },
  {
    id: 10, facilityId: 3, firstName: 'George', lastName: 'Patel',
    dateOfBirth: '1934-06-15', gender: 'M', medicareNumber: '1234 56789 0',
    room: 'S-1', wing: 'Seaside', gpName: 'Dr. Adams',
    allergies: [], status: 'active',
    eligibility: {
      flu: { isDue: true, isOverdue: true, dueDate: '2025-12-15' },
      covid: { isDue: true, isOverdue: false, dueDate: '2026-03-01' },
      shingrix: { isDue: true, isOverdue: false, dueDate: '2026-04-15', doseNumber: 1 },
      pneumo: { isDue: false, isOverdue: false },
      dtpa: { isDue: false, isOverdue: false },
    },
  },
  {
    id: 11, facilityId: 3, firstName: 'Mabel', lastName: 'Singh',
    dateOfBirth: '1937-01-30', gender: 'F', medicareNumber: '2345 67890 1',
    room: 'S-2', wing: 'Seaside', gpName: 'Dr. Adams',
    allergies: ['Neomycin'], status: 'active',
    eligibility: {
      flu: { isDue: true, isOverdue: false, dueDate: '2026-03-01' },
      covid: { isDue: false, isOverdue: false },
      shingrix: { isDue: false, isOverdue: false },
      pneumo: { isDue: true, isOverdue: false, dueDate: '2026-05-01' },
      dtpa: { isDue: true, isOverdue: true, dueDate: '2025-10-01' },
    },
  },
  {
    id: 12, facilityId: 3, firstName: 'Albert', lastName: 'Evans',
    dateOfBirth: '1944-10-05', gender: 'M', medicareNumber: '3456 78901 2',
    room: 'H-1', wing: 'Hillside', gpName: 'Dr. Chen',
    allergies: [], status: 'active',
    eligibility: {
      flu: { isDue: false, isOverdue: false },
      covid: { isDue: true, isOverdue: false, dueDate: '2026-04-01' },
      shingrix: { isDue: false, isOverdue: false },
      pneumo: { isDue: false, isOverdue: false },
      dtpa: { isDue: false, isOverdue: false },
    },
  },
  {
    id: 13, facilityId: 4, firstName: 'Vera', lastName: 'Kowalski',
    dateOfBirth: '1933-08-19', gender: 'F', medicareNumber: '4567 89012 3',
    room: 'G-101', wing: 'Garden', gpName: 'Dr. Taylor',
    allergies: ['Penicillin'], status: 'active',
    eligibility: {
      flu: { isDue: true, isOverdue: true, dueDate: '2026-01-01' },
      covid: { isDue: true, isOverdue: true, dueDate: '2025-11-01' },
      shingrix: { isDue: true, isOverdue: false, dueDate: '2026-04-01', doseNumber: 1 },
      pneumo: { isDue: true, isOverdue: false, dueDate: '2026-06-01' },
      dtpa: { isDue: false, isOverdue: false },
    },
  },
  {
    id: 14, facilityId: 4, firstName: 'Walter', lastName: 'Schmidt',
    dateOfBirth: '1936-04-02', gender: 'M', medicareNumber: '5678 90123 4',
    room: 'G-102', wing: 'Garden', gpName: 'Dr. Taylor',
    allergies: [], status: 'active',
    eligibility: {
      flu: { isDue: true, isOverdue: false, dueDate: '2026-03-15' },
      covid: { isDue: false, isOverdue: false },
      shingrix: { isDue: false, isOverdue: false },
      pneumo: { isDue: false, isOverdue: false },
      dtpa: { isDue: true, isOverdue: false, dueDate: '2026-05-15' },
    },
  },
  {
    id: 15, facilityId: 4, firstName: 'Lillian', lastName: 'Murphy',
    dateOfBirth: '1940-11-22', gender: 'F', medicareNumber: '6789 01234 5',
    room: 'P-201', wing: 'Parkside', gpName: 'Dr. Nguyen',
    allergies: ['Sulfa', 'Aspirin'], status: 'active',
    eligibility: {
      flu: { isDue: true, isOverdue: false, dueDate: '2026-03-01' },
      covid: { isDue: true, isOverdue: false, dueDate: '2026-04-01' },
      shingrix: { isDue: false, isOverdue: false },
      pneumo: { isDue: false, isOverdue: false },
      dtpa: { isDue: false, isOverdue: false },
    },
  },
  {
    id: 16, facilityId: 4, firstName: 'Ernest', lastName: 'Wong',
    dateOfBirth: '1938-01-08', gender: 'M', medicareNumber: '7890 12345 6',
    room: 'P-202', wing: 'Parkside', gpName: 'Dr. Nguyen',
    allergies: [], status: 'active',
    eligibility: {
      flu: { isDue: false, isOverdue: false },
      covid: { isDue: false, isOverdue: false },
      shingrix: { isDue: true, isOverdue: false, dueDate: '2026-05-01', doseNumber: 2 },
      pneumo: { isDue: true, isOverdue: false, dueDate: '2026-07-01' },
      dtpa: { isDue: false, isOverdue: false },
    },
  },
  {
    id: 17, facilityId: 4, firstName: 'Gladys', lastName: 'Rossi',
    dateOfBirth: '1935-05-30', gender: 'F', medicareNumber: '8901 23456 7',
    room: 'P-203', wing: 'Parkside', gpName: 'Dr. Taylor',
    allergies: ['Egg'], status: 'inactive',
    eligibility: {
      flu: { isDue: false, isOverdue: false },
      covid: { isDue: false, isOverdue: false },
      shingrix: { isDue: false, isOverdue: false },
      pneumo: { isDue: false, isOverdue: false },
      dtpa: { isDue: false, isOverdue: false },
    },
  },
];

// ─── Clinics ──────────────────────────────────────────────────────────────────
export const CLINICS: Clinic[] = [
  {
    id: 1, facilityId: 1, name: 'Autumn Flu Clinic',
    clinicDate: '2026-03-18', timeRange: '9:00 AM - 12:00 PM',
    location: 'Main Dining Hall', pharmacistName: 'Dr. Sarah Chen',
    vaccines: ['Influenza', 'COVID-19'], status: 'upcoming',
    residents: [
      { residentId: 1, firstName: 'Margaret', lastName: 'Thompson', room: 'A-101', eligibility: { Influenza: true, 'COVID-19': true }, consent: { Influenza: true, 'COVID-19': null } },
      { residentId: 2, firstName: 'Robert', lastName: 'Wilson', room: 'A-102', eligibility: { Influenza: true, 'COVID-19': false }, consent: { Influenza: true, 'COVID-19': false } },
      { residentId: 3, firstName: 'Dorothy', lastName: 'Chen', room: 'B-201', eligibility: { Influenza: true, 'COVID-19': true }, consent: { Influenza: null, 'COVID-19': null } },
    ],
  },
  {
    id: 2, facilityId: 1, name: 'Shingrix Round 1',
    clinicDate: '2026-04-02', timeRange: '1:00 PM - 3:00 PM',
    location: 'Activity Room', pharmacistName: 'Dr. Sarah Chen',
    vaccines: ['Shingrix'], status: 'upcoming',
    residents: [
      { residentId: 2, firstName: 'Robert', lastName: 'Wilson', room: 'A-102', eligibility: { Shingrix: true }, consent: { Shingrix: null } },
      { residentId: 4, firstName: 'Harold', lastName: 'Jenkins', room: 'B-202', eligibility: { Shingrix: true }, consent: { Shingrix: true } },
    ],
  },
  {
    id: 3, facilityId: 2, name: 'Sunny Acres Flu Drive',
    clinicDate: '2026-03-20', timeRange: '10:00 AM - 1:00 PM',
    location: 'Community Room', pharmacistName: 'Dr. Sarah Chen',
    vaccines: ['Influenza', 'COVID-19'], status: 'upcoming',
    residents: [
      { residentId: 6, firstName: 'Frank', lastName: 'Morrison', room: '101', eligibility: { Influenza: true, 'COVID-19': true }, consent: { Influenza: true, 'COVID-19': true } },
      { residentId: 7, firstName: 'Betty', lastName: 'O\'Brien', room: '102', eligibility: { Influenza: true, 'COVID-19': true }, consent: { Influenza: null, 'COVID-19': null } },
      { residentId: 8, firstName: 'Arthur', lastName: 'Nguyen', room: '201', eligibility: { Influenza: true, 'COVID-19': false }, consent: { Influenza: true, 'COVID-19': false } },
    ],
  },
  {
    id: 4, facilityId: 3, name: 'Oceanview Combined',
    clinicDate: '2026-03-25', timeRange: '9:30 AM - 11:30 AM',
    location: 'Sun Room', pharmacistName: 'Dr. Sarah Chen',
    vaccines: ['Influenza', 'COVID-19', 'Shingrix'], status: 'upcoming',
    residents: [
      { residentId: 10, firstName: 'George', lastName: 'Patel', room: 'S-1', eligibility: { Influenza: true, 'COVID-19': true, Shingrix: true }, consent: { Influenza: true, 'COVID-19': true, Shingrix: null } },
      { residentId: 11, firstName: 'Mabel', lastName: 'Singh', room: 'S-2', eligibility: { Influenza: true, 'COVID-19': false, Shingrix: false }, consent: { Influenza: null, 'COVID-19': false, Shingrix: false } },
    ],
  },
  {
    id: 5, facilityId: 4, name: 'Greenfield Multi-Vax',
    clinicDate: '2026-04-08', timeRange: '2:00 PM - 5:00 PM',
    location: 'Main Hall', pharmacistName: 'Dr. James Wong',
    vaccines: ['Influenza', 'COVID-19', 'Pneumococcal'], status: 'upcoming',
    residents: [
      { residentId: 13, firstName: 'Vera', lastName: 'Kowalski', room: 'G-101', eligibility: { Influenza: true, 'COVID-19': true, Pneumococcal: true }, consent: { Influenza: true, 'COVID-19': true, Pneumococcal: null } },
      { residentId: 14, firstName: 'Walter', lastName: 'Schmidt', room: 'G-102', eligibility: { Influenza: true, 'COVID-19': false, Pneumococcal: false }, consent: { Influenza: null, 'COVID-19': false, Pneumococcal: false } },
      { residentId: 15, firstName: 'Lillian', lastName: 'Murphy', room: 'P-201', eligibility: { Influenza: true, 'COVID-19': true, Pneumococcal: false }, consent: { Influenza: true, 'COVID-19': null, Pneumococcal: false } },
    ],
  },
  {
    id: 6, facilityId: 1, name: 'Winter Booster Clinic',
    clinicDate: '2026-06-15', timeRange: '10:00 AM - 12:00 PM',
    location: 'Main Dining Hall', pharmacistName: 'Dr. Sarah Chen',
    vaccines: ['COVID-19', 'dTpa Booster'], status: 'upcoming',
    residents: [],
  },
];

// ─── Messages ─────────────────────────────────────────────────────────────────
export const MESSAGES: Message[] = [
  { id: 1, facilityId: 1, senderId: 10, senderRole: 'facility_staff', senderName: 'Amanda Rogers', body: 'Hi, can we schedule the flu clinic for next week? Most residents are due.', createdAt: '2026-03-10T09:15:00Z' },
  { id: 2, facilityId: 1, senderId: 1, senderRole: 'pharmacist', senderName: 'Dr. Sarah Chen', body: 'Sure, I have availability on the 18th. I\'ll bring Influenza and COVID-19 stock.', createdAt: '2026-03-10T09:30:00Z' },
  { id: 3, facilityId: 1, senderId: 10, senderRole: 'facility_staff', senderName: 'Amanda Rogers', body: 'Perfect. Main Dining Hall works best, 9am-12pm. I\'ll start getting consents.', createdAt: '2026-03-10T10:00:00Z' },
  { id: 4, facilityId: 2, senderId: 11, senderRole: 'facility_staff', senderName: 'Jane Mitchell', body: 'We have 3 new residents who need to be added to the system before the clinic.', createdAt: '2026-03-11T14:00:00Z' },
  { id: 5, facilityId: 2, senderId: 1, senderRole: 'pharmacist', senderName: 'Dr. Sarah Chen', body: 'I\'ll add them today. Can you send me their details?', createdAt: '2026-03-11T14:15:00Z' },
  { id: 6, facilityId: 3, senderId: 12, senderRole: 'facility_staff', senderName: 'Tom Harris', body: 'George Patel had a reaction to last year\'s flu shot. Should we still include him?', createdAt: '2026-03-12T11:00:00Z' },
  { id: 7, facilityId: 3, senderId: 1, senderRole: 'pharmacist', senderName: 'Dr. Sarah Chen', body: 'What type of reaction? I\'ll check his history and advise.', createdAt: '2026-03-12T11:20:00Z' },
  { id: 8, facilityId: 4, senderId: 13, senderRole: 'facility_staff', senderName: 'Susan Lee', body: 'Stock for Pneumococcal - do we need to order separately?', createdAt: '2026-03-09T16:00:00Z' },
  { id: 9, facilityId: 4, senderId: 2, senderRole: 'pharmacist', senderName: 'Dr. James Wong', body: 'No, I\'ll include it with the other vaccines. All sorted.', createdAt: '2026-03-09T16:30:00Z' },
];

// ─── Notifications ────────────────────────────────────────────────────────────
export const NOTIFICATIONS: NotificationItem[] = [
  { id: 1, type: 'clinic', title: 'Autumn Flu Clinic scheduled for Mar 18', isRead: false, createdAt: '2026-03-13T08:00:00Z' },
  { id: 2, type: 'consent', title: '3 consents pending for Autumn Flu Clinic', isRead: false, createdAt: '2026-03-13T08:05:00Z' },
  { id: 3, type: 'message', title: 'New message from Sunrise Aged Care', isRead: false, createdAt: '2026-03-12T11:20:00Z' },
  { id: 4, type: 'facility', title: 'Oceanview Residence updated contact details', isRead: true, createdAt: '2026-03-11T15:00:00Z' },
  { id: 5, type: 'stock', title: 'Stock allocated for Greenfield Multi-Vax', isRead: true, createdAt: '2026-03-10T09:00:00Z' },
  { id: 6, type: 'clinic', title: 'Shingrix Round 1 coming up Apr 2', isRead: true, createdAt: '2026-03-09T08:00:00Z' },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────
export function getAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function getFacilityResidents(facilityId: number): Resident[] {
  return RESIDENTS.filter(r => r.facilityId === facilityId);
}

export function getFacilityClinics(facilityId: number): Clinic[] {
  return CLINICS.filter(c => c.facilityId === facilityId);
}

export function countDueVaccines(resident: Resident): { due: number; overdue: number } {
  let due = 0;
  let overdue = 0;
  for (const v of Object.values(resident.eligibility)) {
    if (v.isOverdue) overdue++;
    else if (v.isDue) due++;
  }
  return { due, overdue };
}

export function countPendingConsents(clinics: Clinic[]): number {
  let count = 0;
  for (const c of clinics) {
    for (const r of c.residents) {
      for (const val of Object.values(r.consent)) {
        if (val === null) count++;
      }
    }
  }
  return count;
}
