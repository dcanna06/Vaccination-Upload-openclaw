import { describe, it, expect } from 'vitest';
import type {
  ExcelRow,
  ExcelColumnName,
  ExcelColumnMapping,
  ExcelParseResult,
  ExcelParseError,
} from '../excel-import';
import { EXCEL_COLUMNS, COLUMN_MAPPINGS } from '../excel-import';

describe('Excel Import Types', () => {
  it('should have all 19 expected columns', () => {
    expect(EXCEL_COLUMNS).toHaveLength(19);
  });

  it('should include all required column names', () => {
    const expectedColumns: ExcelColumnName[] = [
      'Medicare Card Number',
      'Medicare IRN',
      'IHI Number',
      'First Name',
      'Last Name',
      'Date of Birth',
      'Gender',
      'Postcode',
      'Date of Service',
      'Vaccine Code',
      'Vaccine Dose',
      'Vaccine Batch',
      'Vaccine Type',
      'Route of Administration',
      'Administered Overseas',
      'Country Code',
      'Immunising Provider Number',
      'School ID',
      'Antenatal Indicator',
    ];
    expectedColumns.forEach((col) => {
      expect(EXCEL_COLUMNS).toContain(col);
    });
  });

  it('should have a mapping for each column', () => {
    expect(COLUMN_MAPPINGS).toHaveLength(EXCEL_COLUMNS.length);
  });

  it('should mark required fields correctly', () => {
    const requiredMappings = COLUMN_MAPPINGS.filter((m) => m.required);
    const requiredFields = requiredMappings.map((m) => m.excelColumn);
    expect(requiredFields).toContain('Date of Birth');
    expect(requiredFields).toContain('Gender');
    expect(requiredFields).toContain('Date of Service');
    expect(requiredFields).toContain('Vaccine Code');
    expect(requiredFields).toContain('Vaccine Dose');
    expect(requiredFields).toContain('Immunising Provider Number');
  });

  it('should construct a valid ExcelRow', () => {
    const row: ExcelRow = {
      rowNumber: 2,
      medicareCardNumber: '2123456789',
      medicareIRN: '1',
      firstName: 'Jane',
      lastName: 'Smith',
      dateOfBirth: '15/01/1990',
      gender: 'F',
      postcode: '2000',
      dateOfService: '01/02/2026',
      vaccineCode: 'COMIRN',
      vaccineDose: '1',
      vaccineBatch: 'FL1234',
      vaccineType: 'NIP',
      routeOfAdministration: 'IM',
      immunisingProviderNumber: '1234567A',
    };
    expect(row.rowNumber).toBe(2);
    expect(row.medicareCardNumber).toBe('2123456789');
  });

  it('should construct a valid ExcelParseResult', () => {
    const result: ExcelParseResult = {
      rows: [
        {
          rowNumber: 2,
          dateOfBirth: '15/01/1990',
          gender: 'F',
          dateOfService: '01/02/2026',
          vaccineCode: 'COMIRN',
          vaccineDose: '1',
          immunisingProviderNumber: '1234567A',
        },
      ],
      errors: [],
      totalRows: 1,
      fileName: 'test.xlsx',
    };
    expect(result.rows).toHaveLength(1);
    expect(result.totalRows).toBe(1);
  });

  it('should construct a valid ExcelParseError', () => {
    const error: ExcelParseError = {
      rowNumber: 5,
      column: 'Date of Birth',
      message: 'Invalid date format',
    };
    expect(error.rowNumber).toBe(5);
  });

  it('should map each column to a valid ExcelRow field key', () => {
    const validKeys: (keyof ExcelRow)[] = [
      'rowNumber',
      'medicareCardNumber',
      'medicareIRN',
      'ihiNumber',
      'firstName',
      'lastName',
      'dateOfBirth',
      'gender',
      'postcode',
      'dateOfService',
      'vaccineCode',
      'vaccineDose',
      'vaccineBatch',
      'vaccineType',
      'routeOfAdministration',
      'administeredOverseas',
      'countryCode',
      'immunisingProviderNumber',
      'schoolId',
      'antenatalIndicator',
    ];
    COLUMN_MAPPINGS.forEach((mapping: ExcelColumnMapping) => {
      expect(validKeys).toContain(mapping.fieldKey);
    });
  });
});
