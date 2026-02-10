'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { HistoryDetailsResponse, VaccineDueDetail, ImmunisationHistoryEntry } from '@/types/individual';

export default function ImmunisationHistoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const individualId = params.id as string;
  const identifier = searchParams.get('identifier') || individualId;
  const dob = searchParams.get('dob') || '';
  const provider = searchParams.get('provider') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dueDetails, setDueDetails] = useState<VaccineDueDetail[]>([]);
  const [history, setHistory] = useState<ImmunisationHistoryEntry[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const resp = await fetch(`${apiUrl}/api/individuals/history/details`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            individualIdentifier: identifier,
            informationProvider: { providerNumber: provider },
          }),
        });

        const data: HistoryDetailsResponse = await resp.json();

        if (data.status === 'success') {
          setDueDetails(data.vaccineDueDetails || []);
          setHistory(data.immunisationHistory || []);
        } else {
          setError(data.message);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setLoading(false);
      }
    };

    if (identifier && provider) {
      fetchHistory();
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
        <h1 className="text-2xl font-bold text-slate-100">Immunisation History</h1>
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

      {/* Vaccines Due */}
      {dueDetails.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-200">Vaccines Due</h2>
          <div className="overflow-x-auto rounded-lg border border-slate-600">
            <table className="w-full text-sm">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-4 py-2 text-left text-slate-300">Antigen</th>
                  <th className="px-4 py-2 text-left text-slate-300">Due Date</th>
                  <th className="px-4 py-2 text-left text-slate-300">Dose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {dueDetails.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/30">
                    <td className="px-4 py-2 text-slate-200">
                      {item.antigenDescription || item.antigenCode || '-'}
                    </td>
                    <td className="px-4 py-2 text-slate-300">{item.dueDate || '-'}</td>
                    <td className="px-4 py-2 text-slate-300">{item.doseNumber || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Immunisation History */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-200">Immunisation History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400">No immunisation history found.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-600">
            <table className="w-full text-sm">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-4 py-2 text-left text-slate-300">Date</th>
                  <th className="px-4 py-2 text-left text-slate-300">Vaccine</th>
                  <th className="px-4 py-2 text-left text-slate-300">Dose</th>
                  <th className="px-4 py-2 text-left text-slate-300">Provider</th>
                  <th className="px-4 py-2 text-left text-slate-300">Editable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {history.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/30">
                    <td className="px-4 py-2 text-slate-200">{entry.dateOfService || '-'}</td>
                    <td className="px-4 py-2 text-slate-200">
                      {entry.vaccineDescription || entry.vaccineCode || '-'}
                    </td>
                    <td className="px-4 py-2 text-slate-300">{entry.vaccineDose || '-'}</td>
                    <td className="px-4 py-2 text-slate-300 font-mono text-xs">
                      {entry.providerNumber || '-'}
                    </td>
                    <td className="px-4 py-2">
                      {entry.editable ? (
                        <span className="rounded bg-emerald-600/20 px-2 py-0.5 text-xs text-emerald-400">
                          Yes
                        </span>
                      ) : (
                        <span className="rounded bg-slate-600/20 px-2 py-0.5 text-xs text-slate-400">
                          No
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
