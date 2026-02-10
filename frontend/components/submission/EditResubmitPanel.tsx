'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { SubmissionResultRecord, AirError } from '@/types/submission';
import { env } from '@/lib/env';

interface EditResubmitPanelProps {
  record: SubmissionResultRecord;
  submissionId: string;
  onClose: () => void;
  onSuccess: () => void;
}

/** Map AIR field paths to form field names */
const FIELD_MAP: Record<string, string> = {
  'encounters.dateOfService': 'dateOfService',
  'encounters.episodes.vaccineCode': 'vaccineCode',
  'encounters.episodes.vaccineDose': 'vaccineDose',
  'encounters.episodes.vaccineBatch': 'vaccineBatch',
  'individual.medicareCard.medicareCardNumber': 'medicare',
  'individual.medicareCard.medicareIRN': 'irn',
  'individual.personalDetails.firstName': 'firstName',
  'individual.personalDetails.lastName': 'lastName',
  'individual.personalDetails.dateOfBirth': 'dob',
  'individual.personalDetails.gender': 'gender',
  'individual.address.postCode': 'postCode',
  individual: 'firstName', // fallback
};

type FormFields = {
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  medicare: string;
  irn: string;
  dateOfService: string;
  vaccineCode: string;
  vaccineDose: string;
  vaccineBatch: string;
  vaccineType: string;
  routeOfAdministration: string;
  postCode: string;
};

type ResubmitState = 'idle' | 'submitting' | 'success' | 'error';

/** Get which form field an AIR error maps to */
function getErrorField(error: AirError): string | undefined {
  return FIELD_MAP[error.field];
}

export function EditResubmitPanel({ record, submissionId, onClose, onSuccess }: EditResubmitPanelProps) {
  // DEV-007: State management for resubmit flow
  const [state, setState] = useState<ResubmitState>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [newErrors, setNewErrors] = useState<AirError[]>([]);

  // Form fields initialized from record data
  const [fields, setFields] = useState<FormFields>({
    firstName: record.individual.firstName,
    lastName: record.individual.lastName,
    dob: record.individual.dob,
    gender: record.individual.gender,
    medicare: record.individual.medicare,
    irn: record.individual.irn,
    dateOfService: record.encounter.dateOfService,
    vaccineCode: record.encounter.vaccineCode,
    vaccineDose: record.encounter.vaccineDose,
    vaccineBatch: record.encounter.vaccineBatch,
    vaccineType: record.encounter.vaccineType,
    routeOfAdministration: record.encounter.routeOfAdministration,
    postCode: record.individual.postCode || '',
  });

  // DEV-008: Map AIR errors to field names for highlighting
  const errorFieldMap = useMemo(() => {
    const map = new Map<string, AirError>();
    const errors = newErrors.length > 0 ? newErrors : record.errors;
    for (const err of errors) {
      const fieldName = getErrorField(err);
      if (fieldName && !map.has(fieldName)) {
        map.set(fieldName, err);
      }
    }
    return map;
  }, [record.errors, newErrors]);

  // DEV-008: Client-side validation
  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    if (!fields.firstName.trim()) errors.firstName = 'First name is required';
    if (!fields.lastName.trim()) errors.lastName = 'Last name is required';
    if (!fields.dob.trim()) errors.dob = 'Date of birth is required';
    if (!fields.gender.trim()) errors.gender = 'Gender is required';
    if (!fields.dateOfService.trim()) errors.dateOfService = 'Date of service is required';
    if (!fields.vaccineCode.trim()) errors.vaccineCode = 'Vaccine code is required';
    if (!fields.vaccineDose.trim()) errors.vaccineDose = 'Vaccine dose is required';
    return errors;
  }, [fields]);

  const hasErrors = Object.keys(validationErrors).length > 0;

  const updateField = useCallback((name: keyof FormFields, value: string) => {
    setFields((prev) => ({ ...prev, [name]: value }));
    // Clear submit error when user edits
    if (state === 'error') {
      setState('idle');
      setSubmitError(null);
      setNewErrors([]);
    }
  }, [state]);

  // DEV-007: Submit handler
  const handleSubmit = useCallback(async () => {
    if (hasErrors) return;

    try {
      setState('submitting');
      setSubmitError(null);
      setNewErrors([]);

      const res = await fetch(
        `${env.apiUrl}/api/submissions/${submissionId}/records/${record.rowNumber}/resubmit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            individual: {
              firstName: fields.firstName,
              lastName: fields.lastName,
              dob: fields.dob,
              gender: fields.gender,
              medicare: fields.medicare,
              irn: fields.irn,
              postCode: fields.postCode,
            },
            encounter: {
              dateOfService: fields.dateOfService,
              vaccineCode: fields.vaccineCode,
              vaccineDose: fields.vaccineDose,
              vaccineBatch: fields.vaccineBatch,
              vaccineType: fields.vaccineType,
              routeOfAdministration: fields.routeOfAdministration,
            },
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Check if AIR returned new errors (re-error case)
        if (data.errors && Array.isArray(data.errors)) {
          setNewErrors(data.errors);
        }
        throw new Error(data.detail || data.message || `Resubmit failed (${res.status})`);
      }

      const data = await res.json();

      // Check if the resubmission itself returned warnings/errors
      if (data.status === 'ERROR' && data.errors) {
        setState('error');
        setNewErrors(data.errors);
        setSubmitError(data.airMessage || 'Resubmission returned errors');
        return;
      }

      setState('success');
      // Brief delay to show success state before closing
      setTimeout(() => onSuccess(), 1200);
    } catch (err) {
      setState('error');
      setSubmitError(err instanceof Error ? err.message : 'Resubmit failed');
    }
  }, [submissionId, record.rowNumber, fields, hasErrors, onSuccess]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg" data-testid="edit-panel">
        <div className="flex h-full w-full flex-col bg-slate-900 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Edit &amp; Resubmit</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Row {record.rowNumber} &middot; {record.individual.firstName} {record.individual.lastName}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
              aria-label="Close panel"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Status banner */}
          {state === 'success' && (
            <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-6 py-3">
              <p className="text-sm text-emerald-400 font-medium">Resubmission successful.</p>
            </div>
          )}
          {state === 'error' && submitError && (
            <div className="bg-red-500/15 border-b border-red-500/30 px-6 py-3">
              {/* VERBATIM AIR message if present */}
              <p className="text-sm text-red-400">{submitError}</p>
            </div>
          )}

          {/* Form */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* Original AIR errors */}
            {(newErrors.length > 0 ? newErrors : record.errors).length > 0 && (
              <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3 space-y-1">
                <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">
                  {newErrors.length > 0 ? 'New Errors from Resubmission' : 'Original Errors'}
                </p>
                {(newErrors.length > 0 ? newErrors : record.errors).map((err, i) => (
                  <p key={i} className="text-sm text-slate-300">
                    <span className="font-mono text-xs text-red-400">{err.code}</span>
                    {err.field && <span className="text-slate-500 text-xs ml-1">({err.field})</span>}
                    {': '}
                    {/* VERBATIM */}
                    {err.message}
                  </p>
                ))}
              </div>
            )}

            {/* Patient fields */}
            <fieldset>
              <legend className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Patient Details
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="First Name"
                  name="firstName"
                  value={fields.firstName}
                  onChange={(v) => updateField('firstName', v)}
                  error={validationErrors.firstName}
                  airError={errorFieldMap.get('firstName')}
                />
                <FormField
                  label="Last Name"
                  name="lastName"
                  value={fields.lastName}
                  onChange={(v) => updateField('lastName', v)}
                  error={validationErrors.lastName}
                  airError={errorFieldMap.get('lastName')}
                />
                <FormField
                  label="Date of Birth"
                  name="dob"
                  value={fields.dob}
                  onChange={(v) => updateField('dob', v)}
                  error={validationErrors.dob}
                  airError={errorFieldMap.get('dob')}
                  placeholder="ddMMyyyy"
                />
                <FormField
                  label="Gender"
                  name="gender"
                  value={fields.gender}
                  onChange={(v) => updateField('gender', v)}
                  error={validationErrors.gender}
                  airError={errorFieldMap.get('gender')}
                  type="select"
                  options={[
                    { value: 'M', label: 'Male' },
                    { value: 'F', label: 'Female' },
                    { value: 'X', label: 'Not Stated' },
                  ]}
                />
                <FormField
                  label="Medicare Number"
                  name="medicare"
                  value={fields.medicare}
                  onChange={(v) => updateField('medicare', v)}
                  airError={errorFieldMap.get('medicare')}
                  placeholder="10 digits"
                />
                <FormField
                  label="Medicare IRN"
                  name="irn"
                  value={fields.irn}
                  onChange={(v) => updateField('irn', v)}
                  airError={errorFieldMap.get('irn')}
                  placeholder="1-9"
                />
                <FormField
                  label="Postcode"
                  name="postCode"
                  value={fields.postCode}
                  onChange={(v) => updateField('postCode', v)}
                  airError={errorFieldMap.get('postCode')}
                  placeholder="4 digits"
                />
              </div>
            </fieldset>

            {/* Encounter fields */}
            <fieldset>
              <legend className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Encounter Details
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Date of Service"
                  name="dateOfService"
                  value={fields.dateOfService}
                  onChange={(v) => updateField('dateOfService', v)}
                  error={validationErrors.dateOfService}
                  airError={errorFieldMap.get('dateOfService')}
                  placeholder="ddMMyyyy"
                />
                <FormField
                  label="Vaccine Code"
                  name="vaccineCode"
                  value={fields.vaccineCode}
                  onChange={(v) => updateField('vaccineCode', v)}
                  error={validationErrors.vaccineCode}
                  airError={errorFieldMap.get('vaccineCode')}
                />
                <FormField
                  label="Vaccine Dose"
                  name="vaccineDose"
                  value={fields.vaccineDose}
                  onChange={(v) => updateField('vaccineDose', v)}
                  error={validationErrors.vaccineDose}
                  airError={errorFieldMap.get('vaccineDose')}
                  placeholder="B or 1-20"
                />
                <FormField
                  label="Vaccine Batch"
                  name="vaccineBatch"
                  value={fields.vaccineBatch}
                  onChange={(v) => updateField('vaccineBatch', v)}
                  airError={errorFieldMap.get('vaccineBatch')}
                />
                <FormField
                  label="Vaccine Type"
                  name="vaccineType"
                  value={fields.vaccineType}
                  onChange={(v) => updateField('vaccineType', v)}
                  type="select"
                  options={[
                    { value: 'NIP', label: 'NIP' },
                    { value: 'OTH', label: 'Other' },
                  ]}
                />
                <FormField
                  label="Route"
                  name="routeOfAdministration"
                  value={fields.routeOfAdministration}
                  onChange={(v) => updateField('routeOfAdministration', v)}
                  type="select"
                  options={[
                    { value: 'IM', label: 'Intramuscular' },
                    { value: 'SC', label: 'Subcutaneous' },
                    { value: 'ID', label: 'Intradermal' },
                    { value: 'PO', label: 'Oral' },
                    { value: 'NS', label: 'Nasal' },
                  ]}
                />
              </div>
            </fieldset>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-700 px-6 py-4 flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={state === 'submitting'}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={state === 'submitting' || state === 'success' || hasErrors}
            >
              {state === 'submitting' ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Resubmitting...
                </span>
              ) : state === 'success' ? (
                'Resubmitted'
              ) : (
                'Resubmit to AIR'
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// --- Form field sub-component ---

interface FormFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  airError?: AirError;
  placeholder?: string;
  type?: 'text' | 'select';
  options?: { value: string; label: string }[];
}

function FormField({ label, name, value, onChange, error, airError, placeholder, type = 'text', options }: FormFieldProps) {
  const hasError = !!error || !!airError;
  const borderClass = hasError
    ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500'
    : 'border-slate-600 focus:border-emerald-500 focus:ring-emerald-500';

  return (
    <div>
      <label htmlFor={name} className="block text-xs text-slate-400 mb-1">
        {label}
      </label>
      {type === 'select' && options ? (
        <select
          id={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-md bg-slate-800 px-3 py-2 text-sm text-slate-100 border ${borderClass} focus:outline-none focus:ring-1`}
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={name}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-md bg-slate-800 px-3 py-2 text-sm text-slate-100 border ${borderClass} focus:outline-none focus:ring-1 placeholder:text-slate-600`}
        />
      )}
      {error && <p className="mt-0.5 text-xs text-red-400">{error}</p>}
      {airError && !error && (
        <p className="mt-0.5 text-xs text-red-400">
          <span className="font-mono">{airError.code}</span>: {airError.message}
        </p>
      )}
    </div>
  );
}
