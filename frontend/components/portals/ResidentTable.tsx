'use client';

import React, { useState, useMemo } from 'react';
import { Pill } from './Pill';
import type { Resident, Facility } from '@/types/portals';

interface ResidentTableProps {
  residents: Resident[];
  facilities?: Facility[];
  showVaccineDue?: boolean;
  onActivate: (id: number) => void;
  onDeactivate: (id: number) => void;
  onSelect?: (resident: Resident) => void;
  selectedId?: number;
  accentColor: string;
}

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function getFacilityLabel(
  facilityId: number,
  facilities: Facility[],
): string {
  const fac = facilities.find((f) => f.id === facilityId);
  if (!fac) return 'Unknown';
  return fac.name.split(' ')[0];
}

export function ResidentTable({
  residents,
  facilities,
  showVaccineDue,
  onActivate,
  onDeactivate,
  onSelect,
  selectedId,
  accentColor,
}: ResidentTableProps) {
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const sortedResidents = useMemo(() => {
    return [...residents].sort((a, b) =>
      a.lastName.localeCompare(b.lastName),
    );
  }, [residents]);

  function getVaccineCounts(eligibility: Resident['eligibility']) {
    let due = 0;
    let overdue = 0;
    for (const vax of Object.values(eligibility)) {
      if (vax.isOverdue) overdue++;
      else if (vax.isDue) due++;
    }
    return { due, overdue };
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="px-4 py-3 text-xs font-medium uppercase text-gray-500">
              Resident
            </th>
            {facilities && (
              <th className="px-4 py-3 text-xs font-medium uppercase text-gray-500">
                Facility
              </th>
            )}
            <th className="px-4 py-3 text-xs font-medium uppercase text-gray-500">
              Room
            </th>
            <th className="px-4 py-3 text-xs font-medium uppercase text-gray-500">
              Age
            </th>
            <th className="px-4 py-3 text-xs font-medium uppercase text-gray-500">
              Medicare
            </th>
            <th className="px-4 py-3 text-xs font-medium uppercase text-gray-500">
              Allergies
            </th>
            {showVaccineDue && (
              <th className="px-4 py-3 text-xs font-medium uppercase text-gray-500">
                Vaccines Due
              </th>
            )}
            <th className="px-4 py-3 text-xs font-medium uppercase text-gray-500">
              Status
            </th>
            <th className="px-4 py-3 text-xs font-medium uppercase text-gray-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedResidents.map((resident, index) => {
            const isInactive = resident.status === 'inactive';
            const isSelected = selectedId === resident.id;
            const isConfirming = confirmingId === resident.id;
            const vaccineCounts = showVaccineDue
              ? getVaccineCounts(resident.eligibility)
              : null;
            const rowBg = isSelected
              ? `rgba(${parseInt(accentColor.slice(1, 3), 16)}, ${parseInt(accentColor.slice(3, 5), 16)}, ${parseInt(accentColor.slice(5, 7), 16)}, 0.06)`
              : index % 2 === 0
                ? '#ffffff'
                : '#fafafa';

            return (
              <tr
                key={resident.id}
                className={`border-b border-gray-100 transition-colors ${
                  isInactive ? 'opacity-50' : ''
                } ${onSelect ? 'cursor-pointer' : ''}`}
                style={{ backgroundColor: rowBg }}
                onClick={() => onSelect?.(resident)}
              >
                {/* Resident Name + Wing */}
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">
                    {resident.firstName} {resident.lastName}
                  </div>
                  {resident.wing && (
                    <div className="text-xs text-gray-400">{resident.wing}</div>
                  )}
                </td>

                {/* Facility */}
                {facilities && (
                  <td className="px-4 py-3">
                    <Pill color={accentColor === '#7c3aed' ? 'purple' : 'blue'}>
                      {getFacilityLabel(resident.facilityId, facilities)}
                    </Pill>
                  </td>
                )}

                {/* Room */}
                <td className="px-4 py-3 text-gray-700">{resident.room}</td>

                {/* Age */}
                <td className="px-4 py-3 text-gray-700">
                  {resident.dateOfBirth ? calculateAge(resident.dateOfBirth) : '--'}
                </td>

                {/* Medicare */}
                <td className="px-4 py-3 text-gray-700">
                  {resident.medicareNumber || '--'}
                </td>

                {/* Allergies */}
                <td className="px-4 py-3">
                  {resident.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {resident.allergies.map((allergy) => (
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
                {showVaccineDue && vaccineCounts && (
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {vaccineCounts.due > 0 && (
                        <Pill color="orange">{vaccineCounts.due} due</Pill>
                      )}
                      {vaccineCounts.overdue > 0 && (
                        <Pill color="red">{vaccineCounts.overdue} overdue</Pill>
                      )}
                      {vaccineCounts.due === 0 && vaccineCounts.overdue === 0 && (
                        <span className="text-xs text-gray-400">Up to date</span>
                      )}
                    </div>
                  </td>
                )}

                {/* Status */}
                <td className="px-4 py-3">
                  <Pill color={resident.status === 'active' ? 'green' : 'gray'}>
                    {resident.status === 'active' ? 'Active' : 'Inactive'}
                  </Pill>
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {resident.status === 'active' ? (
                      isConfirming ? (
                        <>
                          <button
                            onClick={() => {
                              onDeactivate(resident.id);
                              setConfirmingId(null);
                            }}
                            className="rounded px-2 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmingId(null)}
                            className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmingId(resident.id)}
                          className="text-xs font-medium text-gray-500 hover:text-red-600 transition-colors"
                        >
                          Mark Inactive
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => onActivate(resident.id)}
                        className="rounded px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {sortedResidents.length === 0 && (
        <div className="py-12 text-center text-sm text-gray-400">
          No residents found
        </div>
      )}
    </div>
  );
}
