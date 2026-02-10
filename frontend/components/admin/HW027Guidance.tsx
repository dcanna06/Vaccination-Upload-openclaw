'use client';

import { Card } from '@/components/ui/Card';

interface HW027GuidanceProps {
  currentStatus: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  not_submitted: { label: 'Not Submitted', color: 'text-slate-400' },
  submitted: { label: 'Submitted', color: 'text-yellow-400' },
  approved: { label: 'Approved', color: 'text-emerald-400' },
  rejected: { label: 'Rejected', color: 'text-red-400' },
};

export function HW027Guidance({ currentStatus }: HW027GuidanceProps) {
  const status = STATUS_LABELS[currentStatus] || STATUS_LABELS.not_submitted;

  return (
    <Card className="mt-4">
      <h4 className="mb-2 text-sm font-semibold text-slate-100">HW027 Provider Registration</h4>
      <p className="mb-2 text-xs text-slate-400">
        Form HW027 must be submitted to Services Australia to register an immunisation
        provider for AIR reporting. The form authorises the provider to report vaccination
        encounters via the AIR API.
      </p>

      <div className="mb-3">
        <span className="text-xs text-slate-400">Current status: </span>
        <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
      </div>

      <div className="space-y-2 text-xs text-slate-400">
        <p><strong className="text-slate-300">Steps:</strong></p>
        <ol className="ml-4 list-decimal space-y-1">
          <li>Download HW027 form from the Services Australia website</li>
          <li>Complete the form with provider and organisation details</li>
          <li>Submit the completed form to Services Australia</li>
          <li>Update the status here once submitted/approved</li>
          <li>Verify the provider&apos;s AIR access using the Verify button</li>
        </ol>
      </div>
    </Card>
  );
}
