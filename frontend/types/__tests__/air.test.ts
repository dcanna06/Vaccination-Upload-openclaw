import { describe, it, expect } from 'vitest';
import type {
  Gender,
  VaccineType,
  RouteOfAdministration,
  AcceptAndConfirm,
  PersonalDetailsType,
  MedicareCardType,
  AddressType,
  IndividualIdentifierType,
  ProviderIdentifierType,
  EpisodeType,
  EncounterType,
  AddEncounterRequestType,
  AddEncounterResponseType,
  ClaimDetailsType,
  EncounterResultType,
  EpisodeResultType,
  AIRStatusCode,
  AIRInfoCode,
  AIRWarningCode,
  AIRErrorCode,
  VaccineReferenceType,
  AntigenReferenceType,
  CountryReferenceType,
  RouteOfAdministrationReferenceType,
  AIRRequestHeaders,
} from '../air';

describe('AIR API Types', () => {
  it('should allow valid Gender values', () => {
    const genders: Gender[] = ['F', 'M', 'I', 'U', 'X'];
    expect(genders).toHaveLength(5);
  });

  it('should allow valid VaccineType values', () => {
    const types: VaccineType[] = ['NIP', 'AEN', 'OTH'];
    expect(types).toHaveLength(3);
  });

  it('should allow valid RouteOfAdministration values', () => {
    const routes: RouteOfAdministration[] = ['IM', 'SC', 'ID', 'OR', 'IN', 'NAS', 'NS'];
    expect(routes).toHaveLength(7);
  });

  it('should allow valid AcceptAndConfirm values', () => {
    const values: AcceptAndConfirm[] = ['Y', 'N'];
    expect(values).toHaveLength(2);
  });

  it('should construct a valid PersonalDetailsType', () => {
    const details: PersonalDetailsType = {
      dateOfBirth: '1990-01-15',
      gender: 'F',
      firstName: 'Jane',
      lastName: 'Smith',
    };
    expect(details.dateOfBirth).toBe('1990-01-15');
    expect(details.gender).toBe('F');
  });

  it('should construct a valid MedicareCardType', () => {
    const card: MedicareCardType = {
      medicareCardNumber: '2123456789',
      medicareIRN: '1',
    };
    expect(card.medicareCardNumber).toHaveLength(10);
  });

  it('should construct a valid AddressType with all fields', () => {
    const address: AddressType = {
      addressLineOne: '123 Main St',
      addressLineTwo: 'Suite 1',
      postCode: '2000',
      locality: 'Sydney',
    };
    expect(address.postCode).toBe('2000');
    expect(address.locality).toBe('Sydney');
  });

  it('should construct a valid IndividualIdentifierType', () => {
    const individual: IndividualIdentifierType = {
      personalDetails: {
        dateOfBirth: '1990-01-15',
        gender: 'F',
        lastName: 'Smith',
      },
      medicareCard: {
        medicareCardNumber: '2123456789',
        medicareIRN: '1',
      },
    };
    expect(individual.personalDetails.dateOfBirth).toBe('1990-01-15');
  });

  it('should construct a valid EpisodeType', () => {
    const episode: EpisodeType = {
      id: '1',
      vaccineCode: 'COMIRN',
      vaccineDose: '1',
      vaccineBatch: 'FL1234',
      vaccineType: 'NIP',
      routeOfAdministration: 'IM',
    };
    expect(episode.vaccineCode).toBe('COMIRN');
  });

  it('should construct a valid EncounterType', () => {
    const encounter: EncounterType = {
      id: '1',
      dateOfService: '2026-02-01',
      episodes: [
        {
          id: '1',
          vaccineCode: 'COMIRN',
          vaccineDose: '1',
        },
      ],
      immunisationProvider: {
        providerNumber: '1234567A',
      },
      administeredOverseas: false,
      antenatalIndicator: false,
    };
    expect(encounter.episodes).toHaveLength(1);
  });

  it('should construct a valid AddEncounterRequestType', () => {
    const request: AddEncounterRequestType = {
      individual: {
        personalDetails: {
          dateOfBirth: '1990-01-15',
          gender: 'F',
          firstName: 'Jane',
          lastName: 'Smith',
        },
        medicareCard: {
          medicareCardNumber: '2123456789',
          medicareIRN: '1',
        },
      },
      encounters: [
        {
          id: '1',
          dateOfService: '2026-02-01',
          episodes: [
            {
              id: '1',
              vaccineCode: 'COMIRN',
              vaccineDose: '1',
              vaccineBatch: 'FL1234',
              vaccineType: 'NIP',
              routeOfAdministration: 'IM',
            },
          ],
          immunisationProvider: {
            providerNumber: '1234567A',
          },
        },
      ],
      informationProvider: {
        providerNumber: '1234567A',
      },
    };
    expect(request.encounters).toHaveLength(1);
    expect(request.encounters[0].episodes).toHaveLength(1);
  });

  it('should construct a valid AddEncounterRequestType with claimId for confirmations', () => {
    const request: AddEncounterRequestType = {
      individual: {
        acceptAndConfirm: 'Y',
        personalDetails: {
          dateOfBirth: '1990-01-15',
          gender: 'F',
          lastName: 'Smith',
        },
      },
      encounters: [
        {
          id: '1',
          dateOfService: '2026-02-01',
          acceptAndConfirm: 'Y',
          claimSequenceNumber: '1',
          episodes: [
            { id: '1', vaccineCode: 'COMIRN', vaccineDose: '1' },
          ],
        },
      ],
      informationProvider: { providerNumber: '1234567A' },
      claimId: 'WC297@+5',
    };
    expect(request.claimId).toBe('WC297@+5');
  });

  it('should construct valid response types', () => {
    const response: AddEncounterResponseType = {
      statusCode: 'AIR-I-1007',
      message: 'All encounters successfully recorded',
      claimDetails: {
        claimId: 'WC297@+5',
        claimSequenceNumber: '1',
      },
      encounterResults: [
        {
          encounterId: '1',
          statusCode: 'AIR-I-1000',
          message: 'Encounter recorded',
          episodeResults: [
            {
              episodeId: '1',
              statusCode: 'AIR-I-1000',
              message: 'Episode recorded',
            },
          ],
        },
      ],
    };
    expect(response.statusCode).toBe('AIR-I-1007');
    expect(response.encounterResults).toHaveLength(1);
  });

  it('should type AIR status codes correctly', () => {
    const info: AIRInfoCode = 'AIR-I-1007';
    const warning: AIRWarningCode = 'AIR-W-1004';
    const error: AIRErrorCode = 'AIR-E-1005';
    const status: AIRStatusCode = info;
    expect(status).toBe('AIR-I-1007');
    expect(warning).toBe('AIR-W-1004');
    expect(error).toBe('AIR-E-1005');
  });

  it('should construct valid VaccineReferenceType', () => {
    const ref: VaccineReferenceType = {
      vaccineCode: 'COMIRN',
      vaccineName: 'Comirnaty',
      startDate: '2021-02-22',
      isMedicalContraindicationValid: true,
      isVaccineBatchMandatory: true,
      vaccineBatchMandatoryStartDate: '2021-02-22',
      isVaccineTypeMandatory: true,
      vaccineTypeMandatoryStartDate: '2024-03-01',
      isRouteOfAdministrationMandatory: true,
      routeOfAdministrationMandatoryStartDate: '2024-03-01',
      validVaccineTypeCodes: 'NIP',
      validRouteOfAdministrationCodes: 'IM',
    };
    expect(ref.vaccineCode).toBe('COMIRN');
    expect(ref.isMedicalContraindicationValid).toBe(true);
  });

  it('should construct valid AntigenReferenceType', () => {
    const ref: AntigenReferenceType = {
      antigenCode: 'COVD',
      antigenName: 'COVID-19',
    };
    expect(ref.antigenCode).toBe('COVD');
  });

  it('should construct valid CountryReferenceType', () => {
    const ref: CountryReferenceType = {
      countryCode: 'AUS',
      countryName: 'Australia',
    };
    expect(ref.countryCode).toBe('AUS');
  });

  it('should construct valid RouteOfAdministrationReferenceType', () => {
    const ref: RouteOfAdministrationReferenceType = {
      routeCode: 'IM',
      routeName: 'Intramuscular',
    };
    expect(ref.routeCode).toBe('IM');
  });

  it('should construct valid AIRRequestHeaders', () => {
    const headers: AIRRequestHeaders = {
      Authorization: 'Bearer token123',
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-IBM-Client-Id': 'client-id',
      'dhs-messageId': 'urn:uuid:12345678-1234-1234-1234-123456789012',
      'dhs-correlationId': 'urn:uuid:12345678-1234-1234-1234-123456789012',
      'dhs-auditId': 'MMS00001',
      'dhs-auditIdType': 'Minor Id',
      'dhs-subjectId': '15011990',
      'dhs-subjectIdType': 'Date of Birth',
      'dhs-productId': 'AIRBulkVax 1.0',
    };
    expect(headers['dhs-auditIdType']).toBe('Minor Id');
    expect(headers['dhs-subjectIdType']).toBe('Date of Birth');
  });
});
