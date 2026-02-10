'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface DeactivateDialogProps {
  open: boolean;
  locationName: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function DeactivateDialog({ open, locationName, onConfirm, onCancel }: DeactivateDialogProps) {
  const [processing, setProcessing] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    setProcessing(true);
    try {
      await onConfirm();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-800 p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold text-slate-100">Deactivate Location</h2>
        <p className="mb-4 text-sm text-slate-400">
          Are you sure you want to deactivate <strong className="text-slate-200">{locationName}</strong>?
          This location will no longer be available for submissions.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={processing}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={processing}>
            {processing ? 'Deactivating...' : 'Deactivate'}
          </Button>
        </div>
      </div>
    </div>
  );
}
