'use client';

import { useState } from 'react';

export default function IndicatorsPage() {
  const [individualIdentifier, setIndividualIdentifier] = useState('');
  const [providerNumber, setProviderNumber] = useState('');
  const [indicatorCode, setIndicatorCode] = useState('');
  const [indigenousStatus, setIndigenousStatus] = useState('');
  const [result, setResult] = useState<{ status: string; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const inputClass = 'w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none';

  const callApi = async (path: string, body: Record<string, unknown>) => {
    setLoading(true);
    setResult(null);
    try {
      const resp = await fetch(`${apiUrl}${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await resp.json();
      setResult({ status: data.status, message: data.message });
    } catch (err) {
      setResult({ status: 'error', message: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Indicators & Status</h1>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Individual Identifier</label>
          <input value={individualIdentifier} onChange={(e) => setIndividualIdentifier(e.target.value)}
            placeholder="From search" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Provider Number</label>
          <input value={providerNumber} onChange={(e) => setProviderNumber(e.target.value)}
            placeholder="e.g. 1234567A" className={inputClass} />
        </div>
      </div>

      {result && (
        <div className={`rounded-md p-3 text-sm ${result.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {result.message}
        </div>
      )}

      {/* Vaccine Indicators */}
      <section className="rounded-lg border border-slate-600 bg-slate-800 p-4 space-y-3">
        <h2 className="text-lg font-semibold text-slate-200">Vaccine Indicators</h2>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Indicator Code</label>
          <input value={indicatorCode} onChange={(e) => setIndicatorCode(e.target.value)} className={inputClass} />
        </div>
        <div className="flex gap-2">
          <button disabled={loading} onClick={() => callApi('/api/indicators/vaccine/add', {
            individualIdentifier, vaccineIndicatorCode: indicatorCode,
            informationProvider: { providerNumber },
          })} className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50">
            Add Indicator
          </button>
          <button disabled={loading} onClick={() => callApi('/api/indicators/vaccine/remove', {
            individualIdentifier, vaccineIndicatorCode: indicatorCode,
            informationProvider: { providerNumber },
          })} className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50">
            Remove Indicator
          </button>
        </div>
      </section>

      {/* Indigenous Status */}
      <section className="rounded-lg border border-slate-600 bg-slate-800 p-4 space-y-3">
        <h2 className="text-lg font-semibold text-slate-200">Indigenous Status</h2>
        <select value={indigenousStatus} onChange={(e) => setIndigenousStatus(e.target.value)} className={inputClass}>
          <option value="">Select...</option>
          <option value="Y">Yes</option>
          <option value="N">No</option>
        </select>
        <button disabled={loading || !indigenousStatus} onClick={() => callApi('/api/indicators/indigenous-status', {
          individualIdentifier, indigenousStatus,
          informationProvider: { providerNumber },
        })} className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50">
          Update Indigenous Status
        </button>
      </section>
    </div>
  );
}
