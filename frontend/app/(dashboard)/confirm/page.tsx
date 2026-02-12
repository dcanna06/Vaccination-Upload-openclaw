'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PendedEncounter {
  encounterId: string;
  statusCode: string;
  message: string;
  claimId?: string;
  claimSequenceNumber?: string;
  individual?: Record<string, unknown>;
  encounter?: Record<string, unknown>;
  sourceRows?: number[];
}

export default function ConfirmationFlowPage() {
  const router = useRouter();
  const [pendedEncounters, setPendedEncounters] = useState<PendedEncounter[]>([]);
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Record<string, { status: string; message: string }>>({});
  const [batchProcessing, setBatchProcessing] = useState(false);

  useEffect(() => {
    // Load pended encounters from sessionStorage (set by results page)
    const stored = sessionStorage.getItem('pendedEncounters');
    if (stored) {
      try {
        setPendedEncounters(JSON.parse(stored));
      } catch {
        // Invalid data
      }
      // Clear PII from sessionStorage immediately after loading into component state
      sessionStorage.removeItem('pendedEncounters');
    }

    // Cleanup: remove any originalPayload entries on unmount
    return () => {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key?.startsWith('originalPayload:')) {
          sessionStorage.removeItem(key);
        }
      }
    };
  }, []);

  const handleConfirm = async (encounter: PendedEncounter) => {
    if (!encounter.claimId) return;

    setProcessing((prev) => new Set(prev).add(encounter.encounterId));

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const payloadKey = `originalPayload:${encounter.encounterId}`;
      const storedPayload = sessionStorage.getItem(payloadKey);
      const originalPayload = storedPayload ? JSON.parse(storedPayload) : {};
      // Clear PII from sessionStorage immediately after reading
      sessionStorage.removeItem(payloadKey);

      const resp = await fetch(`${apiUrl}/api/submit/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalPayload,
          claimId: encounter.claimId,
          claimSequenceNumber: encounter.claimSequenceNumber,
          dob: originalPayload?.individual?.personalDetails?.dateOfBirth,
        }),
      });

      const data = await resp.json();

      setResults((prev) => ({
        ...prev,
        [encounter.encounterId]: {
          status: data.status || 'error',
          message: data.message || data.statusCode || 'Unknown result',
        },
      }));
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [encounter.encounterId]: {
          status: 'error',
          message: err instanceof Error ? err.message : 'Confirmation failed',
        },
      }));
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(encounter.encounterId);
        return next;
      });
    }
  };

  const handleBatchConfirm = async () => {
    setBatchProcessing(true);
    const confirmable = pendedEncounters.filter(
      (enc) => enc.claimId && !results[enc.encounterId]
    );

    for (const enc of confirmable) {
      await handleConfirm(enc);
    }
    setBatchProcessing(false);
  };

  const confirmableCount = pendedEncounters.filter(
    (enc) => enc.claimId && !results[enc.encounterId]
  ).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Confirm Pended Encounters</h1>
        <button
          onClick={() => router.push('/history')}
          className="rounded-md bg-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-600"
        >
          Back to History
        </button>
      </div>

      <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-4">
        <p className="text-sm text-amber-300">
          These encounters returned AIR-W-1004 (Individual Not Found) or AIR-W-1008 (Pended Episodes).
          Review the details and confirm or correct each encounter.
        </p>
      </div>

      {pendedEncounters.length === 0 ? (
        <p className="text-sm text-slate-400">No pended encounters to confirm.</p>
      ) : (
        <>
          {/* Batch confirm button */}
          {confirmableCount > 1 && (
            <button
              onClick={handleBatchConfirm}
              disabled={batchProcessing}
              className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {batchProcessing
                ? 'Processing...'
                : `Confirm All ${confirmableCount} Encounters`}
            </button>
          )}

          <div className="space-y-4">
            {pendedEncounters.map((enc) => {
              const result = results[enc.encounterId];
              const isProcessing = processing.has(enc.encounterId);

              return (
                <div
                  key={enc.encounterId}
                  className="rounded-lg border border-slate-600 bg-slate-800 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-slate-200">
                        Encounter {enc.encounterId}
                      </span>
                      <span className="ml-2 rounded bg-amber-600/20 px-2 py-0.5 text-xs text-amber-400">
                        {enc.statusCode}
                      </span>
                    </div>
                    {enc.claimId && (
                      <span className="text-xs text-slate-500 font-mono">
                        Claim: {enc.claimId}
                      </span>
                    )}
                  </div>

                  {/* Verbatim AIR message */}
                  <p className="text-sm text-slate-300">{enc.message}</p>

                  {enc.sourceRows && enc.sourceRows.length > 0 && (
                    <p className="text-xs text-slate-500">
                      Source rows: {enc.sourceRows.join(', ')}
                    </p>
                  )}

                  {/* Result display */}
                  {result && (
                    <div
                      className={`rounded-md p-2 text-sm ${
                        result.status === 'success'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {result.message}
                    </div>
                  )}

                  {/* Action buttons */}
                  {!result && (
                    <div className="flex gap-2">
                      {enc.claimId && (
                        <button
                          onClick={() => handleConfirm(enc)}
                          disabled={isProcessing}
                          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {isProcessing ? 'Confirming...' : 'Confirm'}
                        </button>
                      )}
                      <button
                        onClick={() => router.push('/submit')}
                        className="rounded-md bg-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-600"
                      >
                        Correct & Resubmit
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
