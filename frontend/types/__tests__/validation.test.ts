import { describe, it, expect } from 'vitest';
import type {
  ValidationError,
  ValidationWarning,
  ValidationResult,
  RecordValidationResult,
  IdentificationScenario,
} from '../validation';

describe('Validation Types', () => {
  it('should construct a valid ValidationError', () => {
    const error: ValidationError = {
      rowNumber: 2,
      field: 'medicareCardNumber',
      value: '1234567890',
      errorCode: 'AIR-E-1017',
      message: 'Invalid Medicare check digit',
    };
    expect(error.rowNumber).toBe(2);
    expect(error.field).toBe('medicareCardNumber');
  });

  it('should construct a valid ValidationWarning', () => {
    const warning: ValidationWarning = {
      rowNumber: 5,
      field: 'vaccineBatch',
      value: '',
      warningCode: 'BATCH_RECOMMENDED',
      message: 'Batch number recommended for this vaccine',
    };
    expect(warning.rowNumber).toBe(5);
  });

  it('should construct a valid ValidationResult', () => {
    const result: ValidationResult = {
      isValid: false,
      totalRecords: 100,
      validRecords: 95,
      invalidRecords: 5,
      errors: [
        {
          rowNumber: 3,
          field: 'dateOfBirth',
          value: '2030-01-01',
          errorCode: 'AIR-E-1018',
          message: 'Date is in the future',
        },
      ],
      warnings: [],
    };
    expect(result.totalRecords).toBe(100);
    expect(result.errors).toHaveLength(1);
  });

  it('should construct a valid RecordValidationResult', () => {
    const record: RecordValidationResult = {
      rowNumber: 10,
      isValid: true,
      errors: [],
      warnings: [],
    };
    expect(record.isValid).toBe(true);
  });

  it('should allow all IdentificationScenario values', () => {
    const scenarios: IdentificationScenario[] = [
      'medicare',
      'ihi',
      'demographics',
      'none',
    ];
    expect(scenarios).toHaveLength(4);
  });
});
