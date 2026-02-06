'use client';

import { useCallback, useEffect, useState } from 'react';
import { SubmissionProgress } from '@/components/SubmissionProgress';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { ResultsSummary } from '@/components/ResultsSummary';
import { useSubmissionStore } from '@/stores/submissionStore';
import { env } from '@/lib/env';
import { Card } from '@/components/ui/Card';

type SubmitStatus = 'idle' | 'running' | 'paused' | 'confirming' | 'completed' | 'error';

export default function SubmitPage() {
  const { submissionId, setSubmissionId, progress, setProgress } = useSubmissionStore();
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [error, setError] = useState<string | null>(null);
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

  // Poll progress while running
  useEffect(() => {
    if (status !== 'running' || !submissionId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${env.apiUrl}/api/submit/${submissionId}/progress`);
        if (!res.ok) return;
        const data = await res.json();
        setProgress(data.progress);

        if (data.status === 'completed') {
          setStatus('completed');
          // Fetch final results
          const resultsRes = await fetch(`${env.apiUrl}/api/submit/${submissionId}/results`);
          if (resultsRes.ok) {
            setResults(await resultsRes.json());
          }
        } else if (data.status === 'paused') {
          setStatus('paused');
        }

        if (data.pendingConfirmation?.length > 0) {
          setConfirmationRecords(data.pendingConfirmation);
          setStatus('confirming');
        }
      } catch {
        // Ignore polling errors
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
            No active submission. Please upload and validate records first.
          </p>
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
          onNewUpload={() => (window.location.href = '/upload')}
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
