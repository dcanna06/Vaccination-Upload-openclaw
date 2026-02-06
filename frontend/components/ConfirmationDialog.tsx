'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ConfirmationRecord {
  recordId: string;
  rowNumber: number;
  reason: string;
  airMessage: string;
  claimId: string;
  claimSequenceNumber?: string;
}

interface ConfirmationDialogProps {
  records: ConfirmationRecord[];
  onConfirm: (recordIds: string[]) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ConfirmationDialog({
  records,
  onConfirm,
  onCancel,
  isSubmitting = false,
}: ConfirmationDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(records.map((r) => r.recordId)));

  const toggleRecord = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === records.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(records.map((r) => r.recordId)));
    }
  };

  const handleConfirm = () => {
    onConfirm([...selected]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Records Requiring Confirmation ({records.length})</CardTitle>
      </CardHeader>

      <p className="mb-4 text-sm text-slate-400">
        The following records were not found on AIR or have pended episodes.
        Review and select the records you wish to confirm.
      </p>

      {/* Select all */}
      <div className="mb-3 flex items-center gap-2 border-b border-slate-700 pb-3">
        <input
          type="checkbox"
          checked={selected.size === records.length}
          onChange={toggleAll}
          className="rounded border-slate-600"
          data-testid="select-all"
        />
        <span className="text-sm text-slate-300">
          Select all ({selected.size} of {records.length} selected)
        </span>
      </div>

      {/* Records list */}
      <div className="max-h-96 space-y-2 overflow-y-auto" data-testid="confirmation-list">
        {records.map((rec) => (
          <div
            key={rec.recordId}
            className={`flex items-start gap-3 rounded-md border p-3 ${
              selected.has(rec.recordId)
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-slate-700 bg-slate-800/50'
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(rec.recordId)}
              onChange={() => toggleRecord(rec.recordId)}
              className="mt-1 rounded border-slate-600"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-200">Row {rec.rowNumber}</span>
                <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-xs text-yellow-400">
                  {rec.reason}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{rec.airMessage}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Claim ID: {rec.claimId}
                {rec.claimSequenceNumber && ` | Seq: ${rec.claimSequenceNumber}`}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-4 flex justify-end gap-2 border-t border-slate-700 pt-4">
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleConfirm}
          disabled={selected.size === 0 || isSubmitting}
        >
          {isSubmitting ? 'Confirming...' : `Confirm ${selected.size} Record${selected.size !== 1 ? 's' : ''}`}
        </Button>
      </div>
    </Card>
  );
}
