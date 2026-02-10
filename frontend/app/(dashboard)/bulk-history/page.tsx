'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { FileUpload } from '@/components/FileUpload';

type Step = 'upload' | 'validate' | 'process' | 'results';

interface ParsedRecord {
  rowNumber: number;
  medicareCardNumber?: string;
  medicareIRN?: string;
  ihiNumber?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  postCode?: string;
}

interface ValidationError {
  rowNumber: number;
  field: string;
  errorCode: string;
  message: string;
  value?: string;
}

interface HistoryEntry {
  dateOfService?: string;
  vaccineCode?: string;
  vaccineDescription?: string;
  vaccineDose?: string;
  routeOfAdministration?: string;
  status?: string;
  informationCode?: string;
  informationText?: string;
}

interface DueVaccine {
  antigenCode?: string;
  doseNumber?: string;
  dueDate?: string;
}

interface IndividualResult {
  rowNumber: number;
  status: string;
  statusCode?: string;
  message?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  medicareCardNumber?: string;
  immunisationHistory: HistoryEntry[];
  vaccineDueDetails: DueVaccine[];
}

interface Progress {
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  currentRecord: number;
  status: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  if (dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
    return `${dateStr.slice(0, 2)}/${dateStr.slice(2, 4)}/${dateStr.slice(4, 8)}`;
  }
  if (dateStr.length === 10 && dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}

export default function BulkHistoryPage() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [records, setRecords] = useState<ParsedRecord[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [providerNumber, setProviderNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [results, setResults] = useState<IndividualResult[]>([]);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<ParsedRecord | null>(null);
  const [skippedRows, setSkippedRows] = useState<Set<number>>(new Set());
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'error'>('all');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const resp = await fetch(`${API_URL}/api/bulk-history/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await resp.json();

      if (!resp.ok) {
        setError(data.detail || data.message || `Upload failed (${resp.status})`);
        return;
      }

      setRecords(data.records || []);
      setErrors(data.errors || []);
      setStep('validate');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleValidate = async () => {
    if (!providerNumber) {
      setError('Provider number is required');
      return;
    }
    setError(null);

    // Filter out skipped rows
    const activeRecords = records.filter(r => !skippedRows.has(r.rowNumber));

    try {
      const resp = await fetch(`${API_URL}/api/bulk-history/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: activeRecords,
          providerNumber,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        setError(data.detail || 'Validation failed');
        return;
      }

      setValidationErrors(data.errors || []);

      if (data.isValid) {
        setRecords(activeRecords);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    }
  };

  const handleProcess = async () => {
    if (!providerNumber) {
      setError('Provider number is required');
      return;
    }
    setError(null);

    const activeRecords = records.filter(r => !skippedRows.has(r.rowNumber));

    try {
      const resp = await fetch(`${API_URL}/api/bulk-history/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: activeRecords,
          providerNumber,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        setError(data.detail || 'Processing failed');
        return;
      }

      setRequestId(data.requestId);
      setStep('process');

      // Start polling for progress
      pollRef.current = setInterval(async () => {
        try {
          const progressResp = await fetch(
            `${API_URL}/api/bulk-history/${data.requestId}/progress`
          );
          const progressData = await progressResp.json();
          setProgress(progressData.progress);

          if (progressData.status === 'completed' || progressData.status === 'error') {
            if (pollRef.current) clearInterval(pollRef.current);

            if (progressData.status === 'completed') {
              // Fetch results
              const resultsResp = await fetch(
                `${API_URL}/api/bulk-history/${data.requestId}/results`
              );
              const resultsData = await resultsResp.json();
              setResults(resultsData.results || []);
              setStep('results');
            } else {
              setError(progressData.error || 'Processing failed');
            }
          }
        } catch {
          // Ignore transient polling errors
        }
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
    }
  };

  const handleDownload = () => {
    if (!requestId) return;
    window.open(`${API_URL}/api/bulk-history/${requestId}/download`, '_blank');
  };

  const handleEditSave = (rowNumber: number) => {
    if (!editValues) return;
    setRecords(prev =>
      prev.map(r => (r.rowNumber === rowNumber ? { ...r, ...editValues } : r))
    );
    setEditingRow(null);
    setEditValues(null);
    // Clear validation errors for this row
    setValidationErrors(prev => prev.filter(e => e.rowNumber !== rowNumber));
  };

  const handleSkip = (rowNumber: number) => {
    setSkippedRows(prev => new Set([...prev, rowNumber]));
    setValidationErrors(prev => prev.filter(e => e.rowNumber !== rowNumber));
  };

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setRecords([]);
    setErrors([]);
    setValidationErrors([]);
    setError(null);
    setRequestId(null);
    setProgress(null);
    setResults([]);
    setExpandedRow(null);
    setEditingRow(null);
    setEditValues(null);
    setSkippedRows(new Set());
    setFilterStatus('all');
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const inputClass =
    'w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500';

  const invalidRowNumbers = new Set(validationErrors.map(e => e.rowNumber));
  const activeRecords = records.filter(r => !skippedRows.has(r.rowNumber));
  const validActiveRecords = activeRecords.filter(r => !invalidRowNumbers.has(r.rowNumber));

  const filteredResults = filterStatus === 'all'
    ? results
    : results.filter(r => r.status === filterStatus);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Bulk Immunisation History</h1>
          <p className="text-sm text-slate-400 mt-1">
            Upload patient details to retrieve immunisation histories from AIR
          </p>
        </div>
        {step !== 'upload' && (
          <button
            onClick={handleReset}
            className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
          >
            Start Over
          </button>
        )}
      </div>

      {/* Step Indicator */}
      <div className="flex gap-2">
        {(['upload', 'validate', 'process', 'results'] as Step[]).map((s, i) => (
          <div
            key={s}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium ${
              step === s
                ? 'bg-emerald-600 text-white'
                : i < ['upload', 'validate', 'process', 'results'].indexOf(step)
                ? 'bg-emerald-600/20 text-emerald-400'
                : 'bg-slate-700 text-slate-400'
            }`}
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-600/50 text-xs">
              {i + 1}
            </span>
            {s === 'upload' ? 'Upload' : s === 'validate' ? 'Validate' : s === 'process' ? 'Process' : 'Results'}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-md border border-red-500/50 bg-red-500/10 p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">Upload Patient List</h2>
            <p className="text-sm text-slate-400 mb-4">
              Upload an Excel file (.xlsx) with patient identification details. Required columns:
              Date of Birth, Gender, and at least one of: Medicare Card Number + IRN, IHI Number,
              or First Name + Last Name + Postcode.
            </p>
            <FileUpload
              onFileSelect={handleFileSelect}
              onError={setError}
              isUploading={isUploading}
            />
            {file && !isUploading && (
              <button
                onClick={handleUpload}
                className="mt-4 w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Upload & Parse
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Validate & Edit */}
      {step === 'validate' && (
        <div className="space-y-4">
          {/* Parse errors from upload */}
          {errors.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <h3 className="text-sm font-semibold text-amber-400 mb-2">
                Parse Warnings ({errors.length})
              </h3>
              <div className="max-h-40 overflow-y-auto text-xs text-amber-300 space-y-1">
                {errors.map((e, i) => (
                  <p key={i}>Row {e.rowNumber}: {e.field} — {e.message}</p>
                ))}
              </div>
            </div>
          )}

          {/* Provider number */}
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Information Provider Number *
            </label>
            <input
              type="text"
              value={providerNumber}
              onChange={(e) => setProviderNumber(e.target.value)}
              placeholder="e.g. 2448141T"
              maxLength={8}
              className={`${inputClass} max-w-xs`}
            />
          </div>

          {/* Records table */}
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-200">
                Patients ({activeRecords.length} active, {skippedRows.size} skipped)
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handleValidate}
                  disabled={!providerNumber || activeRecords.length === 0}
                  className="rounded-md bg-slate-600 px-3 py-1.5 text-xs text-white hover:bg-slate-500 disabled:opacity-50"
                >
                  Validate
                </button>
                <button
                  onClick={handleProcess}
                  disabled={!providerNumber || validActiveRecords.length === 0 || validationErrors.length > 0}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Fetch History ({validActiveRecords.length} patients)
                </button>
              </div>
            </div>

            {/* Validation errors */}
            {validationErrors.length > 0 && (
              <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/5 p-3">
                <h4 className="text-xs font-semibold text-red-400 mb-1">
                  Validation Errors ({validationErrors.length})
                </h4>
                <div className="max-h-32 overflow-y-auto text-xs text-red-300 space-y-1">
                  {validationErrors.map((e, i) => (
                    <p key={i}>Row {e.rowNumber}: {e.field} — {e.message}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-600 text-left text-slate-400">
                    <th className="px-2 py-2">Row</th>
                    <th className="px-2 py-2">Medicare</th>
                    <th className="px-2 py-2">IRN</th>
                    <th className="px-2 py-2">IHI</th>
                    <th className="px-2 py-2">First Name</th>
                    <th className="px-2 py-2">Last Name</th>
                    <th className="px-2 py-2">DOB</th>
                    <th className="px-2 py-2">Gender</th>
                    <th className="px-2 py-2">Postcode</th>
                    <th className="px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => {
                    const isSkipped = skippedRows.has(rec.rowNumber);
                    const hasError = invalidRowNumbers.has(rec.rowNumber);
                    const isEditing = editingRow === rec.rowNumber;

                    if (isSkipped) return null;

                    return (
                      <tr
                        key={rec.rowNumber}
                        className={`border-b border-slate-700/50 ${
                          hasError ? 'bg-red-500/5' : ''
                        }`}
                      >
                        <td className="px-2 py-2 text-slate-400">{rec.rowNumber}</td>
                        {isEditing && editValues ? (
                          <>
                            <td className="px-2 py-1">
                              <input
                                value={editValues.medicareCardNumber || ''}
                                onChange={(e) => setEditValues({ ...editValues, medicareCardNumber: e.target.value })}
                                className="w-24 rounded border border-slate-500 bg-slate-600 px-1 py-0.5 text-xs"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input
                                value={editValues.medicareIRN || ''}
                                onChange={(e) => setEditValues({ ...editValues, medicareIRN: e.target.value })}
                                className="w-10 rounded border border-slate-500 bg-slate-600 px-1 py-0.5 text-xs"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input
                                value={editValues.ihiNumber || ''}
                                onChange={(e) => setEditValues({ ...editValues, ihiNumber: e.target.value })}
                                className="w-28 rounded border border-slate-500 bg-slate-600 px-1 py-0.5 text-xs"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input
                                value={editValues.firstName || ''}
                                onChange={(e) => setEditValues({ ...editValues, firstName: e.target.value })}
                                className="w-20 rounded border border-slate-500 bg-slate-600 px-1 py-0.5 text-xs"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input
                                value={editValues.lastName || ''}
                                onChange={(e) => setEditValues({ ...editValues, lastName: e.target.value })}
                                className="w-20 rounded border border-slate-500 bg-slate-600 px-1 py-0.5 text-xs"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="date"
                                value={editValues.dateOfBirth || ''}
                                onChange={(e) => setEditValues({ ...editValues, dateOfBirth: e.target.value })}
                                className="w-28 rounded border border-slate-500 bg-slate-600 px-1 py-0.5 text-xs"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <select
                                value={editValues.gender || ''}
                                onChange={(e) => setEditValues({ ...editValues, gender: e.target.value })}
                                className="w-14 rounded border border-slate-500 bg-slate-600 px-1 py-0.5 text-xs"
                              >
                                <option value="">-</option>
                                <option value="M">M</option>
                                <option value="F">F</option>
                                <option value="X">X</option>
                              </select>
                            </td>
                            <td className="px-2 py-1">
                              <input
                                value={editValues.postCode || ''}
                                onChange={(e) => setEditValues({ ...editValues, postCode: e.target.value })}
                                className="w-14 rounded border border-slate-500 bg-slate-600 px-1 py-0.5 text-xs"
                              />
                            </td>
                            <td className="px-2 py-1 space-x-1">
                              <button
                                onClick={() => handleEditSave(rec.rowNumber)}
                                className="text-emerald-400 hover:text-emerald-300"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => { setEditingRow(null); setEditValues(null); }}
                                className="text-slate-400 hover:text-slate-300"
                              >
                                Cancel
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-2 py-2 font-mono">{rec.medicareCardNumber || ''}</td>
                            <td className="px-2 py-2">{rec.medicareIRN || ''}</td>
                            <td className="px-2 py-2 font-mono">{rec.ihiNumber || ''}</td>
                            <td className="px-2 py-2">{rec.firstName || ''}</td>
                            <td className="px-2 py-2">{rec.lastName || ''}</td>
                            <td className="px-2 py-2">{formatDate(rec.dateOfBirth)}</td>
                            <td className="px-2 py-2">{rec.gender || ''}</td>
                            <td className="px-2 py-2">{rec.postCode || ''}</td>
                            <td className="px-2 py-1 space-x-1">
                              <button
                                onClick={() => {
                                  setEditingRow(rec.rowNumber);
                                  setEditValues({ ...rec });
                                }}
                                className="text-blue-400 hover:text-blue-300"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleSkip(rec.rowNumber)}
                                className="text-amber-400 hover:text-amber-300"
                              >
                                Skip
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Processing */}
      {step === 'process' && progress && (
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">Processing...</h2>
          <p className="text-sm text-slate-400 mb-4">
            Identifying individuals and fetching immunisation histories from AIR.
          </p>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Patient {progress.currentRecord} of {progress.totalRecords}</span>
              <span>
                {Math.round((progress.processedRecords / Math.max(progress.totalRecords, 1)) * 100)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-700">
              <div
                className="h-2 rounded-full bg-emerald-500 transition-all duration-300"
                style={{
                  width: `${(progress.processedRecords / Math.max(progress.totalRecords, 1)) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-md bg-slate-700/50 p-3">
              <p className="text-2xl font-bold text-emerald-400">{progress.successfulRecords}</p>
              <p className="text-xs text-slate-400">Successful</p>
            </div>
            <div className="rounded-md bg-slate-700/50 p-3">
              <p className="text-2xl font-bold text-red-400">{progress.failedRecords}</p>
              <p className="text-xs text-slate-400">Failed</p>
            </div>
            <div className="rounded-md bg-slate-700/50 p-3">
              <p className="text-2xl font-bold text-slate-300">
                {progress.totalRecords - progress.processedRecords}
              </p>
              <p className="text-xs text-slate-400">Remaining</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <span className="ml-2 text-sm text-slate-400">Processing...</span>
          </div>
        </div>
      )}

      {/* Step 4: Results */}
      {step === 'results' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 text-center">
              <p className="text-3xl font-bold text-slate-100">{results.length}</p>
              <p className="text-sm text-slate-400">Total Patients</p>
            </div>
            <div className="rounded-lg border border-emerald-600/30 bg-emerald-600/5 p-4 text-center">
              <p className="text-3xl font-bold text-emerald-400">
                {results.filter(r => r.status === 'success').length}
              </p>
              <p className="text-sm text-slate-400">History Retrieved</p>
            </div>
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-center">
              <p className="text-3xl font-bold text-red-400">
                {results.filter(r => r.status !== 'success').length}
              </p>
              <p className="text-sm text-slate-400">Failed</p>
            </div>
          </div>

          {/* Download button */}
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Download Excel Report
            </button>
            <div className="flex gap-1">
              {(['all', 'success', 'error'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={`rounded-md px-3 py-2 text-xs font-medium ${
                    filterStatus === f
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'success' ? 'Success' : 'Errors'}
                </button>
              ))}
            </div>
          </div>

          {/* Results list */}
          <div className="space-y-2">
            {filteredResults.map((r) => (
              <div
                key={r.rowNumber}
                className={`rounded-lg border bg-slate-800 p-4 ${
                  r.status === 'success'
                    ? 'border-emerald-600/20'
                    : 'border-red-500/20'
                }`}
              >
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedRow(expandedRow === r.rowNumber ? null : r.rowNumber)}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                        r.status === 'success'
                          ? 'bg-emerald-600/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {r.status === 'success' ? '\u2713' : '\u2717'}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        {r.firstName || ''} {r.lastName || ''}
                        {r.medicareCardNumber && (
                          <span className="ml-2 text-xs text-slate-400 font-mono">
                            MC: {r.medicareCardNumber}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        Row {r.rowNumber} | DOB: {formatDate(r.dateOfBirth)}
                        {r.status === 'success' && (
                          <span className="ml-2">
                            {r.immunisationHistory.length} vaccination{r.immunisationHistory.length !== 1 ? 's' : ''}
                            {r.vaccineDueDetails.length > 0 && (
                              <span>, {r.vaccineDueDetails.length} due</span>
                            )}
                          </span>
                        )}
                        {r.status !== 'success' && r.statusCode && (
                          <span className="ml-2 text-red-400">
                            {r.statusCode}: {r.message}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-400 text-xs">
                    {expandedRow === r.rowNumber ? '\u25B2' : '\u25BC'}
                  </span>
                </div>

                {/* Expanded detail */}
                {expandedRow === r.rowNumber && r.status === 'success' && (
                  <div className="mt-4 space-y-4">
                    {/* Immunisation History */}
                    {r.immunisationHistory.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-300 mb-2">
                          Immunisation History
                        </h4>
                        <table className="w-full text-xs text-slate-300">
                          <thead>
                            <tr className="border-b border-slate-600 text-left text-slate-400">
                              <th className="px-2 py-1">Date</th>
                              <th className="px-2 py-1">Vaccine</th>
                              <th className="px-2 py-1">Description</th>
                              <th className="px-2 py-1">Dose</th>
                              <th className="px-2 py-1">Route</th>
                              <th className="px-2 py-1">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.immunisationHistory.map((h, i) => (
                              <tr key={i} className="border-b border-slate-700/50">
                                <td className="px-2 py-1">{formatDate(h.dateOfService)}</td>
                                <td className="px-2 py-1 font-mono">{h.vaccineCode}</td>
                                <td className="px-2 py-1">{h.vaccineDescription}</td>
                                <td className="px-2 py-1">{h.vaccineDose}</td>
                                <td className="px-2 py-1">{h.routeOfAdministration}</td>
                                <td className="px-2 py-1">
                                  <span
                                    className={`inline-block rounded px-1.5 py-0.5 text-xs ${
                                      h.status === 'Valid'
                                        ? 'bg-emerald-600/20 text-emerald-400'
                                        : 'bg-amber-500/20 text-amber-400'
                                    }`}
                                  >
                                    {h.status || 'N/A'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {r.immunisationHistory.length === 0 && (
                      <p className="text-xs text-slate-400 italic">No immunisation history found</p>
                    )}

                    {/* Vaccines Due */}
                    {r.vaccineDueDetails.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-300 mb-2">Vaccines Due</h4>
                        <table className="w-full text-xs text-slate-300">
                          <thead>
                            <tr className="border-b border-slate-600 text-left text-slate-400">
                              <th className="px-2 py-1">Antigen</th>
                              <th className="px-2 py-1">Dose</th>
                              <th className="px-2 py-1">Due Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.vaccineDueDetails.map((d, i) => (
                              <tr key={i} className="border-b border-slate-700/50">
                                <td className="px-2 py-1">{d.antigenCode}</td>
                                <td className="px-2 py-1">{d.doseNumber}</td>
                                <td className="px-2 py-1">{formatDate(d.dueDate)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Expanded error detail */}
                {expandedRow === r.rowNumber && r.status !== 'success' && (
                  <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/5 p-3">
                    <p className="text-xs text-red-400">
                      <strong>{r.statusCode}</strong>: {r.message}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
