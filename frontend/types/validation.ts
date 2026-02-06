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
