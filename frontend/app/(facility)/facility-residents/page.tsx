'use client';

import { useState, useMemo } from 'react';
import { Pill } from '@/components/portals/Pill';
import { ResidentAddSingle } from '@/components/portals/ResidentAddSingle';
import { ResidentAddBulk } from '@/components/portals/ResidentAddBulk';
import { ResidentUploadExcel } from '@/components/portals/ResidentUploadExcel';
import { Search, UserPlus, Users, Upload } from 'lucide-react';
import { RESIDENTS, getFacilityResidents, getAge, countDueVaccines } from '@/lib/mock/portal-data';
import { VACCINE_NAMES } from '@/types/portals';
import type { Resident, NewResident } from '@/types/portals';

const FACILITY_ID = 2;
const ACCENT = '#3B6CE7';

type AddMode = 'single' | 'bulk' | 'upload' | null;
type FilterStatus = 'active' | 'inactive' | 'all';

export default function FacilityResidentsPage() {
  const [residents, setResidents] = useState<Resident[]>(getFacilityResidents(FACILITY_ID));
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<number | null>(null);

  const activeCount = residents.filter(r => r.status === 'active').length;
  const inactiveCount = residents.filter(r => r.status === 'inactive').length;

  const filtered = useMemo(() => {
    let list = residents;
    if (filterStatus !== 'all') list = list.filter(r => r.status === filterStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        r.firstName.toLowerCase().includes(q) ||
        r.lastName.toLowerCase().includes(q) ||
        r.room.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [residents, filterStatus, searchQuery]);

  const selectedResident = residents.find(r => r.id === selectedId) ?? null;

  const handleAddSingle = (data: NewResident) => {
    const newR: Resident = {
      id: Math.max(...residents.map(r => r.id)) + 1,
      facilityId: FACILITY_ID,
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
      eligibility: { flu: { isDue: false, isOverdue: false }, covid: { isDue: false, isOverdue: false }, shingrix: { isDue: false, isOverdue: false }, pneumo: { isDue: false, isOverdue: false }, dtpa: { isDue: false, isOverdue: false } },
    };
    setResidents(prev => [...prev, newR]);
    setAddMode(null);
  };

  const toggleStatus = (id: number) => {
    setResidents(prev => prev.map(r => r.id === id ? { ...r, status: r.status === 'active' ? 'inactive' : 'active' } : r));
    setConfirmDeactivateId(null);
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
          {([['single', 'Add Resident', UserPlus], ['bulk', 'Add Multiple', Users], ['upload', 'Upload Excel', Upload]] as const).map(([mode, label, Icon]) => (
            <button
              key={mode}
              onClick={() => setAddMode(addMode === mode ? null : mode)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                addMode === mode
                  ? 'text-white'
                  : 'border text-gray-700 hover:bg-gray-50'
              }`}
              style={addMode === mode ? { background: ACCENT, borderColor: ACCENT } : { borderColor: '#d1d5db' }}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Add Forms */}
      {addMode === 'single' && (
        <ResidentAddSingle
          accentColor={ACCENT}
          onAdd={handleAddSingle}
          onCancel={() => setAddMode(null)}
        />
      )}
      {addMode === 'bulk' && (
        <ResidentAddBulk
          accentColor={ACCENT}
          onAdd={(newResidents) => {
            const maxId = Math.max(...residents.map(r => r.id));
            const created = newResidents.map((d, i) => ({
              id: maxId + i + 1, facilityId: FACILITY_ID, firstName: d.firstName, lastName: d.lastName,
              dateOfBirth: d.dateOfBirth ?? '1940-01-01', gender: (d.gender as Resident['gender']) || 'F',
              medicareNumber: d.medicareNumber ?? '', room: d.room ?? '', wing: '', gpName: d.gpName ?? '',
              allergies: d.allergies ?? [], status: 'active' as const,
              eligibility: { flu: { isDue: false, isOverdue: false }, covid: { isDue: false, isOverdue: false }, shingrix: { isDue: false, isOverdue: false }, pneumo: { isDue: false, isOverdue: false }, dtpa: { isDue: false, isOverdue: false } },
            }));
            setResidents(prev => [...prev, ...created]);
            setAddMode(null);
          }}
          onCancel={() => setAddMode(null)}
        />
      )}
      {addMode === 'upload' && (
        <ResidentUploadExcel
          accentColor={ACCENT}
          onUpload={() => setAddMode(null)}
          onCancel={() => setAddMode(null)}
        />
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex rounded-lg border border-gray-200 bg-white">
          {statusFilters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                filterStatus === f.key ? 'text-white' : 'text-gray-600 hover:bg-gray-50'
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

      {/* Table + Profile Panel */}
      <div className="flex gap-6">
        {/* Table */}
        <div className="flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3">Resident</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3">Medicare</th>
                <th className="px-4 py-3">Allergies</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => (
                <tr
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`cursor-pointer border-b last:border-0 transition-colors ${
                    selectedId === r.id ? 'bg-blue-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  } ${r.status === 'inactive' ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{r.firstName} {r.lastName}</p>
                    {r.wing && <p className="text-xs text-gray-400">{r.wing} Wing</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{r.room}</td>
                  <td className="px-4 py-3 text-gray-700">{getAge(r.dateOfBirth)}</td>
                  <td className="px-4 py-3 text-gray-700">{r.medicareNumber || '—'}</td>
                  <td className="px-4 py-3">
                    {r.allergies.length > 0 ? (
                      <span className="text-xs font-medium text-red-600">{r.allergies.join(', ')}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Pill color={r.status === 'active' ? 'green' : 'gray'}>{r.status === 'active' ? 'Active' : 'Inactive'}</Pill>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {r.status === 'active' ? (
                      confirmDeactivateId === r.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => toggleStatus(r.id)} className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200">Confirm</button>
                          <button onClick={() => setConfirmDeactivateId(null)} className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeactivateId(r.id)} className="text-xs text-gray-500 hover:text-red-600">Mark Inactive</button>
                      )
                    ) : (
                      <button onClick={() => toggleStatus(r.id)} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">Activate</button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No residents match.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right Profile Panel */}
        {selectedResident && (
          <div className="w-72 flex-shrink-0 self-start sticky top-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex flex-col items-center">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white"
                  style={{ background: ACCENT }}
                >
                  {selectedResident.firstName[0]}{selectedResident.lastName[0]}
                </div>
                <h3 className="mt-2 text-lg font-semibold text-gray-900">{selectedResident.firstName} {selectedResident.lastName}</h3>
                <p className="text-sm text-gray-500">Room {selectedResident.room} {selectedResident.wing ? `· ${selectedResident.wing}` : ''}</p>
                <Pill color={selectedResident.status === 'active' ? 'green' : 'gray'}>
                  {selectedResident.status === 'active' ? 'Active' : 'Inactive'}
                </Pill>
              </div>
              <div className="space-y-3 border-t border-gray-100 pt-3">
                <DetailRow label="Date of Birth" value={new Date(selectedResident.dateOfBirth).toLocaleDateString('en-AU')} />
                <DetailRow label="Age" value={`${getAge(selectedResident.dateOfBirth)} years`} />
                <DetailRow label="Gender" value={selectedResident.gender} />
                <DetailRow label="Medicare" value={selectedResident.medicareNumber || '—'} />
                <DetailRow label="GP" value={selectedResident.gpName || '—'} />
                <DetailRow label="Allergies" value={selectedResident.allergies.length > 0 ? selectedResident.allergies.join(', ') : 'None'} />
              </div>
              <div className="mt-4 border-t border-gray-100 pt-3">
                <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Vaccinations</h4>
                <div className="space-y-2">
                  {Object.entries(selectedResident.eligibility).map(([code, elig]) => {
                    const name = VACCINE_NAMES[code] ?? code;
                    return (
                      <div key={code} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{name}</span>
                        {elig.isOverdue ? (
                          <Pill color="red">Overdue</Pill>
                        ) : elig.isDue ? (
                          <Pill color="orange">{elig.dueDate ? new Date(elig.dueDate).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' }) : 'Due'}</Pill>
                        ) : (
                          <Pill color="green">Done</Pill>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
