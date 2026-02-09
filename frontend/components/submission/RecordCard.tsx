'use client';

import { useState } from 'react';
import type { SubmissionResultRecord } from '@/types/submission';
import { getAirGuidance } from '@/lib/air-error-guidance';
import { EpisodePill } from './EpisodePill';
import { ErrorDetail } from './ErrorDetail';
import { Button } from '@/components/ui/Button';

interface RecordCardProps {
  record: SubmissionResultRecord;
  onEditResubmit?: (record: SubmissionResultRecord) => void;
  onConfirm?: (record: SubmissionResultRecord) => void;
}

const STATUS_CONFIG = {
  SUCCESS: {
    icon: (
      <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    label: 'Success',
  },
  WARNING: {
    icon: (
      <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
    badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    label: 'Warning',
  },
  ERROR: {
    icon: (
      <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    badge: 'bg-red-500/15 text-red-400 border-red-500/30',
    label: 'Error',
  },
} as const;

export function RecordCard({ record, onEditResubmit, onConfirm }: RecordCardProps) {
  // Error/warning records expand by default
  const [isExpanded, setIsExpanded] = useState(record.status !== 'SUCCESS');

  const config = STATUS_CONFIG[record.status];
  const guidance = getAirGuidance(record.airStatusCode);
  const name = `${record.individual.firstName} ${record.individual.lastName}`.trim();
  const vaccineInfo = record.encounter.vaccineCode
    ? `${record.encounter.vaccineCode} - ${record.encounter.dateOfService}`
    : '';

  return (
    <div
      className="rounded-lg border border-slate-700 bg-slate-800 overflow-hidden transition-all"
      data-testid={`record-card-${record.rowNumber}`}
    >
      {/* Collapsed header — always visible */}
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-750 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        {/* Row badge */}
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-mono text-slate-300">
          {record.rowNumber}
        </span>

        {/* Status icon */}
        <span className="shrink-0">{config.icon}</span>

        {/* Name */}
        <span className="min-w-0 truncate font-medium text-slate-100">
          {name || 'Unknown'}
        </span>

        {/* Vaccine + date */}
        {vaccineInfo && (
          <span className="hidden sm:block text-xs text-slate-400 truncate">
            {vaccineInfo}
          </span>
        )}

        {/* Spacer */}
        <span className="flex-1" />

        {/* Status badge */}
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${config.badge}`}>
          {config.label}
        </span>

        {/* AIR code */}
        <span className="hidden sm:block shrink-0 font-mono text-xs text-slate-500">
          {record.airStatusCode}
        </span>

        {/* Chevron */}
        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-slate-700 px-4 py-4 space-y-4">
          {/* Patient details grid */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Patient</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm">
              <div>
                <span className="text-slate-500 text-xs">Name</span>
                <p className="text-slate-200">{name || '—'}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs">DOB</span>
                <p className="text-slate-200 font-mono">{record.individual.dob || '—'}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs">Gender</span>
                <p className="text-slate-200">{record.individual.gender || '—'}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs">Medicare</span>
                <p className="text-slate-200 font-mono">
                  {record.individual.medicare || '—'}
                  {record.individual.irn ? ` / ${record.individual.irn}` : ''}
                </p>
              </div>
              {record.individual.ihiNumber && (
                <div>
                  <span className="text-slate-500 text-xs">IHI</span>
                  <p className="text-slate-200 font-mono">{record.individual.ihiNumber}</p>
                </div>
              )}
              {record.individual.postCode && (
                <div>
                  <span className="text-slate-500 text-xs">Postcode</span>
                  <p className="text-slate-200">{record.individual.postCode}</p>
                </div>
              )}
            </div>
          </div>

          {/* Encounter details grid */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Encounter</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm">
              <div>
                <span className="text-slate-500 text-xs">Date of Service</span>
                <p className="text-slate-200 font-mono">{record.encounter.dateOfService || '—'}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs">Vaccine</span>
                <p className="text-slate-200">{record.encounter.vaccineCode || '—'}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs">Dose</span>
                <p className="text-slate-200">{record.encounter.vaccineDose || '—'}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs">Batch</span>
                <p className="text-slate-200 font-mono">{record.encounter.vaccineBatch || '—'}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs">Type</span>
                <p className="text-slate-200">{record.encounter.vaccineType || '—'}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs">Route</span>
                <p className="text-slate-200">{record.encounter.routeOfAdministration || '—'}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs">Provider</span>
                <p className="text-slate-200 font-mono">{record.encounter.providerNumber || '—'}</p>
              </div>
            </div>
          </div>

          {/* AIR message banner — VERBATIM */}
          <div
            className={`rounded-md p-3 text-sm ${
              record.status === 'SUCCESS'
                ? 'bg-emerald-500/10 border border-emerald-500/30'
                : record.status === 'WARNING'
                  ? 'bg-yellow-500/10 border border-yellow-500/30'
                  : 'bg-red-500/10 border border-red-500/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-semibold text-slate-400">
                {record.airStatusCode}
              </span>
              {record.claimId && (
                <span className="text-xs text-slate-500">
                  Claim: <span className="font-mono">{record.claimId}</span>
                </span>
              )}
            </div>
            {/* VERBATIM AIR message — character for character */}
            <p className="text-slate-300 break-words">{record.airMessage}</p>
          </div>

          {/* Guidance tip */}
          {guidance && (
            <div className="rounded-md bg-blue-500/10 border border-blue-500/30 p-3">
              <p className="text-sm text-blue-300">
                <span className="font-semibold">Tip: </span>
                {guidance.tip}
              </p>
            </div>
          )}

          {/* Field-level errors */}
          {record.errors.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Errors ({record.errors.length})
              </h4>
              <div className="space-y-2">
                {record.errors.map((err, i) => (
                  <ErrorDetail key={`${err.code}-${i}`} error={err} />
                ))}
              </div>
            </div>
          )}

          {/* Episode results */}
          {record.episodes.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Episodes ({record.episodes.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {record.episodes.map((ep) => (
                  <EpisodePill key={ep.id} episode={ep} />
                ))}
              </div>
              {/* Episode messages (VERBATIM) */}
              {record.episodes.some(ep => ep.message) && (
                <div className="mt-2 space-y-1">
                  {record.episodes.filter(ep => ep.message).map((ep) => (
                    <p key={`msg-${ep.id}`} className="text-xs text-slate-400">
                      <span className="font-mono text-slate-500">{ep.code}:</span>{' '}
                      {ep.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-700">
            {record.actionRequired === 'CONFIRM_OR_CORRECT' && onConfirm && (
              <Button size="sm" onClick={() => onConfirm(record)}>
                Confirm &amp; Accept
              </Button>
            )}
            {record.status !== 'SUCCESS' && onEditResubmit && (
              <Button variant="secondary" size="sm" onClick={() => onEditResubmit(record)}>
                Edit &amp; Resubmit
              </Button>
            )}
            {record.resubmitCount > 0 && (
              <span className="ml-auto text-xs text-slate-500">
                Resubmitted {record.resubmitCount}x
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
