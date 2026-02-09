'use client';

import type { AirError } from '@/types/submission';
import { getAirGuidance } from '@/lib/air-error-guidance';

interface ErrorDetailProps {
  error: AirError;
}

export function ErrorDetail({ error }: ErrorDetailProps) {
  const guidance = getAirGuidance(error.code);

  return (
    <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-red-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-red-400 font-semibold">{error.code}</span>
            {error.field && (
              <span className="text-xs text-slate-500 font-mono">{error.field}</span>
            )}
          </div>
          {/* VERBATIM AIR message — never modify */}
          <p className="text-sm text-slate-300 break-words">{error.message}</p>
          {guidance && (
            <p className="mt-1.5 text-xs text-slate-400 italic">{guidance.tip}</p>
          )}
        </div>
      </div>
    </div>
  );
}
