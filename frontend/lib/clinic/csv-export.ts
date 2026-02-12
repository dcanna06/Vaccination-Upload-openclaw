import type { ClinicPatient, ClinicType } from './types';
import { getDetailColumns } from './eligibility-engine';

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function generateCSV(patients: ClinicPatient[], clinic: ClinicType): string {
  const detailCols = getDetailColumns(clinic);
  const headers = ['Row', 'First Name', 'Last Name', 'DOB', 'Age', 'Medicare', 'Eligible', 'Reason', ...detailCols];

  const rows = patients.map((p) => {
    const base = [
      String(p.result.rowNumber),
      p.result.firstName || '',
      p.result.lastName || '',
      p.result.dateOfBirth || '',
      p.age !== null ? String(p.age) : '',
      p.result.medicareCardNumber || '',
      p.eligibility.eligible ? 'Yes' : 'No',
      p.eligibility.reason,
    ];
    const details = detailCols.map((col) => p.eligibility.details[col] || '');
    return [...base, ...details].map(escapeCSV).join(',');
  });

  return [headers.map(escapeCSV).join(','), ...rows].join('\n');
}

export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
