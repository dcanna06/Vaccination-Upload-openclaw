'use client';

import React from 'react';
import { Building2 } from 'lucide-react';
import type { Facility } from '@/types/portals';

interface FacilitySelectorProps {
  value: string;
  onChange: (val: string) => void;
  facilities: Facility[];
  label?: string;
}

export function FacilitySelector({
  value,
  onChange,
  facilities,
  label,
}: FacilitySelectorProps) {
  const activeFacilities = facilities.filter((f) => f.status === 'active');

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
      {label && (
        <span className="text-sm font-medium text-gray-600">{label}</span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
      >
        <option value="all">All Facilities</option>
        {activeFacilities.map((f) => (
          <option key={f.id} value={String(f.id)}>
            {f.name}
          </option>
        ))}
      </select>
    </div>
  );
}
