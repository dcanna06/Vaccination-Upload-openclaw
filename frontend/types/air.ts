// AIR API Types — mirrors TECH.SIS.AIR.02 data structures

export type Gender = 'F' | 'M' | 'X';
export type VaccineType = 'NIP' | 'OTH';
export type RouteOfAdministration = 'PO' | 'SC' | 'ID' | 'IM' | 'NS';
export type AcceptAndConfirm = 'Y' | 'N';

export interface PersonalDetailsType {
  dateOfBirth: string; // yyyy-MM-dd
  gender?: Gender;
  firstName?: string; // 1-40 chars
  lastName?: string; // 1-40 chars
  initial?: string; // 1 char
  onlyNameIndicator?: boolean;
}

export interface MedicareCardType {
  medicareCardNumber: string; // 10 digits (9 + check digit + issue number)
  medicareIRN?: string; // 1-9
}

export interface AddressType {
  addressLineOne?: string; // 1-40 chars
  addressLineTwo?: string; // 1-40 chars
  postCode?: string; // 4 numeric
  locality?: string; // 1-40 chars
}

export interface IndividualIdentifierType {
  acceptAndConfirm?: AcceptAndConfirm;
  personalDetails: PersonalDetailsType;
  medicareCard?: MedicareCardType;
  address?: AddressType;
  atsiIndicator?: 'Y' | 'N';
  ihiNumber?: string; // 16 numeric chars
}

export interface ProviderIdentifierType {
  providerNumber: string; // 6-8 chars
  hpioNumber?: string; // 16 numeric
  hpiiNumber?: string; // 16 numeric
}

export interface EpisodeType {
  id: string; // 1-5
  vaccineCode: string; // 1-6 alphanumeric
  vaccineDose: string; // 'B' or '1'-'20'
  vaccineBatch?: string; // 1-15 alphanumeric
  vaccineType?: VaccineType;
  routeOfAdministration?: RouteOfAdministration;
}

export interface EncounterType {
  id: string; // 1-10
  dateOfService: string; // yyyy-MM-dd
  episodes: EpisodeType[];
  immunisationProvider?: ProviderIdentifierType;
  schoolId?: string; // 1-9 numeric
  administeredOverseas?: boolean;
  countryCode?: string; // 3-char ISO 3166-1
  antenatalIndicator?: boolean;
  acceptAndConfirm?: AcceptAndConfirm;
  claimSequenceNumber?: string; // 1-4 for confirmations
}

export interface AddEncounterRequestType {
  individual: IndividualIdentifierType;
  encounters: EncounterType[];
  informationProvider: ProviderIdentifierType;
  claimId?: string; // 8 chars from AIR response
}

// Response types

export interface ClaimDetailsType {
  claimId: string;
  claimSequenceNumber: string;
}

export interface EpisodeResultType {
  episodeId: string;
  statusCode: string;
  message: string;
}

export interface EncounterResultType {
  encounterId: string;
  statusCode: string;
  message: string;
  episodeResults?: EpisodeResultType[];
}

export interface AddEncounterResponseType {
  statusCode: string;
  message: string;
  claimDetails?: ClaimDetailsType;
  encounterResults?: EncounterResultType[];
}

// AIR Status Codes
export type AIRInfoCode = 'AIR-I-1000' | 'AIR-I-1007';
export type AIRWarningCode = 'AIR-W-1001' | 'AIR-W-1004' | 'AIR-W-1008';
export type AIRErrorCode =
  | 'AIR-E-1005'
  | 'AIR-E-1006'
  | 'AIR-E-1013'
  | 'AIR-E-1014'
  | 'AIR-E-1015'
  | 'AIR-E-1016'
  | 'AIR-E-1017'
  | 'AIR-E-1018'
  | 'AIR-E-1019'
  | 'AIR-E-1020'
  | 'AIR-E-1021'
  | 'AIR-E-1022'
  | 'AIR-E-1023'
  | 'AIR-E-1024'
  | 'AIR-E-1026'
  | 'AIR-E-1027'
  | 'AIR-E-1028'
  | 'AIR-E-1029'
  | 'AIR-E-1039'
  | 'AIR-E-1046'
  | 'AIR-E-1063'
  | 'AIR-E-1079'
  | 'AIR-E-1081'
  | 'AIR-E-1084'
  | 'AIR-E-1085'
  | 'AIR-E-1086'
  | 'AIR-E-1087'
  | 'AIR-E-1088'
  | 'AIR-E-1089';
export type AIRStatusCode = AIRInfoCode | AIRWarningCode | AIRErrorCode;

// Reference Data types
export interface VaccineReferenceType {
  vaccineCode: string;
  vaccineName: string;
  startDate: string;
  endDate?: string;
  isMedicalContraindicationValid: boolean;
  isVaccineBatchMandatory: boolean;
  vaccineBatchMandatoryStartDate?: string;
  isVaccineTypeMandatory: boolean;
  vaccineTypeMandatoryStartDate?: string;
  isRouteOfAdministrationMandatory: boolean;
  routeOfAdministrationMandatoryStartDate?: string;
  validVaccineTypeCodes?: string;
  validRouteOfAdministrationCodes?: string;
}

export interface AntigenReferenceType {
  antigenCode: string;
  antigenName: string;
}

export interface CountryReferenceType {
  countryCode: string;
  countryName: string;
}

export interface RouteOfAdministrationReferenceType {
  routeCode: string;
  routeName: string;
}

// AIR HTTP Headers
export interface AIRRequestHeaders {
  Authorization: string;
  'Content-Type': 'application/json';
  Accept: 'application/json';
  'X-IBM-Client-Id': string;
  'dhs-messageId': string; // urn:uuid:xxxxx
  'dhs-correlationId': string; // urn:uuid:xxxxx
  'dhs-auditId': string; // Minor ID
  'dhs-auditIdType': 'Minor Id';
  'dhs-subjectId': string; // DOB ddMMyyyy
  'dhs-subjectIdType': 'Date of Birth';
  'dhs-productId': string; // Software name + version
}
