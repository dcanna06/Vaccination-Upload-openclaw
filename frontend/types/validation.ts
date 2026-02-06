// Validation result types

export interface ValidationError {
  rowNumber: number;
  field: string;
  value: string;
  errorCode: string;
  message: string;
}

export interface ValidationWarning {
  rowNumber: number;
  field: string;
  value: string;
  warningCode: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface RecordValidationResult {
  rowNumber: number;
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// Identification scenarios per AIR spec
export type IdentificationScenario =
  | 'medicare'     // Medicare + IRN + DOB + Gender
  | 'ihi'          // IHI + DOB + Gender
  | 'demographics' // firstName + lastName + DOB + Gender + Postcode
  | 'none';        // Insufficient identification
