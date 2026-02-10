'use client';

import { useCallback, useEffect } from 'react';
import { useLocationStore } from '@/stores/locationStore';
import type { Location } from '@/types/location';
import { env } from '@/lib/env';

export function LocationSelector() {
  const { locations, selectedLocationId, setLocations, setSelectedLocationId } = useLocationStore();

  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch(`${env.apiUrl}/api/locations`);
      if (res.ok) {
        const data: Location[] = await res.json();
        setLocations(data);
        // Auto-select first if nothing selected
        if (data.length > 0 && !selectedLocationId) {
          setSelectedLocationId(data[0].id);
        }
      }
    } catch {
      // Silently fail — locations may not be available yet
    }
  }, [setLocations, setSelectedLocationId, selectedLocationId]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Hide selector if only 0 or 1 location
  if (locations.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-slate-400">Location:</label>
      <select
        value={selectedLocationId ?? ''}
        onChange={(e) => setSelectedLocationId(Number(e.target.value) || null)}
        className="rounded border border-slate-600 bg-slate-700 px-2 py-1 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
      >
        {locations.map((loc) => (
          <option key={loc.id} value={loc.id}>
            {loc.name}
          </option>
        ))}
      </select>
    </div>
  );
}
