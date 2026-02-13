'use client';

import { useState, useMemo } from 'react';
import { Pill } from '@/components/portals/Pill';
import {
  Building2,
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
  CheckCircle,
  X,
} from 'lucide-react';
import {
  FACILITIES,
  RESIDENTS,
  CLINICS,
} from '@/lib/mock/portal-data';
import type { Facility } from '@/types/portals';

const ACCENT = '#7c3aed';

type FilterStatus = 'active' | 'inactive' | 'all';

export default function NMFacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>(FACILITIES);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // New facility form state
  const [newFacility, setNewFacility] = useState({
    name: '',
    address: '',
    contactPerson: '',
    phone: '',
    email: '',
    pharmacy: '',
  });

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return facilities;
    return facilities.filter(f => f.status === filterStatus);
  }, [facilities, filterStatus]);

  const activeCount = facilities.filter(f => f.status === 'active').length;
  const inactiveCount = facilities.filter(f => f.status === 'inactive').length;

  const getResidentCount = (facilityId: number) =>
    RESIDENTS.filter(r => r.facilityId === facilityId && r.status === 'active').length;

  const getClinicCount = (facilityId: number) =>
    CLINICS.filter(c => c.facilityId === facilityId && c.status === 'upcoming').length;

  const handleAddFacility = () => {
    if (!newFacility.name.trim()) return;

    const newId = Math.max(...facilities.map(f => f.id), 0) + 1;
    const created: Facility = {
      id: newId,
      name: newFacility.name.trim(),
      address: newFacility.address.trim(),
      contactPerson: newFacility.contactPerson.trim(),
      contactPhone: newFacility.phone.trim(),
      contactEmail: newFacility.email.trim(),
      pharmacyName: newFacility.pharmacy.trim(),
      pharmacistName: '',
      status: 'active',
      residentCount: 0,
      joinedAt: new Date().toISOString().split('T')[0],
    };

    setFacilities(prev => [...prev, created]);
    setNewFacility({ name: '', address: '', contactPerson: '', phone: '', email: '', pharmacy: '' });
    setShowAddForm(false);
  };

  const handleDelete = (id: number) => {
    setFacilities(prev => prev.map(f => f.id === id ? { ...f, status: 'inactive' as const } : f));
    setConfirmDeleteId(null);
  };

  const handleActivate = (id: number) => {
    setFacilities(prev => prev.map(f => f.id === id ? { ...f, status: 'active' as const } : f));
  };

  const toggleExpand = (id: number) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const statusFilters: { key: FilterStatus; label: string; count: number }[] = [
    { key: 'active', label: 'Active', count: activeCount },
    { key: 'inactive', label: 'Inactive', count: inactiveCount },
    { key: 'all', label: 'All', count: facilities.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Facilities</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ background: ACCENT }}
        >
          <Plus className="h-4 w-4" /> Add Facility
        </button>
      </div>

      {/* Filter Toggle */}
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
        <span className="text-sm text-gray-500">{filtered.length} facilities</span>
      </div>

      {/* Add Facility Form */}
      {showAddForm && (
        <div
          className="rounded-2xl bg-white p-6"
          style={{ border: `2px solid ${ACCENT}` }}
        >
          <h3 className="mb-4 text-lg font-semibold text-gray-900">New Facility</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Facility Name<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newFacility.name}
                onChange={e => setNewFacility(p => ({ ...p, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
                placeholder="e.g. Sunrise Aged Care"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Address</label>
              <input
                type="text"
                value={newFacility.address}
                onChange={e => setNewFacility(p => ({ ...p, address: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
                placeholder="Street, Suburb, State"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Contact Person</label>
              <input
                type="text"
                value={newFacility.contactPerson}
                onChange={e => setNewFacility(p => ({ ...p, contactPerson: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
                placeholder="Contact name"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Phone</label>
              <input
                type="text"
                value={newFacility.phone}
                onChange={e => setNewFacility(p => ({ ...p, phone: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
                placeholder="Phone number"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
              <input
                type="text"
                value={newFacility.email}
                onChange={e => setNewFacility(p => ({ ...p, email: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
                placeholder="Email address"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Pharmacy</label>
              <input
                type="text"
                value={newFacility.pharmacy}
                onChange={e => setNewFacility(p => ({ ...p, pharmacy: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
                placeholder="Pharmacy name"
              />
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={handleAddFacility}
              disabled={!newFacility.name.trim()}
              className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: ACCENT }}
            >
              Add Facility
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Facility List - Expandable Rows */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No facilities found</div>
        ) : (
          filtered.map(facility => {
            const isExpanded = expandedId === facility.id;
            const isInactive = facility.status === 'inactive';
            const isConfirming = confirmDeleteId === facility.id;
            const residentCount = getResidentCount(facility.id);
            const clinicCount = getClinicCount(facility.id);

            return (
              <div key={facility.id} className={`border-b border-gray-100 last:border-0 ${isInactive ? 'opacity-50' : ''}`}>
                {/* Collapsed Row */}
                <button
                  onClick={() => toggleExpand(facility.id)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <Building2 className="h-5 w-5 flex-shrink-0 text-violet-500" />
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-gray-900">{facility.name}</span>
                  </div>
                  <span className="text-sm text-gray-500 hidden md:block">{facility.address}</span>
                  <Pill color={facility.status === 'active' ? 'green' : 'gray'}>
                    {facility.status === 'active' ? 'Active' : 'Inactive'}
                  </Pill>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{residentCount} residents</span>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{clinicCount} clinics</span>

                  {/* Action Button */}
                  <div
                    className="flex items-center"
                    onClick={e => e.stopPropagation()}
                  >
                    {facility.status === 'active' ? (
                      isConfirming ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(facility.id)}
                            className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(facility.id)}
                          className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          aria-label="Deactivate facility"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => handleActivate(facility.id)}
                        className="rounded px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
                      >
                        Activate
                      </button>
                    )}
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 flex-shrink-0 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 flex-shrink-0 text-gray-400" />
                  )}
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                    <div className="grid grid-cols-4 gap-6 text-sm">
                      <div>
                        <span className="text-xs font-medium uppercase text-gray-500">Contact</span>
                        <p className="mt-1 font-medium text-gray-900">{facility.contactPerson || '---'}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium uppercase text-gray-500">Phone</span>
                        <p className="mt-1 text-gray-700">{facility.contactPhone || '---'}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium uppercase text-gray-500">Email</span>
                        <p className="mt-1 text-gray-700">{facility.contactEmail || '---'}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium uppercase text-gray-500">Pharmacy</span>
                        <p className="mt-1 text-gray-700">{facility.pharmacyName || '---'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
