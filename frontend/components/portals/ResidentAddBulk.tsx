'use client';

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { FacilitySelector } from './FacilitySelector';
import type { Facility, NewResident } from '@/types/portals';

interface ResidentAddBulkProps {
  facilities?: Facility[];
  onAdd: (residents: NewResident[]) => void;
  onCancel: () => void;
  accentColor: string;
}

interface BulkRow {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  medicareNumber: string;
  room: string;
  gpName: string;
  allergies: string;
}

function createEmptyRow(id: number): BulkRow {
  return {
    id,
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    medicareNumber: '',
    room: '',
    gpName: '',
    allergies: '',
  };
}

let nextRowId = 1;

export function ResidentAddBulk({
  facilities,
  onAdd,
  onCancel,
  accentColor,
}: ResidentAddBulkProps) {
  const [facilityId, setFacilityId] = useState<string>(
    facilities && facilities.length > 0 ? 'all' : '',
  );
  const [rows, setRows] = useState<BulkRow[]>(() => {
    const initial = [
      createEmptyRow(nextRowId++),
      createEmptyRow(nextRowId++),
      createEmptyRow(nextRowId++),
    ];
    return initial;
  });

  const needsFacility = !!facilities;
  const noFacilitySelected = needsFacility && (facilityId === 'all' || facilityId === '');

  const validRows = rows.filter(
    (r) => r.firstName.trim() !== '' && r.lastName.trim() !== '',
  );
  const validCount = validRows.length;
  const canSubmit = validCount > 0 && !noFacilitySelected;

  function updateRow(id: number, field: keyof BulkRow, value: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  }

  function removeRow(id: number) {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function addRows(count: number) {
    const newRows: BulkRow[] = [];
    for (let i = 0; i < count; i++) {
      newRows.push(createEmptyRow(nextRowId++));
    }
    setRows((prev) => [...prev, ...newRows]);
  }

  function handleSubmit() {
    if (!canSubmit) return;

    const residents: NewResident[] = validRows.map((r) => ({
      facilityId: needsFacility ? Number(facilityId) : 0,
      firstName: r.firstName.trim(),
      lastName: r.lastName.trim(),
      gender: r.gender,
      ...(r.dateOfBirth && { dateOfBirth: r.dateOfBirth }),
      ...(r.medicareNumber.trim() && { medicareNumber: r.medicareNumber.trim() }),
      ...(r.room.trim() && { room: r.room.trim() }),
      ...(r.gpName.trim() && { gpName: r.gpName.trim() }),
      ...(r.allergies.trim() && {
        allergies: r.allergies
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
      }),
    }));

    onAdd(residents);
  }

  return (
    <div
      className="rounded-2xl bg-white p-6"
      style={{ border: `2px solid ${accentColor}` }}
    >
      {/* Facility Selector */}
      {facilities && (
        <div className="mb-5">
          <FacilitySelector
            value={facilityId}
            onChange={setFacilityId}
            facilities={facilities}
            label="Facility:"
          />
        </div>
      )}

      {/* Warning when no facility selected */}
      {noFacilitySelected && (
        <div className="mb-4 rounded-lg bg-orange-50 px-4 py-3 text-sm text-orange-700">
          &#9888; Select a facility before adding residents
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="px-2 py-2 text-xs font-medium text-gray-500 w-10">#</th>
              <th className="px-2 py-2 text-xs font-medium text-gray-500">
                First Name<span className="text-red-500">*</span>
              </th>
              <th className="px-2 py-2 text-xs font-medium text-gray-500">
                Last Name<span className="text-red-500">*</span>
              </th>
              <th className="px-2 py-2 text-xs font-medium text-gray-500">DOB</th>
              <th className="px-2 py-2 text-xs font-medium text-gray-500 w-20">Gender</th>
              <th className="px-2 py-2 text-xs font-medium text-gray-500">Medicare</th>
              <th className="px-2 py-2 text-xs font-medium text-gray-500 w-20">Room</th>
              <th className="px-2 py-2 text-xs font-medium text-gray-500">GP</th>
              <th className="px-2 py-2 text-xs font-medium text-gray-500">Allergies</th>
              <th className="px-2 py-2 text-xs font-medium text-gray-500 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className="border-b border-gray-100">
                <td className="px-2 py-1.5 text-xs text-gray-400">{index + 1}</td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={row.firstName}
                    onChange={(e) => updateRow(row.id, 'firstName', e.target.value)}
                    className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                    placeholder="First name"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={row.lastName}
                    onChange={(e) => updateRow(row.id, 'lastName', e.target.value)}
                    className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                    placeholder="Last name"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="date"
                    value={row.dateOfBirth}
                    onChange={(e) => updateRow(row.id, 'dateOfBirth', e.target.value)}
                    className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={row.gender}
                    onChange={(e) => updateRow(row.id, 'gender', e.target.value)}
                    className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                  >
                    <option value="">--</option>
                    <option value="F">F</option>
                    <option value="M">M</option>
                    <option value="X">X</option>
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={row.medicareNumber}
                    onChange={(e) => updateRow(row.id, 'medicareNumber', e.target.value)}
                    className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                    placeholder="Medicare"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={row.room}
                    onChange={(e) => updateRow(row.id, 'room', e.target.value)}
                    className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                    placeholder="Room"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={row.gpName}
                    onChange={(e) => updateRow(row.id, 'gpName', e.target.value)}
                    className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                    placeholder="GP"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={row.allergies}
                    onChange={(e) => updateRow(row.id, 'allergies', e.target.value)}
                    className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
                    placeholder="Comma-separated"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length <= 1}
                    className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30 transition-colors"
                    aria-label="Remove row"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Row Actions + Counter */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => addRows(1)}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Row
          </button>
          <button
            type="button"
            onClick={() => addRows(5)}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add 5 Rows
          </button>
        </div>

        <span className="text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{validCount}</span> of{' '}
          {rows.length} valid
        </span>
      </div>

      {/* Submit / Cancel */}
      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: accentColor }}
        >
          Add {validCount} Resident{validCount !== 1 ? 's' : ''}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
