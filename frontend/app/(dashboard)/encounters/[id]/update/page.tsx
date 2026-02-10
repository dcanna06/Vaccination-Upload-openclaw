'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';

interface EpisodeField {
  id: string;
  vaccineCode: string;
  vaccineDose: string;
  vaccineBatch: string;
  vaccineType: string;
  routeOfAdministration: string;
}

export default function UpdateEncounterPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const encounterId = params.id as string;
  const individualIdentifier = searchParams.get('identifier') || '';
  const provider = searchParams.get('provider') || '';
  const dateOfService = searchParams.get('dos') || '';
  const existingVaccineCode = searchParams.get('vaccineCode') || '';
  const existingDose = searchParams.get('dose') || '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [episodes, setEpisodes] = useState<EpisodeField[]>([
    {
      id: '1',
      vaccineCode: existingVaccineCode,
      vaccineDose: existingDose,
      vaccineBatch: '',
      vaccineType: '',
      routeOfAdministration: '',
    },
  ]);

  const updateEpisode = (index: number, field: keyof EpisodeField, value: string) => {
    setEpisodes((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const encounterData = {
        id: '1',
        dateOfService,
        episodes: episodes.map((ep) => ({
          id: ep.id,
          vaccineCode: ep.vaccineCode,
          vaccineDose: ep.vaccineDose,
          ...(ep.vaccineBatch && { vaccineBatch: ep.vaccineBatch }),
          ...(ep.vaccineType && { vaccineType: ep.vaccineType }),
          ...(ep.routeOfAdministration && { routeOfAdministration: ep.routeOfAdministration }),
        })),
      };

      const resp = await fetch(`${apiUrl}/api/encounters/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          individualIdentifier,
          encounters: [encounterData],
          informationProvider: { providerNumber: provider },
        }),
      });

      const data = await resp.json();

      if (data.status === 'success') {
        setSuccess(data.message || 'Encounter updated successfully');
      } else {
        // Display verbatim AIR message
        setError(data.message || 'Update failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update request failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500';
  const labelClass = 'block text-sm font-medium text-slate-300 mb-1';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Update Encounter</h1>

      <div className="rounded-md border border-slate-600 bg-slate-800/50 p-4 text-sm">
        <p className="text-slate-400">
          Encounter ID: <span className="text-slate-200 font-mono">{encounterId}</span>
        </p>
        {dateOfService && (
          <p className="text-slate-400 mt-1">
            Date of Service: <span className="text-slate-200">{dateOfService}</span>
          </p>
        )}
      </div>

      {success && (
        <div className="rounded-md border border-emerald-500/50 bg-emerald-500/10 p-3">
          <p className="text-sm text-emerald-400">{success}</p>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-500/50 bg-red-500/10 p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {episodes.map((ep, idx) => (
          <div key={ep.id} className="rounded-lg border border-slate-600 bg-slate-800 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-300">Episode {ep.id}</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Vaccine Code</label>
                <input
                  type="text"
                  value={ep.vaccineCode}
                  onChange={(e) => updateEpisode(idx, 'vaccineCode', e.target.value)}
                  maxLength={6}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Dose</label>
                <input
                  type="text"
                  value={ep.vaccineDose}
                  onChange={(e) => updateEpisode(idx, 'vaccineDose', e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Batch Number</label>
                <input
                  type="text"
                  value={ep.vaccineBatch}
                  onChange={(e) => updateEpisode(idx, 'vaccineBatch', e.target.value)}
                  maxLength={15}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Vaccine Type</label>
                <select
                  value={ep.vaccineType}
                  onChange={(e) => updateEpisode(idx, 'vaccineType', e.target.value)}
                  className={inputClass}
                >
                  <option value="">None</option>
                  <option value="NIP">NIP</option>
                  <option value="OTH">OTH</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Route</label>
                <select
                  value={ep.routeOfAdministration}
                  onChange={(e) => updateEpisode(idx, 'routeOfAdministration', e.target.value)}
                  className={inputClass}
                >
                  <option value="">None</option>
                  <option value="IM">IM - Intramuscular</option>
                  <option value="SC">SC - Subcutaneous</option>
                  <option value="ID">ID - Intradermal</option>
                  <option value="PO">PO - Oral</option>
                  <option value="NS">NS - Nasal</option>
                </select>
              </div>
            </div>
          </div>
        ))}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Encounter'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md bg-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
