'use client';

import React, { useState } from 'react';
import { FacilitySelector } from './FacilitySelector';
import type { Facility, NewResident } from '@/types/portals';

interface ResidentAddSingleProps {
  facilities?: Facility[];
  onAdd: (resident: NewResident) => void;
  onCancel: () => void;
  accentColor: string;
}

export function ResidentAddSingle({
  facilities,
  onAdd,
  onCancel,
  accentColor,
}: ResidentAddSingleProps) {
  const [facilityId, setFacilityId] = useState<string>(
    facilities && facilities.length > 0 ? 'all' : '',
  );
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [medicareNumber, setMedicareNumber] = useState('');
  const [room, setRoom] = useState('');
  const [gpName, setGpName] = useState('');
  const [allergies, setAllergies] = useState('');

  const needsFacility = !!facilities;
  const noFacilitySelected = needsFacility && (facilityId === 'all' || facilityId === '');
  const canSubmit = firstName.trim() !== '' && lastName.trim() !== '' && !noFacilitySelected;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const resident: NewResident = {
      facilityId: needsFacility ? Number(facilityId) : 0,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender,
      ...(dateOfBirth && { dateOfBirth }),
      ...(medicareNumber.trim() && { medicareNumber: medicareNumber.trim() }),
      ...(room.trim() && { room: room.trim() }),
      ...(gpName.trim() && { gpName: gpName.trim() }),
      ...(allergies.trim() && {
        allergies: allergies
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
      }),
    };

    onAdd(resident);
  }

  return (
    <div
      className="rounded-2xl bg-white p-6"
      style={{ border: `2px solid ${accentColor}` }}
    >
      <form onSubmit={handleSubmit}>
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
            &#9888; Select a facility before adding a resident
          </div>
        )}

        {/* Form Grid */}
        <div className="grid grid-cols-4 gap-4">
          {/* Row 1 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              First Name<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="First name"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Last Name<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="Last name"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Date of Birth
            </label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Gender
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="">Select...</option>
              <option value="F">F</option>
              <option value="M">M</option>
              <option value="X">X</option>
            </select>
          </div>

          {/* Row 2 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Medicare Number
            </label>
            <input
              type="text"
              value={medicareNumber}
              onChange={(e) => setMedicareNumber(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="Medicare number"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Room</label>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="Room"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              GP Name
            </label>
            <input
              type="text"
              value={gpName}
              onChange={(e) => setGpName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="GP name"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Allergies
            </label>
            <input
              type="text"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="Comma-separated"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: accentColor }}
          >
            Add Resident
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
