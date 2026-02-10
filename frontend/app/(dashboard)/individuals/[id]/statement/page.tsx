'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { HistoryStatementResponse } from '@/types/individual';

export default function HistoryStatementPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const individualId = decodeURIComponent(params.id as string);
  const identifier = decodeURIComponent(searchParams.get('identifier') || individualId);
  const dob = searchParams.get('dob') || '';
  const provider = searchParams.get('provider') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statementData, setStatementData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const fetchStatement = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const resp = await fetch(`${apiUrl}/api/individuals/history/statement`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            individualIdentifier: identifier,
            informationProvider: { providerNumber: provider },
            ...(dob && { subjectDob: dob }),
          }),
        });

        const data: HistoryStatementResponse = await resp.json();

        if (data.status === 'success') {
          setStatementData(data.statementData || null);
        } else {
          setError(data.message);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load statement');
      } finally {
        setLoading(false);
      }
    };

    if (identifier && provider) {
      fetchStatement();
    } else {
      setError('Missing identifier or provider number');
      setLoading(false);
    }
  }, [identifier, provider]);

  const backQuery = new URLSearchParams({
    ...(dob && { dob }),
    ...(provider && { provider }),
  }).toString();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">History Statement</h1>
        <Link
          href={`/individuals/${encodeURIComponent(individualId)}?${backQuery}`}
          className="rounded-md bg-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-600"
        >
          Back to Hub
        </Link>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/50 bg-red-500/10 p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {statementData && (
        <div className="rounded-lg border border-slate-600 bg-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">
            Immunisation History Statement
          </h2>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-slate-900 p-4 text-xs text-slate-300">
            {JSON.stringify(statementData, null, 2)}
          </pre>
        </div>
      )}

      {!error && !statementData && (
        <p className="text-sm text-slate-400">No statement data available.</p>
      )}
    </div>
  );
}
