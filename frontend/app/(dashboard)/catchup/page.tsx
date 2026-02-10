'use client';

import { useState } from 'react';

export default function CatchUpPage() {
  const [medicareCardNumber, setMedicareCardNumber] = useState('');
  const [medicareIRN, setMedicareIRN] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [plannedCatchUpDate, setPlannedCatchUpDate] = useState('');
  const [providerNumber, setProviderNumber] = useState('');
  const [result, setResult] = useState<{ status: string; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const inputClass = 'w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const resp = await fetch(`${apiUrl}/api/indicators/catchup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicareCardNumber,
          medicareIRN,
          dateOfBirth,
          gender,
          plannedCatchUpDate,
          informationProvider: { providerNumber },
        }),
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
      <h1 className="text-2xl font-bold text-slate-100">Planned Catch-Up Schedule</h1>
      <p className="text-sm text-slate-400">
        Set a planned catch-up vaccination date for an individual. This API uses Medicare card details directly (not individualIdentifier).
      </p>

      {result && (
        <div className={`rounded-md p-3 text-sm ${result.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {result.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-lg border border-slate-600 bg-slate-800 p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Medicare Card Number</label>
            <input value={medicareCardNumber} onChange={(e) => setMedicareCardNumber(e.target.value)}
              placeholder="e.g. 2123456789" required className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Medicare IRN</label>
            <input value={medicareIRN} onChange={(e) => setMedicareIRN(e.target.value)}
              placeholder="e.g. 1" required className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Date of Birth</label>
            <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)}
              required className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Gender</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)} required className={inputClass}>
              <option value="">Select...</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="X">Not Stated</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Planned Catch-Up Date</label>
            <input type="date" value={plannedCatchUpDate} onChange={(e) => setPlannedCatchUpDate(e.target.value)}
              required className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Provider Number</label>
            <input value={providerNumber} onChange={(e) => setProviderNumber(e.target.value)}
              placeholder="e.g. 1234567A" required className={inputClass} />
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50">
          {loading ? 'Submitting...' : 'Set Catch-Up Date'}
        </button>
      </form>
    </div>
  );
}
