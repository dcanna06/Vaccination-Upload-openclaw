// Excel column mapping types per claude.md Excel Template Specification

export interface ExcelRow {
  rowNumber: number;
  medicareCardNumber?: string;
  medicareIRN?: string;
  ihiNumber?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string; // DD/MM/YYYY from Excel
  gender?: string;
  postcode?: string;
  dateOfService?: string; // DD/MM/YYYY from Excel
  vaccineCode?: string;
  vaccineDose?: string;
  vaccineBatch?: string;
  vaccineType?: string;
  routeOfAdministration?: string;
  administeredOverseas?: string;
  countryCode?: string;
  immunisingProviderNumber?: string;
  schoolId?: string;
  antenatalIndicator?: string;
}

export const EXCEL_COLUMNS = [
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
] as const;

export type ExcelColumnName = (typeof EXCEL_COLUMNS)[number];

export interface ExcelColumnMapping {
  excelColumn: ExcelColumnName;
  fieldKey: keyof ExcelRow;
  required: boolean;
  conditional?: string; // description of when required
}

export const COLUMN_MAPPINGS: ExcelColumnMapping[] = [
  { excelColumn: 'Medicare Card Number', fieldKey: 'medicareCardNumber', required: false, conditional: 'Required for Medicare identification' },
  { excelColumn: 'Medicare IRN', fieldKey: 'medicareIRN', required: false, conditional: 'Required when Medicare Card Number is provided' },
  { excelColumn: 'IHI Number', fieldKey: 'ihiNumber', required: false },
  { excelColumn: 'First Name', fieldKey: 'firstName', required: false, conditional: 'Required for demographic identification' },
  { excelColumn: 'Last Name', fieldKey: 'lastName', required: false, conditional: 'Required for demographic identification' },
  { excelColumn: 'Date of Birth', fieldKey: 'dateOfBirth', required: true },
  { excelColumn: 'Gender', fieldKey: 'gender', required: true },
  { excelColumn: 'Postcode', fieldKey: 'postcode', required: false, conditional: 'Required for demographic identification' },
  { excelColumn: 'Date of Service', fieldKey: 'dateOfService', required: true },
  { excelColumn: 'Vaccine Code', fieldKey: 'vaccineCode', required: true },
  { excelColumn: 'Vaccine Dose', fieldKey: 'vaccineDose', required: true },
  { excelColumn: 'Vaccine Batch', fieldKey: 'vaccineBatch', required: false, conditional: 'Mandatory for COVID/Flu/Yellow Fever vaccines' },
  { excelColumn: 'Vaccine Type', fieldKey: 'vaccineType', required: false, conditional: 'NIP/AEN/OTH' },
  { excelColumn: 'Route of Administration', fieldKey: 'routeOfAdministration', required: false, conditional: 'IM/SC/ID/OR/IN/NAS/NS' },
  { excelColumn: 'Administered Overseas', fieldKey: 'administeredOverseas', required: false },
  { excelColumn: 'Country Code', fieldKey: 'countryCode', required: false, conditional: 'Required when administered overseas' },
  { excelColumn: 'Immunising Provider Number', fieldKey: 'immunisingProviderNumber', required: true },
  { excelColumn: 'School ID', fieldKey: 'schoolId', required: false },
  { excelColumn: 'Antenatal Indicator', fieldKey: 'antenatalIndicator', required: false },
];

export interface ExcelParseResult {
  rows: ExcelRow[];
  errors: ExcelParseError[];
  totalRows: number;
  fileName: string;
}

export interface ExcelParseError {
  rowNumber: number;
  column?: string;
  message: string;
}
