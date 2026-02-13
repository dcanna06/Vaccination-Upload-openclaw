'use client';

import { useState, useMemo } from 'react';
import { Pill } from '@/components/portals/Pill';
import { StatTile } from '@/components/portals/StatTile';
import { FacilitySelector } from '@/components/portals/FacilitySelector';
import { AlertTriangle, Clock, Syringe, ArrowUpDown, Download } from 'lucide-react';
import {
  FACILITIES,
  RESIDENTS,
  getAge,
} from '@/lib/mock/portal-data';
import { VACCINE_NAMES } from '@/types/portals';

const ACCENT = '#7c3aed';
const VACCINE_CODES = ['flu', 'covid', 'shingrix', 'pneumo', 'dtpa'] as const;

function getEarliestDueDate(
  resident: { eligibility: Record<string, { isDue: boolean; isOverdue: boolean; dueDate?: string }> },
  vaccines: string[],
): string {
  let earliest = '9999-12-31';
  for (const v of vaccines) {
    const e = resident.eligibility[v];
    if (e && (e.isDue || e.isOverdue) && e.dueDate && e.dueDate < earliest) {
      earliest = e.dueDate;
    }
  }
  return earliest;
}

export default function NMEligibilityPage() {
  const [facilityFilter, setFacilityFilter] = useState('all');
  const [selectedVaccines, setSelectedVaccines] = useState<string[]>([...VACCINE_CODES]);
  const [sortAsc, setSortAsc] = useState(true);

  const allActiveResidents = RESIDENTS.filter(r => r.status === 'active');

  const baseResidents = useMemo(() => {
    if (facilityFilter === 'all') return allActiveResidents;
    return allActiveResidents.filter(r => r.facilityId === Number(facilityFilter));
  }, [facilityFilter, allActiveResidents]);

  const toggleVaccine = (code: string) => {
    setSelectedVaccines(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code],
    );
  };

  const toggleAll = () => {
    setSelectedVaccines(prev =>
      prev.length === VACCINE_CODES.length ? [] : [...VACCINE_CODES],
    );
  };

  const eligibleResidents = useMemo(() => {
    return baseResidents
      .filter(r =>
        selectedVaccines.some(v => {
          const e = r.eligibility[v];
          return e && (e.isDue || e.isOverdue);
        }),
      )
      .sort((a, b) => {
        const dateA = getEarliestDueDate(a, selectedVaccines);
        const dateB = getEarliestDueDate(b, selectedVaccines);
        return sortAsc ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
      });
  }, [baseResidents, selectedVaccines, sortAsc]);

  const overdueCount = eligibleResidents.filter(r =>
    selectedVaccines.some(v => r.eligibility[v]?.isOverdue),
  ).length;

  const comingDueCount = eligibleResidents.filter(r =>
    selectedVaccines.some(v => {
      const e = r.eligibility[v];
      if (!e || !e.isDue || e.isOverdue) return false;
      const due = new Date(e.dueDate ?? '');
      const in60 = new Date();
      in60.setDate(in60.getDate() + 60);
      return due <= in60;
    }),
  ).length;

  const getFacilityLabel = (facilityId: number) => {
    const fac = FACILITIES.find(f => f.id === facilityId);
    return fac ? fac.name.split(' ')[0] : 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Eligibility Dashboard</h1>
        <button className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      {/* Facility Selector */}
      <div className="flex items-center gap-4">
        <FacilitySelector
          value={facilityFilter}
          onChange={setFacilityFilter}
          facilities={FACILITIES}
          label="Facility:"
        />
      </div>

      {/* Vaccine Filters */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={selectedVaccines.length === VACCINE_CODES.length}
            onChange={toggleAll}
            className="rounded border-gray-300"
          />
          All
        </label>
        <div className="h-5 w-px bg-gray-300" />
        {VACCINE_CODES.map(code => (
          <label key={code} className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={selectedVaccines.includes(code)}
              onChange={() => toggleVaccine(code)}
              className="rounded border-gray-300"
            />
            {VACCINE_NAMES[code]}
          </label>
        ))}
        <div className="ml-auto">
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <ArrowUpDown className="h-4 w-4" /> Due Date ({sortAsc ? 'Earliest' : 'Latest'})
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatTile
          label="Overdue"
          value={overdueCount}
          icon={AlertTriangle}
          color="#b91c1c"
          bgColor="#fef2f2"
          subtitle="Need attention now"
        />
        <StatTile
          label="Coming Due"
          value={comingDueCount}
          icon={Clock}
          color="#c2410c"
          bgColor="#fff7ed"
          subtitle="In the next 60 days"
        />
        <StatTile
          label="Total Eligible"
          value={eligibleResidents.length}
          icon={Syringe}
          color="#7c3aed"
          bgColor="#f5f3ff"
          subtitle={`Across ${selectedVaccines.length} vaccines`}
        />
      </div>

      {/* Results Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
              <th className="px-4 py-3">Resident</th>
              <th className="px-4 py-3">Facility</th>
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Age</th>
              {selectedVaccines.map(v => (
                <th key={v} className="px-4 py-3 text-center">
                  {VACCINE_NAMES[v]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {eligibleResidents.map((r, idx) => (
              <tr
                key={r.id}
                className={`border-b last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">
                    {r.firstName} {r.lastName}
                  </p>
                  {r.wing && (
                    <p className="text-xs text-gray-400">{r.wing}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Pill color="purple">{getFacilityLabel(r.facilityId)}</Pill>
                </td>
                <td className="px-4 py-3 text-gray-700">{r.room}</td>
                <td className="px-4 py-3 text-gray-700">
                  {getAge(r.dateOfBirth)}
                </td>
                {selectedVaccines.map(v => {
                  const e = r.eligibility[v];
                  if (!e)
                    return (
                      <td key={v} className="px-4 py-3 text-center text-gray-400">
                        ---
                      </td>
                    );
                  if (e.isOverdue) {
                    return (
                      <td key={v} className="px-4 py-3 text-center">
                        <Pill color="red">Overdue</Pill>
                      </td>
                    );
                  }
                  if (e.isDue) {
                    return (
                      <td key={v} className="px-4 py-3 text-center">
                        <Pill color="orange">
                          {e.dueDate
                            ? new Date(e.dueDate).toLocaleDateString('en-AU', {
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'Due'}
                        </Pill>
                      </td>
                    );
                  }
                  return (
                    <td key={v} className="px-4 py-3 text-center">
                      <Pill color="green">Done</Pill>
                    </td>
                  );
                })}
              </tr>
            ))}
            {eligibleResidents.length === 0 && (
              <tr>
                <td
                  colSpan={4 + selectedVaccines.length}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No residents match the selected criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
