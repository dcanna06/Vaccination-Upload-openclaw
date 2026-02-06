export interface PersonalDetailsType {
  dateOfBirth: string;
  gender?: 'F' | 'M' | 'I' | 'U';
  firstName?: string;
  lastName?: string;
  initial?: string;
  onlyNameIndicator?: boolean;
}

export interface MedicareCardType {
  medicareCardNumber: string;
  medicareIRN?: string;
}

export interface AddressType {
  postCode?: string;
}

export interface IndividualIdentifierType {
  acceptAndConfirm?: boolean;
  personalDetails: PersonalDetailsType;
  medicareCard?: MedicareCardType;
  address?: AddressType;
  ihiNumber?: string;
}

export interface ProviderIdentifierType {
  providerNumber: string;
}

export interface EpisodeType {
  id: string;
  vaccineCode: string;
  vaccineDose: string;
  vaccineBatch?: string;
  vaccineType?: 'NIP' | 'AEN' | 'OTH';
  routeOfAdministration?: 'IM' | 'SC' | 'ID' | 'OR' | 'IN' | 'NAS';
}

export interface EncounterType {
  id: string;
  dateOfService: string;
  episodes: EpisodeType[];
  immunisationProvider?: ProviderIdentifierType;
  schoolId?: string;
  administeredOverseas?: boolean;
  countryCode?: string;
  antenatalIndicator?: boolean;
  acceptAndConfirm?: boolean;
  claimSequenceNumber?: string;
}

export interface AddEncounterRequestType {
  individual: IndividualIdentifierType;
  encounters: EncounterType[];
  informationProvider: ProviderIdentifierType;
  claimId?: string;
}

export interface ClaimDetailsType {
  claimId: string;
  claimSequenceNumber: string;
}

export interface EncounterResultType {
  encounterId: string;
  statusCode: string;
  message: string;
}

export interface AddEncounterResponseType {
  statusCode: string;
  message: string;
  claimDetails?: ClaimDetailsType;
  encounterResults?: EncounterResultType[];
}
