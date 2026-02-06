'use client';

import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface SubmissionProgressData {
  totalBatches: number;
  completedBatches: number;
  successful: number;
  failed: number;
  pendingConfirmation: number;
  status: 'running' | 'paused' | 'completed' | 'error';
}

interface SubmissionProgressProps {
  progress: SubmissionProgressData;
  onPause?: () => void;
  onResume?: () => void;
}

export function SubmissionProgress({ progress, onPause, onResume }: SubmissionProgressProps) {
  const percent =
    progress.totalBatches > 0
      ? Math.round((progress.completedBatches / progress.totalBatches) * 100)
      : 0;

  const statusLabels: Record<string, string> = {
    running: 'Submitting...',
    paused: 'Paused',
    completed: 'Completed',
    error: 'Error',
  };

  const statusColors: Record<string, string> = {
    running: 'text-blue-400',
    paused: 'text-yellow-400',
    completed: 'text-emerald-400',
    error: 'text-red-400',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submission Progress</CardTitle>
      </CardHeader>

      {/* Status */}
      <div className="mb-4 flex items-center justify-between">
        <span className={`text-sm font-medium ${statusColors[progress.status]}`}>
          {statusLabels[progress.status]}
        </span>
        <span className="text-sm text-slate-400">
          {progress.completedBatches} / {progress.totalBatches} batches
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-6 h-3 overflow-hidden rounded-full bg-slate-700">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${percent}%` }}
          data-testid="progress-bar"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* Counts */}
      <div className="mb-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-lg font-bold text-emerald-400">{progress.successful}</p>
          <p className="text-xs text-slate-400">Successful</p>
        </div>
        <div>
          <p className="text-lg font-bold text-red-400">{progress.failed}</p>
          <p className="text-xs text-slate-400">Failed</p>
        </div>
        <div>
          <p className="text-lg font-bold text-yellow-400">{progress.pendingConfirmation}</p>
          <p className="text-xs text-slate-400">Pending Confirm</p>
        </div>
      </div>

      {/* Controls */}
      {(progress.status === 'running' || progress.status === 'paused') && (
        <div className="flex justify-end gap-2">
          {progress.status === 'running' && onPause && (
            <Button variant="secondary" size="sm" onClick={onPause}>
              Pause
            </Button>
          )}
          {progress.status === 'paused' && onResume && (
            <Button size="sm" onClick={onResume}>
              Resume
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
