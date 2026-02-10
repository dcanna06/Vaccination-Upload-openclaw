'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SubmissionProgress } from '@/components/SubmissionProgress';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { ResultsSummary } from '@/components/ResultsSummary';
import { useSubmissionStore } from '@/stores/submissionStore';
import { useUploadStore } from '@/stores/uploadStore';
import { useLocationStore } from '@/stores/locationStore';
import { env } from '@/lib/env';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type SubmitStatus = 'idle' | 'running' | 'paused' | 'confirming' | 'completed' | 'error';

const MAX_POLL_FAILURES = 5;

export default function SubmitPage() {
  const router = useRouter();
  const { submissionId, setSubmissionId, progress, setProgress } = useSubmissionStore();
  const { parsedRows, groupedBatches } = useUploadStore();
  const { selectedLocationId } = useLocationStore();
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const hasStarted = useRef(false);
  const pollFailures = useRef(0);
  const [confirmationRecords, setConfirmationRecords] = useState<
    Array<{
      recordId: string;
      rowNumber: number;
      reason: string;
      airMessage: string;
      claimId: string;
      claimSequenceNumber?: string;
    }>
  >([]);
  const [results, setResults] = useState<{
    submissionId: string;
    completedAt: string;
    totalRecords: number;
    successful: number;
    failed: number;
    confirmed: number;
    results: Array<{
      recordId: string;
      originalRow: number;
      status: 'success' | 'failed' | 'confirmed';
      claimId?: string;
      claimSequenceNumber?: string;
      errorCode?: string;
      errorMessage?: string;
    }>;
  } | null>(null);

  // Auto-start submission when arriving with parsed rows
  useEffect(() => {
    if (hasStarted.current || groupedBatches.length === 0 || submissionId) return;
    hasStarted.current = true;

    const startSubmission = async () => {
      setStatus('running');
      setError(null);
      try {
        const res = await fetch(`${env.apiUrl}/api/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batches: groupedBatches,
            informationProvider: {},
            dryRun: false,
            locationId: selectedLocationId,
          }),
        });
        if (!res.ok) throw new Error(`Submission failed: ${res.status}`);
        const data = await res.json();
        setSubmissionId(data.submissionId);
        setProgress({
          totalBatches: data.totalBatches,
          completedBatches: 0,
          successfulRecords: 0,
          failedRecords: 0,
          pendingConfirmation: 0,
          currentBatch: 0,
          status: 'running',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Submission failed');
        setStatus('error');
      }
    };

    startSubmission();
  }, [groupedBatches, submissionId, setSubmissionId, setProgress]);

  // Poll progress while running
  useEffect(() => {
    if (status !== 'running' || !submissionId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${env.apiUrl}/api/submit/${submissionId}/progress`);
        if (!res.ok) {
          pollFailures.current += 1;
          if (pollFailures.current >= MAX_POLL_FAILURES) {
            setError(`Lost connection to server (${MAX_POLL_FAILURES} consecutive failures). Please check your connection and refresh.`);
            setStatus('error');
          }
          return;
        }
        pollFailures.current = 0;
        const data = await res.json();
        setProgress(data.progress);

        if (data.status === 'completed') {
          // Navigate to detailed results page with edit/resubmit capabilities
          router.push(`/submissions/${submissionId}/results`);
          return;
        } else if (data.status === 'paused') {
          setStatus('paused');
        }

        // BUG-002 fix: pendingConfirmation is now an array at top level of progress response
        if (Array.isArray(data.pendingConfirmation) && data.pendingConfirmation.length > 0) {
          setConfirmationRecords(data.pendingConfirmation);
          setStatus('confirming');
        }
      } catch (err) {
        pollFailures.current += 1;
        if (pollFailures.current >= MAX_POLL_FAILURES) {
          setError(`Lost connection to server (${MAX_POLL_FAILURES} consecutive failures). Please check your connection and refresh.`);
          setStatus('error');
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [status, submissionId, setProgress]);

  const handlePause = useCallback(async () => {
    if (!submissionId) return;
    await fetch(`${env.apiUrl}/api/submit/${submissionId}/pause`, { method: 'POST' });
    setStatus('paused');
  }, [submissionId]);

  const handleResume = useCallback(async () => {
    if (!submissionId) return;
    await fetch(`${env.apiUrl}/api/submit/${submissionId}/resume`, { method: 'POST' });
    setStatus('running');
  }, [submissionId]);

  const handleConfirm = useCallback(
    async (recordIds: string[]) => {
      if (!submissionId) return;
      try {
        await fetch(`${env.apiUrl}/api/submit/${submissionId}/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            confirmations: recordIds.map((id) => ({
              recordId: id,
              confirmType: 'individual',
              acceptAndConfirm: true,
            })),
          }),
        });
        setConfirmationRecords([]);
        setStatus('running');
      } catch {
        setError('Failed to submit confirmations');
      }
    },
    [submissionId],
  );

  const handleCancelConfirm = useCallback(() => {
    setConfirmationRecords([]);
    setStatus('running');
  }, []);

  if (status === 'idle') {
    return (
      <div>
        <h2 className="mb-4 text-2xl font-bold">Submission Progress</h2>
        <Card>
          <p className="text-slate-400">
            {groupedBatches.length === 0
              ? 'No active submission. Please upload and validate records first.'
              : `${groupedBatches.length} batch(es) ready. Starting submission...`}
          </p>
          {groupedBatches.length === 0 && (
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => router.push('/upload')}>
              Go to Upload
            </Button>
          )}
        </Card>
      </div>
    );
  }

  if (status === 'confirming' && confirmationRecords.length > 0) {
    return (
      <div>
        <h2 className="mb-4 text-2xl font-bold">Submission — Confirmation Required</h2>
        <ConfirmationDialog
          records={confirmationRecords}
          onConfirm={handleConfirm}
          onCancel={handleCancelConfirm}
        />
      </div>
    );
  }

  if (status === 'completed' && results) {
    return (
      <div>
        <h2 className="mb-4 text-2xl font-bold">Submission Complete</h2>
        <ResultsSummary
          submissionId={results.submissionId}
          completedAt={results.completedAt}
          totalRecords={results.totalRecords}
          successful={results.successful}
          failed={results.failed}
          confirmed={results.confirmed}
          results={results.results}
          onViewDetails={() => router.push(`/submissions/${results.submissionId}/results`)}
          onExport={() => window.open(`${env.apiUrl}/api/submit/${results.submissionId}/download`, '_blank')}
          onNewUpload={() => router.push('/upload')}
        />
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Submission Progress</h2>
      {error && (
        <Card className="mb-4 border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-400">{error}</p>
        </Card>
      )}
      {progress && (
        <SubmissionProgress
          progress={{
            totalBatches: progress.totalBatches,
            completedBatches: progress.completedBatches,
            successful: progress.successfulRecords,
            failed: progress.failedRecords,
            pendingConfirmation: progress.pendingConfirmation,
            status: status as 'running' | 'paused' | 'completed' | 'error',
          }}
          onPause={handlePause}
          onResume={handleResume}
        />
      )}
    </div>
  );
}
