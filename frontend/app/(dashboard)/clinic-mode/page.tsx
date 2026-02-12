'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useClinicStore } from '@/stores/clinicStore';
import { CLINIC_PRESETS, type ClinicType, type ClinicPatient } from '@/lib/clinic/types';
import { evaluateAll, getDetailColumns, parseDate } from '@/lib/clinic/eligibility-engine';
import { generateCSV, downloadCSV } from '@/lib/clinic/csv-export';

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  if (dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
    return `${dateStr.slice(0, 2)}/${dateStr.slice(2, 4)}/${dateStr.slice(4, 8)}`;
  }
  if (dateStr.length === 10 && dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}

const PRESET_COLORS: Record<string, { card: string; active: string; badge: string }> = {
  blue: {
    card: 'border-blue-500/30 hover:border-blue-500/60',
    active: 'border-blue-500 bg-blue-500/10',
    badge: 'bg-blue-500/20 text-blue-400',
  },
  purple: {
    card: 'border-purple-500/30 hover:border-purple-500/60',
    active: 'border-purple-500 bg-purple-500/10',
    badge: 'bg-purple-500/20 text-purple-400',
  },
  amber: {
    card: 'border-amber-500/30 hover:border-amber-500/60',
    active: 'border-amber-500 bg-amber-500/10',
    badge: 'bg-amber-500/20 text-amber-400',
  },
  rose: {
    card: 'border-rose-500/30 hover:border-rose-500/60',
    active: 'border-rose-500 bg-rose-500/10',
    badge: 'bg-rose-500/20 text-rose-400',
  },
};

export default function ClinicModePage() {
  const router = useRouter();
  const { results, records, selectedClinic, setSelectedClinic } = useClinicStore();
  const [search, setSearch] = useState('');
  const [showEligibleOnly, setShowEligibleOnly] = useState(false);
  const [drawerPatient, setDrawerPatient] = useState<ClinicPatient | null>(null);

  // Compute all clinic evaluations for count badges
  const allEvaluations = useMemo(() => {
    const evals: Record<ClinicType, ClinicPatient[]> = {
      flu: evaluateAll(results, records, 'flu'),
      covid: evaluateAll(results, records, 'covid'),
      shingrix: evaluateAll(results, records, 'shingrix'),
      pneumococcal: evaluateAll(results, records, 'pneumococcal'),
    };
    return evals;
  }, [results, records]);

  // Current clinic patients
  const patients = useMemo(() => {
    if (!selectedClinic) return [];
    return allEvaluations[selectedClinic];
  }, [selectedClinic, allEvaluations]);

  // Filtered patients
  const filteredPatients = useMemo(() => {
    let list = patients;
    if (showEligibleOnly) {
      list = list.filter((p) => p.eligibility.eligible);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          (p.result.firstName || '').toLowerCase().includes(q) ||
          (p.result.lastName || '').toLowerCase().includes(q) ||
          (p.result.medicareCardNumber || '').includes(q),
      );
    }
    return list;
  }, [patients, showEligibleOnly, search]);

  const eligibleCount = patients.filter((p) => p.eligibility.eligible).length;
  const notEligibleCount = patients.length - eligibleCount;

  const handleExport = useCallback(() => {
    if (!selectedClinic || patients.length === 0) return;
    const csv = generateCSV(showEligibleOnly ? filteredPatients : patients, selectedClinic);
    const preset = CLINIC_PRESETS.find((p) => p.id === selectedClinic);
    const date = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `${preset?.label.replace(/\s+/g, '-') || selectedClinic}-${date}.csv`);
  }, [selectedClinic, patients, filteredPatients, showEligibleOnly]);

  // No data loaded — show empty state
  if (results.length === 0) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="text-2xl font-bold text-slate-100">Vaccine Clinic Mode</h1>
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-8 text-center">
          <p className="text-slate-400 mb-4">
            No patient data loaded. Run a Bulk History lookup first, then click &quot;Enter Clinic Mode&quot;.
          </p>
          <button
            onClick={() => router.push('/bulk-history')}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Go to Bulk History
          </button>
        </div>
      </div>
    );
  }

  const detailCols = selectedClinic ? getDetailColumns(selectedClinic) : [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Vaccine Clinic Mode</h1>
          <p className="text-sm text-slate-400 mt-1">
            {results.filter((r) => r.status === 'success').length} patients loaded from bulk history
          </p>
        </div>
        <div className="flex gap-2">
          {selectedClinic && (
            <button
              onClick={handleExport}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Export CSV
            </button>
          )}
          <button
            onClick={() => router.push('/bulk-history')}
            className="rounded-md border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
          >
            Back to History
          </button>
        </div>
      </div>

      {/* Clinic Preset Cards */}
      <div className="grid grid-cols-4 gap-4">
        {CLINIC_PRESETS.map((preset) => {
          const colors = PRESET_COLORS[preset.color];
          const isActive = selectedClinic === preset.id;
          const eligCount = allEvaluations[preset.id].filter((p) => p.eligibility.eligible).length;
          const totalCount = allEvaluations[preset.id].length;

          return (
            <button
              key={preset.id}
              onClick={() => {
                setSelectedClinic(isActive ? null : preset.id);
                setSearch('');
                setShowEligibleOnly(false);
                setDrawerPatient(null);
              }}
              data-testid={`clinic-card-${preset.id}`}
              className={`rounded-lg border bg-slate-800 p-4 text-left transition-all ${
                isActive ? colors.active : colors.card
              }`}
            >
              <h3 className="text-sm font-semibold text-slate-200">{preset.label}</h3>
              <p className="text-xs text-slate-400 mt-1">{preset.description}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors.badge}`}>
                  {eligCount} eligible
                </span>
                <span className="text-xs text-slate-500">{totalCount} total</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected clinic content */}
      {selectedClinic && (
        <>
          {/* Summary bar */}
          <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-4 py-3">
            <div className="flex items-center gap-4">
              <span className="text-sm text-emerald-400 font-medium">{eligibleCount} eligible</span>
              <span className="text-sm text-slate-400">|</span>
              <span className="text-sm text-slate-400">{notEligibleCount} not eligible</span>
              <label className="flex items-center gap-2 text-sm text-slate-400 ml-4">
                <input
                  type="checkbox"
                  checked={showEligibleOnly}
                  onChange={(e) => setShowEligibleOnly(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-700 text-emerald-600 focus:ring-emerald-500"
                />
                Eligible only
              </label>
            </div>
            <input
              type="text"
              placeholder="Search name or Medicare..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 rounded-md border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Results table */}
          <div className="rounded-lg border border-slate-700 bg-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-600 text-left text-slate-400 bg-slate-800/80">
                    <th className="px-3 py-2.5">Row</th>
                    <th className="px-3 py-2.5">Name</th>
                    <th className="px-3 py-2.5">DOB</th>
                    <th className="px-3 py-2.5">Age</th>
                    <th className="px-3 py-2.5">Medicare</th>
                    <th className="px-3 py-2.5">Eligible</th>
                    <th className="px-3 py-2.5">Reason</th>
                    {detailCols.map((col) => (
                      <th key={col} className="px-3 py-2.5">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((p) => (
                    <tr
                      key={p.result.rowNumber}
                      onClick={() => setDrawerPatient(drawerPatient?.result.rowNumber === p.result.rowNumber ? null : p)}
                      className={`border-b border-slate-700/50 cursor-pointer transition-colors hover:bg-slate-700/30 ${
                        drawerPatient?.result.rowNumber === p.result.rowNumber ? 'bg-slate-700/40' : ''
                      }`}
                    >
                      <td className="px-3 py-2 text-slate-400">{p.result.rowNumber}</td>
                      <td className="px-3 py-2 font-medium">
                        {p.result.firstName || ''} {p.result.lastName || ''}
                      </td>
                      <td className="px-3 py-2">{formatDate(p.result.dateOfBirth)}</td>
                      <td className="px-3 py-2">{p.age !== null ? p.age : ''}</td>
                      <td className="px-3 py-2 font-mono">{p.result.medicareCardNumber || ''}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                            p.eligibility.eligible
                              ? 'bg-emerald-600/20 text-emerald-400'
                              : 'bg-slate-600/40 text-slate-400'
                          }`}
                        >
                          {p.eligibility.eligible ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-400 max-w-[200px] truncate" title={p.eligibility.reason}>
                        {p.eligibility.reason}
                      </td>
                      {detailCols.map((col) => (
                        <td key={col} className="px-3 py-2">{p.eligibility.details[col] || ''}</td>
                      ))}
                    </tr>
                  ))}
                  {filteredPatients.length === 0 && (
                    <tr>
                      <td colSpan={7 + detailCols.length} className="px-3 py-8 text-center text-slate-500">
                        {search ? 'No patients match your search' : 'No patients to display'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Patient Detail Drawer */}
      {drawerPatient && (
        <div className="fixed inset-y-0 right-0 z-50 w-[480px] border-l border-slate-700 bg-slate-800 shadow-2xl overflow-y-auto">
          <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">
              {drawerPatient.result.firstName || ''} {drawerPatient.result.lastName || ''}
            </h2>
            <button
              onClick={() => setDrawerPatient(null)}
              data-testid="drawer-close"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Patient info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-400">Date of Birth</p>
                <p className="text-slate-200">{formatDate(drawerPatient.result.dateOfBirth)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Age</p>
                <p className="text-slate-200">{drawerPatient.age !== null ? drawerPatient.age : 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Medicare</p>
                <p className="text-slate-200 font-mono">{drawerPatient.result.medicareCardNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Row</p>
                <p className="text-slate-200">{drawerPatient.result.rowNumber}</p>
              </div>
            </div>

            {/* Eligibility detail */}
            <div className="rounded-lg border border-slate-700 p-4">
              <h3 className="text-sm font-semibold text-slate-200 mb-2">
                {CLINIC_PRESETS.find((p) => p.id === selectedClinic)?.label} Eligibility
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    drawerPatient.eligibility.eligible
                      ? 'bg-emerald-600/20 text-emerald-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {drawerPatient.eligibility.eligible ? 'Eligible' : 'Not Eligible'}
                </span>
                <span className="text-xs text-slate-400">{drawerPatient.eligibility.reason}</span>
              </div>
              {Object.keys(drawerPatient.eligibility.details).length > 0 && (
                <div className="space-y-1">
                  {Object.entries(drawerPatient.eligibility.details).map(([key, val]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-slate-400">{key}</span>
                      <span className="text-slate-200">{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Full vaccination history */}
            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-2">
                Full Vaccination History ({drawerPatient.result.immunisationHistory.length})
              </h3>
              {drawerPatient.result.immunisationHistory.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No immunisation history</p>
              ) : (
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                  {drawerPatient.result.immunisationHistory.map((h, i) => (
                    <div
                      key={i}
                      className="rounded border border-slate-700/50 bg-slate-700/20 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-slate-300">{h.vaccineCode}</span>
                        <span className="text-slate-400">{formatDate(h.dateOfService)}</span>
                      </div>
                      {h.vaccineDescription && (
                        <p className="text-slate-400 mt-0.5">{h.vaccineDescription}</p>
                      )}
                      <div className="flex gap-3 mt-0.5 text-slate-500">
                        {h.vaccineDose && <span>Dose: {h.vaccineDose}</span>}
                        {h.routeOfAdministration && <span>Route: {h.routeOfAdministration}</span>}
                        {h.status && (
                          <span className={h.status === 'Valid' ? 'text-emerald-500' : 'text-amber-500'}>
                            {h.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Due vaccines */}
            {drawerPatient.result.vaccineDueDetails.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-2">
                  Vaccines Due ({drawerPatient.result.vaccineDueDetails.length})
                </h3>
                <div className="space-y-1">
                  {drawerPatient.result.vaccineDueDetails.map((d, i) => (
                    <div key={i} className="flex justify-between text-xs rounded border border-slate-700/50 bg-slate-700/20 px-3 py-2">
                      <span className="text-slate-300">{d.antigenCode} (Dose {d.doseNumber})</span>
                      <span className="text-slate-400">Due: {formatDate(d.dueDate)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay for drawer */}
      {drawerPatient && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setDrawerPatient(null)}
        />
      )}
    </div>
  );
}
