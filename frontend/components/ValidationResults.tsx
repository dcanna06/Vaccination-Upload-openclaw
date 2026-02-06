'use client';

import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ValidationError {
  rowNumber: number;
  field: string;
  errorCode: string;
  message: string;
  value?: string;
}

interface ValidationResultsProps {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  errors: ValidationError[];
  onProceed?: () => void;
  onExportErrors?: () => void;
}

type SortField = 'rowNumber' | 'field' | 'errorCode';
type SortDir = 'asc' | 'desc';

export function ValidationResults({
  totalRecords,
  validRecords,
  invalidRecords,
  errors,
  onProceed,
  onExportErrors,
}: ValidationResultsProps) {
  const [sortField, setSortField] = useState<SortField>('rowNumber');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filterField, setFilterField] = useState<string>('');

  const sortedErrors = useMemo(() => {
    let filtered = errors;
    if (filterField) {
      filtered = errors.filter((e) => e.field === filterField);
    }
    return [...filtered].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [errors, sortField, sortDir, filterField]);

  const uniqueFields = useMemo(
    () => [...new Set(errors.map((e) => e.field))].sort(),
    [errors],
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const isValid = invalidRecords === 0;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <p className="text-2xl font-bold text-slate-100">{totalRecords}</p>
          <p className="text-sm text-slate-400">Total Records</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-emerald-400">{validRecords}</p>
          <p className="text-sm text-slate-400">Valid</p>
        </Card>
        <Card className="text-center">
          <p className={`text-2xl font-bold ${invalidRecords > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {invalidRecords}
          </p>
          <p className="text-sm text-slate-400">Invalid</p>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {uniqueFields.length > 0 && (
            <select
              value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
              className="rounded-md border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-slate-200"
              data-testid="field-filter"
            >
              <option value="">All fields</option>
              {uniqueFields.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-2">
          {errors.length > 0 && onExportErrors && (
            <Button variant="secondary" size="sm" onClick={onExportErrors}>
              Export Errors
            </Button>
          )}
          {isValid && onProceed && (
            <Button size="sm" onClick={onProceed}>
              Proceed to Submit
            </Button>
          )}
        </div>
      </div>

      {/* Error Table */}
      {sortedErrors.length > 0 && (
        <Card className="overflow-hidden p-0">
          <CardHeader className="px-6 pt-4">
            <CardTitle>Validation Errors ({sortedErrors.length})</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="error-table">
              <thead>
                <tr className="border-b border-slate-700 text-left text-slate-400">
                  <th
                    className="cursor-pointer px-6 py-3 hover:text-slate-200"
                    onClick={() => handleSort('rowNumber')}
                  >
                    Row {sortField === 'rowNumber' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="cursor-pointer px-6 py-3 hover:text-slate-200"
                    onClick={() => handleSort('field')}
                  >
                    Field {sortField === 'field' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="cursor-pointer px-6 py-3 hover:text-slate-200"
                    onClick={() => handleSort('errorCode')}
                  >
                    Code {sortField === 'errorCode' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3">Message</th>
                  <th className="px-6 py-3">Value</th>
                </tr>
              </thead>
              <tbody>
                {sortedErrors.map((err, i) => (
                  <tr key={`${err.rowNumber}-${err.field}-${i}`} className="border-b border-slate-700/50 text-slate-300">
                    <td className="px-6 py-2">{err.rowNumber}</td>
                    <td className="px-6 py-2 font-mono text-xs">{err.field}</td>
                    <td className="px-6 py-2 font-mono text-xs text-red-400">{err.errorCode}</td>
                    <td className="px-6 py-2">{err.message}</td>
                    <td className="px-6 py-2 font-mono text-xs text-slate-500">
                      {err.value || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {isValid && errors.length === 0 && (
        <Card className="text-center">
          <p className="text-emerald-400">All records passed validation.</p>
        </Card>
      )}
    </div>
  );
}
