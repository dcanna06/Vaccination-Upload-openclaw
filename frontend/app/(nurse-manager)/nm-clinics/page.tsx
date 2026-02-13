'use client';

import { useState, useMemo } from 'react';
import { Pill } from '@/components/portals/Pill';
import { FacilitySelector } from '@/components/portals/FacilitySelector';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Plus,
  UserPlus,
  CheckCircle,
} from 'lucide-react';
import {
  FACILITIES,
  CLINICS,
  RESIDENTS,
  getFacilityResidents,
} from '@/lib/mock/portal-data';
import type { Clinic, ClinicResident } from '@/types/portals';

const ACCENT = '#7c3aed';
const VACCINE_OPTIONS = ['Influenza', 'COVID-19', 'Shingrix', 'Pneumococcal', 'dTpa Booster'];

type StatusFilter = 'upcoming' | 'done' | 'all';

export default function NMClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>(CLINICS);
  const [facilityFilter, setFacilityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('upcoming');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [newClinic, setNewClinic] = useState({
    name: '',
    vaccines: [] as string[],
    location: '',
    date: '',
    timeRange: '',
  });

  const filtered = useMemo(() => {
    let list = clinics;
    if (facilityFilter !== 'all') {
      list = list.filter(c => c.facilityId === Number(facilityFilter));
    }
    if (statusFilter !== 'all') {
      list = list.filter(c => c.status === statusFilter);
    }
    return list.sort((a, b) => a.clinicDate.localeCompare(b.clinicDate));
  }, [clinics, facilityFilter, statusFilter]);

  const toggleExpand = (id: number) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const updateConsent = (
    clinicId: number,
    residentId: number,
    vaccine: string,
    value: boolean,
  ) => {
    setClinics(prev =>
      prev.map(c => {
        if (c.id !== clinicId) return c;
        return {
          ...c,
          residents: c.residents.map(r => {
            if (r.residentId !== residentId) return r;
            return { ...r, consent: { ...r.consent, [vaccine]: value } };
          }),
        };
      }),
    );
  };

  const getConsentSummary = (residents: ClinicResident[]) => {
    let yes = 0,
      no = 0,
      pending = 0;
    for (const r of residents) {
      for (const v of Object.values(r.consent)) {
        if (v === true) yes++;
        else if (v === false) no++;
        else pending++;
      }
    }
    return { yes, no, pending };
  };

  const allConsentsRecorded = (residents: ClinicResident[]) => {
    return residents.every(r =>
      Object.values(r.consent).every(v => v !== null),
    );
  };

  const statusFilters: { key: StatusFilter; label: string }[] = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'done', label: 'Done' },
    { key: 'all', label: 'All' },
  ];

  const handleCreateClinic = () => {
    if (!selectedFacilityId || !newClinic.name) return;
    const facility = FACILITIES.find(f => f.id === Number(selectedFacilityId));
    const newId = Math.max(...clinics.map(c => c.id), 0) + 1;
    const created: Clinic = {
      id: newId,
      facilityId: Number(selectedFacilityId),
      name: newClinic.name,
      clinicDate: newClinic.date,
      timeRange: newClinic.timeRange,
      location: newClinic.location,
      pharmacistName: facility?.pharmacistName ?? '',
      vaccines: newClinic.vaccines,
      status: 'upcoming',
      residents: [],
    };
    setClinics(prev => [...prev, created]);
    setShowCreate(false);
    setCreateStep(0);
    setSelectedFacilityId('');
    setNewClinic({ name: '', vaccines: [], location: '', date: '', timeRange: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clinics</h1>
        <button
          onClick={() => {
            setShowCreate(!showCreate);
            setCreateStep(0);
            setSelectedFacilityId('');
          }}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ background: ACCENT }}
        >
          <Plus className="h-4 w-4" /> Book New Clinic
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <FacilitySelector
          value={facilityFilter}
          onChange={setFacilityFilter}
          facilities={FACILITIES}
          label="Facility:"
        />
        <div className="flex rounded-lg border border-gray-200 bg-white">
          {statusFilters.map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === f.key
                  ? 'text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              style={statusFilter === f.key ? { background: ACCENT } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-gray-500">{filtered.length} clinics</span>
      </div>

      {/* Create Clinic Flow */}
      {showCreate && (
        <div
          className="rounded-2xl border-2 bg-white p-6"
          style={{ borderColor: ACCENT }}
        >
          {/* Step 0: Select Facility */}
          {createStep === 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Step 0: Select Facility
              </h3>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Which facility is this clinic for?
                </label>
                <select
                  value={selectedFacilityId}
                  onChange={e => setSelectedFacilityId(e.target.value)}
                  className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select a facility...</option>
                  {FACILITIES.filter(f => f.status === 'active').map(f => (
                    <option key={f.id} value={String(f.id)}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setCreateStep(1)}
                  disabled={!selectedFacilityId}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: ACCENT }}
                >
                  Next: Clinic Details
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Clinic Details */}
          {createStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Step 1: Clinic Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Clinic Name
                  </label>
                  <input
                    type="text"
                    value={newClinic.name}
                    onChange={e =>
                      setNewClinic(p => ({ ...p, name: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="e.g. Autumn Flu Clinic"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Location at Facility
                  </label>
                  <input
                    type="text"
                    value={newClinic.location}
                    onChange={e =>
                      setNewClinic(p => ({ ...p, location: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="e.g. Main Dining Hall"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Vaccine Types
                </label>
                <div className="flex flex-wrap gap-3">
                  {VACCINE_OPTIONS.map(v => (
                    <label key={v} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={newClinic.vaccines.includes(v)}
                        onChange={e => {
                          setNewClinic(p => ({
                            ...p,
                            vaccines: e.target.checked
                              ? [...p.vaccines, v]
                              : p.vaccines.filter(x => x !== v),
                          }));
                        }}
                        className="rounded border-gray-300"
                      />
                      {v}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setCreateStep(0)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
                >
                  Back
                </button>
                <button
                  onClick={() => setCreateStep(2)}
                  disabled={!newClinic.name || newClinic.vaccines.length === 0}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: ACCENT }}
                >
                  Next: Pick Date
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Date & Time */}
          {createStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Step 2: Pick Date & Time
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newClinic.date}
                    onChange={e =>
                      setNewClinic(p => ({ ...p, date: e.target.value }))
                    }
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Time Range
                  </label>
                  <select
                    value={newClinic.timeRange}
                    onChange={e =>
                      setNewClinic(p => ({ ...p, timeRange: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Select time...</option>
                    <option value="9:00 AM - 11:00 AM">9:00 AM - 11:00 AM</option>
                    <option value="10:00 AM - 12:00 PM">10:00 AM - 12:00 PM</option>
                    <option value="1:00 PM - 3:00 PM">1:00 PM - 3:00 PM</option>
                    <option value="2:00 PM - 4:00 PM">2:00 PM - 4:00 PM</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setCreateStep(1)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
                >
                  Back
                </button>
                <button
                  onClick={() => setCreateStep(3)}
                  disabled={!newClinic.date || !newClinic.timeRange}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: ACCENT }}
                >
                  Next: Assign Residents
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Assign Residents */}
          {createStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Step 3: Assign Residents
              </h3>
              <p className="text-sm text-gray-500">
                Select residents eligible for{' '}
                {newClinic.vaccines.join(', ')}.
              </p>
              <div className="rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
                      <th className="px-4 py-3">Select</th>
                      <th className="px-4 py-3">Resident</th>
                      <th className="px-4 py-3">Room</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFacilityResidents(Number(selectedFacilityId))
                      .filter(r => r.status === 'active')
                      .map(r => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300"
                            />
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {r.firstName} {r.lastName}
                          </td>
                          <td className="px-4 py-3 text-gray-500">{r.room}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setCreateStep(2)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateClinic}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                  style={{ background: ACCENT }}
                >
                  Create Clinic
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Clinic List */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No clinics match the selected filters.</div>
        )}
        {filtered.map(clinic => {
          const d = new Date(clinic.clinicDate);
          const day = d.getDate();
          const month = d.toLocaleDateString('en-AU', { month: 'short' });
          const summary = getConsentSummary(clinic.residents);
          const isExpanded = expandedId === clinic.id;
          const facility = FACILITIES.find(f => f.id === clinic.facilityId);

          return (
            <div
              key={clinic.id}
              className="rounded-2xl border border-gray-200 bg-white"
            >
              {/* Collapsed row */}
              <button
                onClick={() => toggleExpand(clinic.id)}
                className="flex w-full items-center gap-4 p-5 text-left"
              >
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-violet-50">
                  <span
                    className="text-lg font-bold"
                    style={{ color: ACCENT }}
                  >
                    {day}
                  </span>
                  <span className="text-[10px] font-medium uppercase text-gray-500">
                    {month}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{clinic.name}</p>
                  <p className="text-sm text-gray-500">
                    {clinic.timeRange} &middot; {clinic.location} &middot;{' '}
                    {clinic.pharmacistName}
                  </p>
                </div>
                {facility && (
                  <Pill color="purple">{facility.name.split(' ')[0]}</Pill>
                )}
                <div className="flex items-center gap-2">
                  {clinic.vaccines.map(v => (
                    <Pill key={v} color="blue">
                      {v}
                    </Pill>
                  ))}
                </div>
                {clinic.residents.length > 0 && (
                  <div className="flex items-center gap-3 text-xs">
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                      {summary.yes} Yes
                    </span>
                    <span className="rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-700">
                      {summary.no} No
                    </span>
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 font-semibold text-orange-700">
                      {summary.pending} Pending
                    </span>
                  </div>
                )}
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>

              {/* Expanded consent table */}
              {isExpanded && (
                <div className="border-t border-gray-200 p-5">
                  {clinic.residents.length === 0 ? (
                    <p className="text-sm text-gray-400">No residents assigned to this clinic yet.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
                            <th className="px-4 py-3">Resident</th>
                            <th className="px-4 py-3">Room</th>
                            {clinic.vaccines.map(v => (
                              <th
                                key={v}
                                className="px-4 py-3 text-center"
                                colSpan={2}
                              >
                                {v}
                              </th>
                            ))}
                          </tr>
                          <tr className="border-b bg-gray-50 text-xs text-gray-400">
                            <th></th>
                            <th></th>
                            {clinic.vaccines.map(v => (
                              <>
                                <th
                                  key={`${v}-e`}
                                  className="px-2 py-1 text-center"
                                >
                                  Eligible
                                </th>
                                <th
                                  key={`${v}-c`}
                                  className="px-2 py-1 text-center"
                                >
                                  Consent
                                </th>
                              </>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {clinic.residents.map(r => (
                            <tr
                              key={r.residentId}
                              className="border-b last:border-0"
                            >
                              <td className="px-4 py-3 font-medium text-gray-900">
                                {r.firstName} {r.lastName}
                              </td>
                              <td className="px-4 py-3 text-gray-500">
                                {r.room}
                              </td>
                              {clinic.vaccines.map(v => {
                                const eligible = r.eligibility[v] ?? false;
                                const consent = r.consent[v];
                                return (
                                  <>
                                    <td
                                      key={`${r.residentId}-${v}-e`}
                                      className="px-2 py-3 text-center"
                                    >
                                      <Pill color={eligible ? 'green' : 'gray'}>
                                        {eligible ? 'Yes' : 'No'}
                                      </Pill>
                                    </td>
                                    <td
                                      key={`${r.residentId}-${v}-c`}
                                      className="px-2 py-3 text-center"
                                    >
                                      {eligible ? (
                                        <div className="inline-flex gap-1">
                                          <button
                                            onClick={() =>
                                              updateConsent(
                                                clinic.id,
                                                r.residentId,
                                                v,
                                                true,
                                              )
                                            }
                                            className={`rounded px-2 py-0.5 text-xs font-medium ${
                                              consent === true
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-gray-100 text-gray-500 hover:bg-emerald-50'
                                            }`}
                                          >
                                            Yes
                                          </button>
                                          <button
                                            onClick={() =>
                                              updateConsent(
                                                clinic.id,
                                                r.residentId,
                                                v,
                                                false,
                                              )
                                            }
                                            className={`rounded px-2 py-0.5 text-xs font-medium ${
                                              consent === false
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-gray-100 text-gray-500 hover:bg-red-50'
                                            }`}
                                          >
                                            No
                                          </button>
                                        </div>
                                      ) : (
                                        <span className="text-xs text-gray-400">
                                          ---
                                        </span>
                                      )}
                                    </td>
                                  </>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <button className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                      <UserPlus className="h-4 w-4" /> Add Residents
                    </button>
                    <button
                      disabled={
                        !allConsentsRecorded(clinic.residents) ||
                        clinic.residents.length === 0
                      }
                      className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      style={{ background: ACCENT }}
                    >
                      <CheckCircle className="h-4 w-4" /> Finalise Clinic
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
