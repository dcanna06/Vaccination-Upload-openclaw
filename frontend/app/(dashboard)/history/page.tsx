'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { env } from '@/lib/env';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Submission {
  submissionId: string;
  status: string;
  createdAt: string;
  completedAt: string;
  totalBatches: number;
  successfulRecords: number;
  failedRecords: number;
  dryRun: boolean;
}

export default function HistoryPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${env.apiUrl}/api/submissions`);
        if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
        const data = await res.json();
        setSubmissions(data.submissions ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div>
        <h2 className="mb-4 text-2xl font-bold">Submission History</h2>
        <Card className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-slate-300">Loading submissions...</span>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="mb-4 text-2xl font-bold">Submission History</h2>
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-400">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Submission History</h2>
      {submissions.length === 0 ? (
        <Card>
          <p className="text-slate-400">No submissions yet. Upload and submit a file to see history here.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => (
            <Card key={sub.submissionId}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="font-mono text-sm">{sub.submissionId.slice(0, 8)}...</span>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                    sub.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                    sub.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                    sub.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {sub.dryRun ? 'Dry Run' : sub.status}
                  </span>
                </CardTitle>
              </CardHeader>
              <div className="grid grid-cols-4 gap-4 text-center text-sm">
                <div>
                  <p className="font-medium text-slate-100">{sub.totalBatches}</p>
                  <p className="text-slate-400">Batches</p>
                </div>
                <div>
                  <p className="font-medium text-emerald-400">{sub.successfulRecords}</p>
                  <p className="text-slate-400">Successful</p>
                </div>
                <div>
                  <p className={`font-medium ${sub.failedRecords > 0 ? 'text-red-400' : 'text-slate-100'}`}>
                    {sub.failedRecords}
                  </p>
                  <p className="text-slate-400">Failed</p>
                </div>
                <div>
                  <p className="font-medium text-slate-100">
                    {sub.createdAt ? new Date(sub.createdAt).toLocaleString() : '-'}
                  </p>
                  <p className="text-slate-400">Created</p>
                </div>
              </div>
              {(sub.status === 'completed' || sub.status === 'error') && (
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    size="sm"
                    onClick={() => router.push(`/submissions/${sub.submissionId}/results`)}
                  >
                    View Results
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open(`${env.apiUrl}/api/submit/${sub.submissionId}/download`, '_blank')}
                  >
                    Download Report
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
