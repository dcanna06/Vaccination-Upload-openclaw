'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RecordCard } from '@/components/submission/RecordCard';
import { ResultsToolbar } from '@/components/submission/ResultsToolbar';
import { EditResubmitPanel } from '@/components/submission/EditResubmitPanel';
import { env } from '@/lib/env';
import type { SubmissionResult, SubmissionResultRecord } from '@/types/submission';

type StatusFilter = 'ALL' | 'SUCCESS' | 'WARNING' | 'ERROR';

export default function SubmissionResultsPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.id as string;

  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('ALL');
  const [editingRecord, setEditingRecord] = useState<SubmissionResultRecord | null>(null);
  const [confirmingAll, setConfirmingAll] = useState(false);

  // Fetch results
  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${env.apiUrl}/api/submissions/${submissionId}/results`);
      if (!res.ok) {
        throw new Error(res.status === 404 ? 'Submission not found' : `Failed to load results (${res.status})`);
      }
      const data: SubmissionResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results');
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Client-side filtering (for ≤50 records)
  const filteredRecords = useMemo(() => {
    if (!result) return [];
    if (activeFilter === 'ALL') return result.records;
    return result.records.filter((r) => r.status === activeFilter);
  }, [result, activeFilter]);

  // Check if any records can be confirmed
  const hasConfirmable = useMemo(
    () => result?.records.some((r) => r.actionRequired === 'CONFIRM_OR_CORRECT') ?? false,
    [result],
  );

  // Handlers
  const handleExport = useCallback(async () => {
    window.open(`${env.apiUrl}/api/submit/${submissionId}/download`, '_blank');
  }, [submissionId]);

  const handleConfirmRecord = useCallback(
    async (record: SubmissionResultRecord) => {
      try {
        const res = await fetch(
          `${env.apiUrl}/api/submissions/${submissionId}/records/${record.rowNumber}/confirm`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' } },
        );
        if (!res.ok) throw new Error('Confirm failed');
        // Refresh results
        await fetchResults();
      } catch {
        // Will be handled by DEV-007 state management
      }
    },
    [submissionId, fetchResults],
  );

  const handleConfirmAll = useCallback(async () => {
    try {
      setConfirmingAll(true);
      const res = await fetch(`${env.apiUrl}/api/submissions/${submissionId}/confirm-all-warnings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Confirm all failed');
      await fetchResults();
    } catch {
      // Will be handled by DEV-007 state management
    } finally {
      setConfirmingAll(false);
    }
  }, [submissionId, fetchResults]);

  const handleEditResubmit = useCallback((record: SubmissionResultRecord) => {
    setEditingRecord(record);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Loading results...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !result) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">{error || 'No results found'}</p>
          <Button variant="secondary" onClick={() => router.push('/history')}>
            Back to History
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary header — DEV-002 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Submission Results</h1>
            <p className="text-sm text-slate-400 mt-1">
              <span className="font-mono">{submissionId.slice(0, 8)}...</span>
              {result.completedAt && (
                <span> &middot; Completed {new Date(result.completedAt).toLocaleString()}</span>
              )}
              {result.environment && (
                <span className="ml-2 rounded bg-slate-700 px-1.5 py-0.5 text-xs font-mono">
                  {result.environment}
                </span>
              )}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => router.push('/history')}>
            Back to History
          </Button>
        </div>

        {/* Status counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="text-center py-4">
            <p className="text-3xl font-bold text-slate-100">{result.counts.total}</p>
            <p className="text-xs text-slate-400 mt-1">Total Records</p>
          </Card>
          <Card className="text-center py-4">
            <p className="text-3xl font-bold text-emerald-400">{result.counts.success}</p>
            <p className="text-xs text-slate-400 mt-1">Successful</p>
          </Card>
          <Card className="text-center py-4">
            <p className="text-3xl font-bold text-yellow-400">{result.counts.warning}</p>
            <p className="text-xs text-slate-400 mt-1">Warnings</p>
          </Card>
          <Card className="text-center py-4">
            <p className="text-3xl font-bold text-red-400">{result.counts.error}</p>
            <p className="text-xs text-slate-400 mt-1">Errors</p>
          </Card>
        </div>
      </div>

      {/* Filter toolbar — DEV-004 */}
      <ResultsToolbar
        counts={result.counts}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onExport={handleExport}
        onConfirmAll={hasConfirmable ? handleConfirmAll : undefined}
        hasConfirmable={hasConfirmable}
      />

      {/* Record cards — DEV-003 */}
      <div className="space-y-3">
        {filteredRecords.length === 0 ? (
          <Card>
            <p className="text-center text-sm text-slate-400 py-4">
              No {activeFilter.toLowerCase()} records found.
            </p>
          </Card>
        ) : (
          filteredRecords.map((record) => (
            <RecordCard
              key={record.rowNumber}
              record={record}
              onEditResubmit={handleEditResubmit}
              onConfirm={handleConfirmRecord}
            />
          ))
        )}
      </div>

      {/* Edit & Resubmit panel — DEV-005 */}
      {editingRecord && (
        <EditResubmitPanel
          record={editingRecord}
          submissionId={submissionId}
          onClose={() => setEditingRecord(null)}
          onSuccess={() => {
            setEditingRecord(null);
            fetchResults();
          }}
        />
      )}
    </div>
  );
}
