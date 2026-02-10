'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { VaccineTrialHistoryResponse, VaccineTrialEntry } from '@/types/individual';

export default function VaccineTrialHistoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const individualId = params.id as string;
  const identifier = searchParams.get('identifier') || individualId;
  const dob = searchParams.get('dob') || '';
  const provider = searchParams.get('provider') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trialHistory, setTrialHistory] = useState<VaccineTrialEntry[]>([]);

  useEffect(() => {
    const fetchTrialHistory = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const resp = await fetch(`${apiUrl}/api/individuals/vaccinetrial/history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            individualIdentifier: identifier,
            informationProvider: { providerNumber: provider },
          }),
        });

        const data: VaccineTrialHistoryResponse = await resp.json();

        if (data.status === 'success') {
          setTrialHistory(data.trialHistory || []);
        } else {
          setError(data.message);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trial history');
      } finally {
        setLoading(false);
      }
    };

    if (identifier && provider) {
      fetchTrialHistory();
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
        <h1 className="text-2xl font-bold text-slate-100">Vaccine Trial History</h1>
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

      {trialHistory.length === 0 && !error ? (
        <p className="text-sm text-slate-400">No vaccine trial history found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-600">
          <table className="w-full text-sm">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="px-4 py-2 text-left text-slate-300">Trial Name</th>
                <th className="px-4 py-2 text-left text-slate-300">Vaccine</th>
                <th className="px-4 py-2 text-left text-slate-300">Dose</th>
                <th className="px-4 py-2 text-left text-slate-300">Date Administered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {trialHistory.map((entry, idx) => (
                <tr key={idx} className="hover:bg-slate-700/30">
                  <td className="px-4 py-2 text-slate-200">{entry.trialName || '-'}</td>
                  <td className="px-4 py-2 text-slate-200">
                    {entry.vaccineDescription || entry.vaccineCode || '-'}
                  </td>
                  <td className="px-4 py-2 text-slate-300">{entry.doseNumber || '-'}</td>
                  <td className="px-4 py-2 text-slate-300">{entry.dateAdministered || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
