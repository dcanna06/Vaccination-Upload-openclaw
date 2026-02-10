'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ContraindicationEntry {
  antigenCode?: string;
  antigenDescription?: string;
  contraindicationCode?: string;
  contraindicationDescription?: string;
  startDate?: string;
  endDate?: string;
}

interface NaturalImmunityEntry {
  diseaseCode?: string;
  diseaseDescription?: string;
  evidenceDate?: string;
}

export default function ExemptionsPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const individualId = params.id as string;
  const identifier = searchParams.get('identifier') || individualId;
  const dob = searchParams.get('dob') || '';
  const provider = searchParams.get('provider') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contraindications, setContraindications] = useState<ContraindicationEntry[]>([]);
  const [naturalImmunity, setNaturalImmunity] = useState<NaturalImmunityEntry[]>([]);

  // Record form state
  const [showContraindicationForm, setShowContraindicationForm] = useState(false);
  const [showImmunityForm, setShowImmunityForm] = useState(false);
  const [formResult, setFormResult] = useState<{ status: string; message: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const body = {
        individualIdentifier: identifier,
        informationProvider: { providerNumber: provider },
      };

      try {
        const [contrResp, immResp] = await Promise.all([
          fetch(`${apiUrl}/api/exemptions/contraindication/history`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
          }),
          fetch(`${apiUrl}/api/exemptions/naturalimmunity/history`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
          }),
        ]);

        const contrData = await contrResp.json();
        const immData = await immResp.json();

        if (contrData.status === 'success') setContraindications(contrData.contraindicationHistory || []);
        if (immData.status === 'success') setNaturalImmunity(immData.naturalImmunityHistory || []);
        if (contrData.status === 'error' && immData.status === 'error') setError(contrData.message);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };

    if (identifier && provider) fetchData();
    else { setError('Missing identifier or provider'); setLoading(false); }
  }, [identifier, provider]);

  const handleRecordContraindication = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    try {
      const resp = await fetch(`${apiUrl}/api/exemptions/contraindication/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          individualIdentifier: identifier,
          antigenCode: form.get('antigenCode'),
          contraindicationCode: form.get('contraindicationCode'),
          startDate: form.get('startDate'),
          endDate: form.get('endDate') || undefined,
          informationProvider: { providerNumber: provider },
        }),
      });
      const data = await resp.json();
      setFormResult({ status: data.status, message: data.message });
    } catch (err) {
      setFormResult({ status: 'error', message: err instanceof Error ? err.message : 'Failed' });
    }
  };

  const handleRecordImmunity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    try {
      const resp = await fetch(`${apiUrl}/api/exemptions/naturalimmunity/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          individualIdentifier: identifier,
          diseaseCode: form.get('diseaseCode'),
          evidenceDate: form.get('evidenceDate'),
          informationProvider: { providerNumber: provider },
        }),
      });
      const data = await resp.json();
      setFormResult({ status: data.status, message: data.message });
    } catch (err) {
      setFormResult({ status: 'error', message: err instanceof Error ? err.message : 'Failed' });
    }
  };

  const backQuery = new URLSearchParams({ ...(dob && { dob }), ...(provider && { provider }) }).toString();
  const inputClass = 'w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none';

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
        <h1 className="text-2xl font-bold text-slate-100">Exemptions</h1>
        <Link href={`/individuals/${encodeURIComponent(individualId)}?${backQuery}`}
          className="rounded-md bg-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-600">
          Back to Hub
        </Link>
      </div>

      {error && <div className="rounded-md border border-red-500/50 bg-red-500/10 p-3"><p className="text-sm text-red-400">{error}</p></div>}
      {formResult && (
        <div className={`rounded-md p-3 text-sm ${formResult.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {formResult.message}
        </div>
      )}

      {/* Medical Contraindications */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-200">Medical Contraindications</h2>
          <button onClick={() => setShowContraindicationForm(!showContraindicationForm)}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700">
            {showContraindicationForm ? 'Cancel' : 'Record New'}
          </button>
        </div>

        {showContraindicationForm && (
          <form onSubmit={handleRecordContraindication} className="rounded-lg border border-slate-600 bg-slate-800 p-4 grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-slate-400 mb-1">Antigen Code</label><input name="antigenCode" required className={inputClass} /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Contraindication Code</label><input name="contraindicationCode" required className={inputClass} /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Start Date</label><input name="startDate" type="date" required className={inputClass} /></div>
            <div><label className="block text-xs text-slate-400 mb-1">End Date (optional)</label><input name="endDate" type="date" className={inputClass} /></div>
            <div className="col-span-2"><button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700">Record Contraindication</button></div>
          </form>
        )}

        {contraindications.length === 0 ? (
          <p className="text-sm text-slate-400">No contraindications recorded.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-600">
            <table className="w-full text-sm">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-4 py-2 text-left text-slate-300">Antigen</th>
                  <th className="px-4 py-2 text-left text-slate-300">Contraindication</th>
                  <th className="px-4 py-2 text-left text-slate-300">Start</th>
                  <th className="px-4 py-2 text-left text-slate-300">End</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {contraindications.map((entry, idx) => (
                  <tr key={idx}><td className="px-4 py-2 text-slate-200">{entry.antigenDescription || entry.antigenCode || '-'}</td>
                    <td className="px-4 py-2 text-slate-300">{entry.contraindicationDescription || entry.contraindicationCode || '-'}</td>
                    <td className="px-4 py-2 text-slate-300">{entry.startDate || '-'}</td>
                    <td className="px-4 py-2 text-slate-300">{entry.endDate || '-'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Natural Immunity */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-200">Natural Immunity</h2>
          <button onClick={() => setShowImmunityForm(!showImmunityForm)}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700">
            {showImmunityForm ? 'Cancel' : 'Record New'}
          </button>
        </div>

        {showImmunityForm && (
          <form onSubmit={handleRecordImmunity} className="rounded-lg border border-slate-600 bg-slate-800 p-4 grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-slate-400 mb-1">Disease Code</label><input name="diseaseCode" required className={inputClass} /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Evidence Date</label><input name="evidenceDate" type="date" required className={inputClass} /></div>
            <div className="col-span-2"><button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700">Record Natural Immunity</button></div>
          </form>
        )}

        {naturalImmunity.length === 0 ? (
          <p className="text-sm text-slate-400">No natural immunity recorded.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-600">
            <table className="w-full text-sm">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-4 py-2 text-left text-slate-300">Disease</th>
                  <th className="px-4 py-2 text-left text-slate-300">Evidence Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {naturalImmunity.map((entry, idx) => (
                  <tr key={idx}><td className="px-4 py-2 text-slate-200">{entry.diseaseDescription || entry.diseaseCode || '-'}</td>
                    <td className="px-4 py-2 text-slate-300">{entry.evidenceDate || '-'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
