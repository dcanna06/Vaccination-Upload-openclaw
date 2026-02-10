/** Types for AIR Individual Management APIs (TECH.SIS.AIR.05). */

export interface PersonalDetails {
  dateOfBirth: string;
  gender?: string;
  firstName?: string;
  lastName?: string;
}

export interface MedicareCard {
  medicareCardNumber: string;
  medicareIRN?: string;
}

export interface IdentifyIndividualRequest {
  personalDetails: PersonalDetails;
  medicareCard?: MedicareCard;
  ihiNumber?: string;
  postCode?: string;
  informationProvider: { providerNumber: string };
}

export interface IdentifyIndividualResponse {
  status: 'success' | 'error';
  statusCode: string;
  message: string;
  individualIdentifier?: string;
  personalDetails?: PersonalDetails;
}

export interface VaccineDueDetail {
  antigenCode?: string;
  antigenDescription?: string;
  dueDate?: string;
  doseNumber?: string;
}

export interface ImmunisationHistoryEntry {
  dateOfService?: string;
  vaccineCode?: string;
  vaccineDescription?: string;
  vaccineDose?: string;
  routeOfAdministration?: string;
  providerNumber?: string;
  editable?: boolean;
  status?: string;
  informationCode?: string;
  informationText?: string;
  claimId?: string;
  claimSeqNum?: number;
}

export interface HistoryDetailsResponse {
  status: string;
  statusCode: string;
  message: string;
  vaccineDueDetails?: VaccineDueDetail[];
  immunisationHistory?: ImmunisationHistoryEntry[];
}

export interface HistoryStatementResponse {
  status: string;
  statusCode: string;
  message: string;
  statementData?: Record<string, unknown>;
}

export interface VaccineTrialEntry {
  trialName?: string;
  vaccineCode?: string;
  vaccineDescription?: string;
  doseNumber?: string;
  dateAdministered?: string;
}

export interface VaccineTrialHistoryResponse {
  status: string;
  statusCode: string;
  message: string;
  trialHistory?: VaccineTrialEntry[];
}
