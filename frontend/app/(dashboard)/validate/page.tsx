'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ValidationResults } from '@/components/ValidationResults';
import { useUploadStore } from '@/stores/uploadStore';
import { env } from '@/lib/env';
import { Card } from '@/components/ui/Card';

interface ValidationResult {
  isValid: boolean;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  errors: Array<{
    rowNumber: number;
    field: string;
    errorCode: string;
    message: string;
    value?: string;
  }>;
}

export default function ValidatePage() {
  const router = useRouter();
  const { parsedRows } = useUploadStore();
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (parsedRows.length === 0) return;

    const validate = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${env.apiUrl}/api/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records: parsedRows }),
        });
        if (!res.ok) throw new Error(`Validation failed: ${res.status}`);
        const data = await res.json();
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Validation failed');
      } finally {
        setLoading(false);
      }
    };

    validate();
  }, [parsedRows]);

  const handleProceed = useCallback(() => {
    router.push('/submit');
  }, [router]);

  if (parsedRows.length === 0) {
    return (
      <div>
        <h2 className="mb-4 text-2xl font-bold">Validation Results</h2>
        <Card>
          <p className="text-slate-400">No data to validate. Please upload a file first.</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <h2 className="mb-4 text-2xl font-bold">Validation Results</h2>
        <Card className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-slate-300">Validating records...</span>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="mb-4 text-2xl font-bold">Validation Results</h2>
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-400">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Validation Results</h2>
      {result && (
        <ValidationResults
          totalRecords={result.totalRecords}
          validRecords={result.validRecords}
          invalidRecords={result.invalidRecords}
          errors={result.errors}
          onProceed={handleProceed}
        />
      )}
    </div>
  );
}
