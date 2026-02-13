'use client';

import { useState, useMemo } from 'react';
import { Pill } from '@/components/portals/Pill';
import { FacilitySelector } from '@/components/portals/FacilitySelector';
import { ResidentAddSingle } from '@/components/portals/ResidentAddSingle';
import { ResidentAddBulk } from '@/components/portals/ResidentAddBulk';
import { ResidentUploadExcel } from '@/components/portals/ResidentUploadExcel';
import {
  Search,
  UserPlus,
  Users,
  Upload,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  FACILITIES,
  RESIDENTS,
  getAge,
  countDueVaccines,
} from '@/lib/mock/portal-data';
import { VACCINE_NAMES } from '@/types/portals';
import type { Resident, NewResident } from '@/types/portals';

const ACCENT = '#7c3aed';

type AddMode = 'single' | 'bulk' | 'upload' | null;
type FilterStatus = 'active' | 'inactive' | 'all';

export default function NMResidentsPage() {
  const [residents, setResidents] = useState<Resident[]>(RESIDENTS);
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active');
  const [facilityFilter, setFacilityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const activeCount = residents.filter(r => r.status === 'active').length;
  const inactiveCount = residents.filter(r => r.status === 'inactive').length;

  const filtered = useMemo(() => {
    let list = residents;
    if (facilityFilter !== 'all') {
      list = list.filter(r => r.facilityId === Number(facilityFilter));
    }
    if (filterStatus !== 'all') {
      list = list.filter(r => r.status === filterStatus);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        r =>
          r.firstName.toLowerCase().includes(q) ||
          r.lastName.toLowerCase().includes(q) ||
          r.room.toLowerCase().includes(q),
      );
    }
    return list.sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [residents, facilityFilter, filterStatus, searchQuery]);

  const getFacilityLabel = (facilityId: number) => {
    const fac = FACILITIES.find(f => f.id === facilityId);
    return fac ? fac.name.split(' ')[0] : 'Unknown';
  };

  const handleAddSingle = (data: NewResident) => {
    const newR: Resident = {
      id: Math.max(...residents.map(r => r.id), 0) + 1,
      facilityId: data.facilityId,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth ?? '1940-01-01',
      gender: (data.gender as Resident['gender']) || 'F',
      medicareNumber: data.medicareNumber ?? '',
      room: data.room ?? '',
      wing: '',
      gpName: data.gpName ?? '',
      allergies: data.allergies ?? [],
      status: 'active',
      eligibility: {
        flu: { isDue: false, isOverdue: false },
        covid: { isDue: false, isOverdue: false },
        shingrix: { isDue: false, isOverdue: false },
        pneumo: { isDue: false, isOverdue: false },
        dtpa: { isDue: false, isOverdue: false },
      },
    };
    setResidents(prev => [...prev, newR]);
    setAddMode(null);
  };

  const handleAddBulk = (newResidents: NewResident[]) => {
    const maxId = Math.max(...residents.map(r => r.id), 0);
    const created = newResidents.map((d, i) => ({
      id: maxId + i + 1,
      facilityId: d.facilityId,
      firstName: d.firstName,
      lastName: d.lastName,
      dateOfBirth: d.dateOfBirth ?? '1940-01-01',
      gender: (d.gender as Resident['gender']) || 'F',
      medicareNumber: d.medicareNumber ?? '',
      room: d.room ?? '',
      wing: '',
      gpName: d.gpName ?? '',
      allergies: d.allergies ?? [],
      status: 'active' as const,
      eligibility: {
        flu: { isDue: false, isOverdue: false },
        covid: { isDue: false, isOverdue: false },
        shingrix: { isDue: false, isOverdue: false },
        pneumo: { isDue: false, isOverdue: false },
        dtpa: { isDue: false, isOverdue: false },
      },
    }));
    setResidents(prev => [...prev, ...created]);
    setAddMode(null);
  };

  const toggleStatus = (id: number) => {
    setResidents(prev =>
      prev.map(r =>
        r.id === id
          ? { ...r, status: r.status === 'active' ? ('inactive' as const) : ('active' as const) }
          : r,
      ),
    );
  };

  const statusFilters: { key: FilterStatus; label: string; count: number }[] = [
    { key: 'active', label: 'Active', count: activeCount },
    { key: 'inactive', label: 'Inactive', count: inactiveCount },
    { key: 'all', label: 'All', count: residents.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Residents</h1>
        <div className="flex gap-2">
          {(
            [
              ['single', 'Add Resident', UserPlus],
              ['bulk', 'Add Multiple', Users],
              ['upload', 'Upload Excel', Upload],
            ] as const
          ).map(([mode, label, Icon]) => (
            <button
              key={mode}
              onClick={() => setAddMode(addMode === mode ? null : mode)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                addMode === mode
                  ? 'text-white'
                  : 'border text-gray-700 hover:bg-gray-50'
              }`}
              style={
                addMode === mode
                  ? { background: ACCENT, borderColor: ACCENT }
                  : { borderColor: '#d1d5db' }
              }
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Add Forms */}
      {addMode === 'single' && (
        <ResidentAddSingle
          facilities={FACILITIES}
          accentColor={ACCENT}
          onAdd={handleAddSingle}
          onCancel={() => setAddMode(null)}
        />
      )}
      {addMode === 'bulk' && (
        <ResidentAddBulk
          facilities={FACILITIES}
          accentColor={ACCENT}
          onAdd={handleAddBulk}
          onCancel={() => setAddMode(null)}
        />
      )}
      {addMode === 'upload' && (
        <ResidentUploadExcel
          facilities={FACILITIES}
          accentColor={ACCENT}
          onUpload={() => setAddMode(null)}
          onCancel={() => setAddMode(null)}
        />
      )}

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
              onClick={() => setFilterStatus(f.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                filterStatus === f.key
                  ? 'text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              style={filterStatus === f.key ? { background: ACCENT } : {}}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or room..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm"
          />
        </div>
        <span className="text-sm text-gray-500">{filtered.length} residents</span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
              <th className="px-4 py-3">Resident</th>
              <th className="px-4 py-3">Facility</th>
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">Medicare</th>
              <th className="px-4 py-3">Allergies</th>
              <th className="px-4 py-3">Vaccines Due</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, idx) => {
              const vaccineCounts = countDueVaccines(r);
              const isExpanded = expandedId === r.id;

              return (
                <>
                  <tr
                    key={r.id}
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    className={`cursor-pointer border-b transition-colors ${
                      isExpanded
                        ? 'bg-violet-50/50'
                        : idx % 2 === 0
                          ? 'bg-white'
                          : 'bg-gray-50/50'
                    } ${r.status === 'inactive' ? 'opacity-50' : ''}`}
                  >
                    {/* Resident Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            {r.firstName} {r.lastName}
                          </p>
                          {r.wing && (
                            <p className="text-xs text-gray-400">
                              {r.wing} Wing
                            </p>
                          )}
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </td>

                    {/* Facility */}
                    <td className="px-4 py-3">
                      <Pill color="purple">
                        {getFacilityLabel(r.facilityId)}
                      </Pill>
                    </td>

                    {/* Room */}
                    <td className="px-4 py-3 text-gray-700">{r.room}</td>

                    {/* Age */}
                    <td className="px-4 py-3 text-gray-700">
                      {r.dateOfBirth ? getAge(r.dateOfBirth) : '--'}
                    </td>

                    {/* Medicare */}
                    <td className="px-4 py-3 text-gray-700">
                      {r.medicareNumber || '--'}
                    </td>

                    {/* Allergies */}
                    <td className="px-4 py-3">
                      {r.allergies.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {r.allergies.map(allergy => (
                            <Pill key={allergy} color="red">
                              {allergy}
                            </Pill>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </td>

                    {/* Vaccines Due */}
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {vaccineCounts.due > 0 && (
                          <Pill color="orange">{vaccineCounts.due} due</Pill>
                        )}
                        {vaccineCounts.overdue > 0 && (
                          <Pill color="red">
                            {vaccineCounts.overdue} overdue
                          </Pill>
                        )}
                        {vaccineCounts.due === 0 &&
                          vaccineCounts.overdue === 0 && (
                            <span className="text-xs text-gray-400">
                              Up to date
                            </span>
                          )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <Pill
                        color={
                          r.status === 'active' ? 'green' : 'gray'
                        }
                      >
                        {r.status === 'active' ? 'Active' : 'Inactive'}
                      </Pill>
                    </td>

                    {/* Actions */}
                    <td
                      className="px-4 py-3"
                      onClick={e => e.stopPropagation()}
                    >
                      {r.status === 'active' ? (
                        <button
                          onClick={() => toggleStatus(r.id)}
                          className="text-xs text-gray-500 hover:text-red-600"
                        >
                          Mark Inactive
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleStatus(r.id)}
                          className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Expanded Detail Row */}
                  {isExpanded && (
                    <tr key={`${r.id}-detail`} className="border-b bg-violet-50/30">
                      <td colSpan={9} className="px-4 py-4">
                        <div className="grid grid-cols-5 gap-3">
                          {Object.entries(r.eligibility).map(
                            ([code, elig]) => {
                              const name = VACCINE_NAMES[code] ?? code;
                              return (
                                <div
                                  key={code}
                                  className="rounded-xl border border-gray-200 bg-white p-4"
                                >
                                  <div className="mb-2 text-sm font-semibold text-gray-900">
                                    {name}
                                  </div>
                                  {elig.isOverdue ? (
                                    <div>
                                      <Pill color="red">Overdue</Pill>
                                      {elig.dueDate && (
                                        <p className="mt-1 text-xs text-gray-500">
                                          Due:{' '}
                                          {new Date(
                                            elig.dueDate,
                                          ).toLocaleDateString('en-AU', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                          })}
                                        </p>
                                      )}
                                    </div>
                                  ) : elig.isDue ? (
                                    <div>
                                      <Pill color="orange">Due</Pill>
                                      {elig.dueDate && (
                                        <p className="mt-1 text-xs text-gray-500">
                                          Due:{' '}
                                          {new Date(
                                            elig.dueDate,
                                          ).toLocaleDateString('en-AU', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                          })}
                                        </p>
                                      )}
                                      {elig.doseNumber && (
                                        <p className="text-xs text-gray-400">
                                          Dose {elig.doseNumber}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <Pill color="green">Up to date</Pill>
                                  )}
                                </div>
                              );
                            },
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No residents match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
