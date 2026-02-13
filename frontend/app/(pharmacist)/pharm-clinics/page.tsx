'use client';

import React, { useState, useMemo } from 'react';
import { Pill } from '@/components/portals/Pill';
import { FacilitySelector } from '@/components/portals/FacilitySelector';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Printer,
  Package,
} from 'lucide-react';
import { CLINICS, FACILITIES } from '@/lib/mock/portal-data';
import type { Clinic, ClinicResident } from '@/types/portals';

type StatusFilter = 'upcoming' | 'done' | 'all';

export default function PharmClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>(CLINICS);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [facilityFilter, setFacilityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('upcoming');
  const [stockNotes, setStockNotes] = useState<Record<number, string>>({});

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900">My Clinics</h1>

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
                statusFilter === f.key ? 'text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
              style={statusFilter === f.key ? { background: '#3B6CE7' } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-gray-500">
          {filtered.length} clinic{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Clinic cards */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white py-12 text-center text-sm text-gray-400">
            No clinics match the current filters.
          </div>
        )}
        {filtered.map(clinic => {
          const d = new Date(clinic.clinicDate);
          const day = d.getDate();
          const month = d.toLocaleDateString('en-AU', { month: 'short' });
          const facility = FACILITIES.find(f => f.id === clinic.facilityId);
          const summary = getConsentSummary(clinic.residents);
          const isExpanded = expandedId === clinic.id;

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
                {/* Date badge */}
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-blue-50">
                  <span
                    className="text-lg font-bold"
                    style={{ color: '#3B6CE7' }}
                  >
                    {day}
                  </span>
                  <span className="text-[10px] font-medium uppercase text-gray-500">
                    {month}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{clinic.name}</p>
                    {facility && <Pill color="blue">{facility.name}</Pill>}
                  </div>
                  <p className="text-sm text-gray-500">
                    {clinic.timeRange} &middot; {clinic.location} &middot;{' '}
                    {clinic.pharmacistName}
                  </p>
                </div>

                {/* Vaccines */}
                <div className="flex items-center gap-2">
                  {clinic.vaccines.map(v => (
                    <Pill key={v} color="purple">
                      {v}
                    </Pill>
                  ))}
                </div>

                {/* Stock badge */}
                <Pill color="green">
                  <Package className="inline h-3 w-3 mr-1" />
                  Stock Allocated
                </Pill>

                {/* Consent summary */}
                <div className="flex items-center gap-2 text-xs">
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

                {/* Chevron */}
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>

              {/* Expanded section */}
              {isExpanded && (
                <div className="border-t border-gray-200 p-5 space-y-5">
                  {/* Consent table */}
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
                            <React.Fragment key={v}>
                              <th className="px-2 py-1 text-center">Eligible</th>
                              <th className="px-2 py-1 text-center">Consent</th>
                            </React.Fragment>
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
                            <td className="px-4 py-3 text-gray-500">{r.room}</td>
                            {clinic.vaccines.map(v => {
                              const eligible = r.eligibility[v] ?? false;
                              const consent = r.consent[v];
                              return (
                                <React.Fragment key={v}>
                                  <td className="px-2 py-3 text-center">
                                    <Pill color={eligible ? 'green' : 'gray'}>
                                      {eligible ? 'Yes' : 'No'}
                                    </Pill>
                                  </td>
                                  <td className="px-2 py-3 text-center">
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
                                        —
                                      </span>
                                    )}
                                  </td>
                                </React.Fragment>
                              );
                            })}
                          </tr>
                        ))}
                        {clinic.residents.length === 0 && (
                          <tr>
                            <td
                              colSpan={2 + clinic.vaccines.length * 2}
                              className="px-4 py-8 text-center text-gray-400"
                            >
                              No residents assigned to this clinic yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Stock notes */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Stock Notes
                    </label>
                    <textarea
                      value={stockNotes[clinic.id] ?? ''}
                      onChange={e =>
                        setStockNotes(prev => ({
                          ...prev,
                          [clinic.id]: e.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="Add notes about stock allocation, quantities, batch numbers..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <button
                      className="mt-2 rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Update Notes
                    </button>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                    <button className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                      <Printer className="h-4 w-4" />
                      Print Run Sheet
                    </button>
                    <button
                      disabled={
                        !allConsentsRecorded(clinic.residents) ||
                        clinic.residents.length === 0
                      }
                      className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition-opacity"
                      style={{ background: '#3B6CE7' }}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Finalise Clinic
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
