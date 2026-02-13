'use client';

import { useState, useMemo } from 'react';
import { ResidentAddSingle } from '@/components/portals/ResidentAddSingle';
import { ResidentAddBulk } from '@/components/portals/ResidentAddBulk';
import { ResidentUploadExcel } from '@/components/portals/ResidentUploadExcel';
import { ResidentTable } from '@/components/portals/ResidentTable';
import { FacilitySelector } from '@/components/portals/FacilitySelector';
import { Search, UserPlus, Users, Upload } from 'lucide-react';
import { RESIDENTS, FACILITIES } from '@/lib/mock/portal-data';
import type { Resident, NewResident } from '@/types/portals';

const ACCENT = '#3B6CE7';
const activeFacilities = FACILITIES.filter(f => f.status === 'active');

type AddMode = 'single' | 'bulk' | 'upload' | null;
type FilterStatus = 'active' | 'inactive' | 'all';

export default function PharmResidentsPage() {
  const [residents, setResidents] = useState<Resident[]>(RESIDENTS);
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active');
  const [facilityFilter, setFacilityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleAddSingle = (data: NewResident) => {
    const newR: Resident = {
      id: Math.max(...residents.map(r => r.id)) + 1,
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
    const maxId = Math.max(...residents.map(r => r.id));
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

  const handleDeactivate = (id: number) => {
    setResidents(prev =>
      prev.map(r => (r.id === id ? { ...r, status: 'inactive' } : r)),
    );
  };

  const handleActivate = (id: number) => {
    setResidents(prev =>
      prev.map(r => (r.id === id ? { ...r, status: 'active' } : r)),
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

      {/* Add forms -- all with facilities prop for multi-facility */}
      {addMode === 'single' && (
        <ResidentAddSingle
          facilities={activeFacilities}
          accentColor={ACCENT}
          onAdd={handleAddSingle}
          onCancel={() => setAddMode(null)}
        />
      )}
      {addMode === 'bulk' && (
        <ResidentAddBulk
          facilities={activeFacilities}
          accentColor={ACCENT}
          onAdd={handleAddBulk}
          onCancel={() => setAddMode(null)}
        />
      )}
      {addMode === 'upload' && (
        <ResidentUploadExcel
          facilities={activeFacilities}
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

      {/* Resident Table */}
      <div className="rounded-2xl border border-gray-200 bg-white">
        <ResidentTable
          residents={filtered}
          facilities={FACILITIES}
          showVaccineDue
          onActivate={handleActivate}
          onDeactivate={handleDeactivate}
          accentColor={ACCENT}
        />
      </div>
    </div>
  );
}
