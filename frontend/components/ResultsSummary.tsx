'use client';

import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ResultRecord {
  recordId: string;
  originalRow: number;
  status: 'success' | 'failed' | 'confirmed';
  claimId?: string;
  claimSequenceNumber?: string;
  errorCode?: string;
  errorMessage?: string;
}

interface ResultsSummaryProps {
  submissionId: string;
  completedAt: string;
  totalRecords: number;
  successful: number;
  failed: number;
  confirmed: number;
  results: ResultRecord[];
  onExport?: () => void;
  onNewUpload?: () => void;
  onViewDetails?: () => void;
}

export function ResultsSummary({
  submissionId,
  completedAt,
  totalRecords,
  successful,
  failed,
  confirmed,
  results,
  onExport,
  onNewUpload,
  onViewDetails,
}: ResultsSummaryProps) {
  const failedRecords = results.filter((r) => r.status === 'failed');

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <Card>
        <CardHeader>
          <CardTitle>Submission Complete</CardTitle>
        </CardHeader>
        <div className="mb-4 text-sm text-slate-400">
          <p>Submission ID: <span className="font-mono text-slate-300">{submissionId}</span></p>
          <p>Completed: {completedAt}</p>
        </div>

        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-slate-100">{totalRecords}</p>
            <p className="text-xs text-slate-400">Total</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-400">{successful}</p>
            <p className="text-xs text-slate-400">Successful</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-400">{failed}</p>
            <p className="text-xs text-slate-400">Failed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-400">{confirmed}</p>
            <p className="text-xs text-slate-400">Confirmed</p>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          {onViewDetails && (
            <Button size="sm" onClick={onViewDetails}>
              View Detailed Results
            </Button>
          )}
          {onExport && (
            <Button variant="secondary" size="sm" onClick={onExport}>
              Export Report
            </Button>
          )}
          {onNewUpload && (
            <Button variant="secondary" size="sm" onClick={onNewUpload}>
              New Upload
            </Button>
          )}
        </div>
      </Card>

      {/* Successful records with claim IDs */}
      {results.some((r) => r.claimId) && (
        <Card className="overflow-hidden p-0">
          <CardHeader className="px-6 pt-4">
            <CardTitle>Claim IDs</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="claim-table">
              <thead>
                <tr className="border-b border-slate-700 text-left text-slate-400">
                  <th className="px-6 py-3">Row</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Claim ID</th>
                </tr>
              </thead>
              <tbody>
                {results
                  .filter((r) => r.claimId)
                  .map((r) => (
                    <tr key={r.recordId} className="border-b border-slate-700/50 text-slate-300">
                      <td className="px-6 py-2">{r.originalRow}</td>
                      <td className="px-6 py-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs ${
                            r.status === 'success'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : r.status === 'confirmed'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-2 font-mono text-xs">{r.claimId}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Failed records */}
      {failedRecords.length > 0 && (
        <Card className="overflow-hidden p-0">
          <CardHeader className="px-6 pt-4">
            <CardTitle>Failed Records ({failedRecords.length})</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="failed-table">
              <thead>
                <tr className="border-b border-slate-700 text-left text-slate-400">
                  <th className="px-6 py-3">Row</th>
                  <th className="px-6 py-3">Error Code</th>
                  <th className="px-6 py-3">Error Message</th>
                </tr>
              </thead>
              <tbody>
                {failedRecords.map((r) => (
                  <tr key={r.recordId} className="border-b border-slate-700/50 text-slate-300">
                    <td className="px-6 py-2">{r.originalRow}</td>
                    <td className="px-6 py-2 font-mono text-xs text-red-400">
                      {r.errorCode || '—'}
                    </td>
                    <td className="px-6 py-2">{r.errorMessage || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
