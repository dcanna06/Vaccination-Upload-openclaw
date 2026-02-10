'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { IdentifyIndividualResponse } from '@/types/individual';

type SearchMode = 'medicare' | 'ihi' | 'demographics';

export default function IndividualSearchPage() {
  const router = useRouter();
  const [searchMode, setSearchMode] = useState<SearchMode>('medicare');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [medicareNumber, setMedicareNumber] = useState('');
  const [medicareIRN, setMedicareIRN] = useState('');
  const [ihiNumber, setIhiNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [postCode, setPostCode] = useState('');
  const [providerNumber, setProviderNumber] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        personalDetails: {
          dateOfBirth,
          ...(gender && { gender }),
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
        },
        informationProvider: { providerNumber },
      };

      if (searchMode === 'medicare') {
        body.medicareCard = {
          medicareCardNumber: medicareNumber,
          ...(medicareIRN && { medicareIRN }),
        };
      } else if (searchMode === 'ihi') {
        body.ihiNumber = ihiNumber;
      } else {
        body.postCode = postCode;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const resp = await fetch(`${apiUrl}/api/individuals/identify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await resp.json();

      if (!resp.ok) {
        // Handle validation errors (422) or server errors (502)
        if (data.detail) {
          const msg = Array.isArray(data.detail)
            ? data.detail.map((d: { msg: string; loc?: string[] }) =>
                `${d.loc?.slice(-1)[0] || 'field'}: ${d.msg}`
              ).join('; ')
            : data.detail;
          setError(msg);
        } else {
          setError(data.message || `Server error (${resp.status})`);
        }
        return;
      }

      const result = data as IdentifyIndividualResponse;

      if (result.status === 'success' && result.individualIdentifier) {
        const params = new URLSearchParams({
          identifier: result.individualIdentifier,
          ...(dateOfBirth && { dob: dateOfBirth }),
          ...(providerNumber && { provider: providerNumber }),
        });
        router.push(`/individuals/${encodeURIComponent(result.individualIdentifier)}?${params.toString()}`);
      } else {
        // Display verbatim AIR message per TECH.SIS.AIR.02 Section 5.2.2
        const airErrors = (data.errors as { code?: string; field?: string; message?: string }[]) || [];
        const details = airErrors.length > 0
          ? airErrors.map((e) => `${e.code || ''}: ${e.message || ''}`).join('; ')
          : '';
        setError(
          `${result.statusCode || ''} — ${result.message || 'Individual not found'}${details ? `\n${details}` : ''}`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500';
  const labelClass = 'block text-sm font-medium text-slate-300 mb-1';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Search Individual</h1>
      <p className="text-sm text-slate-400">
        Identify an individual on the Australian Immunisation Register. At least one
        identification method is required.
      </p>

      {/* Search mode tabs */}
      <div className="flex gap-2">
        {(['medicare', 'ihi', 'demographics'] as SearchMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => { setSearchMode(mode); setError(null); }}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              searchMode === mode
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {mode === 'medicare' ? 'Medicare' : mode === 'ihi' ? 'IHI' : 'Demographics'}
          </button>
        ))}
      </div>

      {/* Minimum ID requirements */}
      <div className="rounded-md border border-slate-600 bg-slate-800/50 p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Minimum Identification Required</h3>
        <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1">
          {searchMode === 'medicare' && (
            <>
              <li>Medicare Card Number + IRN</li>
              <li>Last Name + Date of Birth + Gender</li>
            </>
          )}
          {searchMode === 'ihi' && (
            <>
              <li>Individual Healthcare Identifier (16 digits)</li>
              <li>Last Name + Date of Birth + Gender</li>
            </>
          )}
          {searchMode === 'demographics' && (
            <>
              <li>First Name + Last Name</li>
              <li>Date of Birth + Gender + Postcode</li>
            </>
          )}
        </ul>
      </div>

      <form onSubmit={handleSearch} className="space-y-4">
        {/* Medicare fields */}
        {searchMode === 'medicare' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Medicare Card Number</label>
              <input
                type="text"
                value={medicareNumber}
                onChange={(e) => setMedicareNumber(e.target.value)}
                placeholder="10 digits"
                maxLength={10}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>IRN</label>
              <input
                type="text"
                value={medicareIRN}
                onChange={(e) => setMedicareIRN(e.target.value)}
                placeholder="1-9"
                maxLength={1}
                className={inputClass}
                required
              />
            </div>
          </div>
        )}

        {/* IHI field */}
        {searchMode === 'ihi' && (
          <div>
            <label className={labelClass}>IHI Number</label>
            <input
              type="text"
              value={ihiNumber}
              onChange={(e) => setIhiNumber(e.target.value)}
              placeholder="16 digits"
              maxLength={16}
              className={inputClass}
              required
            />
          </div>
        )}

        {/* Name fields — lastName required by AIR for all search modes */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              maxLength={40}
              className={inputClass}
              required={searchMode === 'demographics'}
            />
          </div>
          <div>
            <label className={labelClass}>Last Name *</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              maxLength={40}
              className={inputClass}
              required
            />
          </div>
        </div>

        {/* Common fields: DOB, Gender, Provider */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Date of Birth</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Select...</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="X">Not Stated</option>
            </select>
          </div>
          {searchMode === 'demographics' && (
            <div>
              <label className={labelClass}>Postcode</label>
              <input
                type="text"
                value={postCode}
                onChange={(e) => setPostCode(e.target.value)}
                placeholder="4 digits"
                maxLength={4}
                className={inputClass}
                required
              />
            </div>
          )}
        </div>

        <div>
          <label className={labelClass}>Information Provider Number</label>
          <input
            type="text"
            value={providerNumber}
            onChange={(e) => setProviderNumber(e.target.value)}
            placeholder="e.g. 1234567A"
            maxLength={8}
            className={inputClass}
            required
          />
        </div>

        {/* Error display — verbatim AIR message */}
        {error && (
          <div className="rounded-md border border-red-500/50 bg-red-500/10 p-3">
            <p className="text-sm text-red-400 whitespace-pre-line">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search AIR'}
        </button>
      </form>
    </div>
  );
}
