'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LocationModal } from '@/components/admin/LocationModal';
import { DeactivateDialog } from '@/components/admin/DeactivateDialog';
import { useLocationStore } from '@/stores/locationStore';
import type { Location, LocationCreate } from '@/types/location';
import { env } from '@/lib/env';

export default function LocationsPage() {
  const { locations, setLocations, isLoading, setIsLoading, error, setError } = useLocationStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editLocation, setEditLocation] = useState<Location | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Location | null>(null);

  const fetchLocations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${env.apiUrl}/api/locations`);
      if (!res.ok) throw new Error(`Failed to load locations: ${res.status}`);
      const data: Location[] = await res.json();
      setLocations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load locations');
    } finally {
      setIsLoading(false);
    }
  }, [setLocations, setIsLoading, setError]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleCreate = async (data: LocationCreate) => {
    const res = await fetch(`${env.apiUrl}/api/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error(detail.detail || `Create failed: ${res.status}`);
    }
    await fetchLocations();
  };

  const handleUpdate = async (data: LocationCreate) => {
    if (!editLocation) return;
    const res = await fetch(`${env.apiUrl}/api/locations/${editLocation.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error(detail.detail || `Update failed: ${res.status}`);
    }
    await fetchLocations();
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    const res = await fetch(`${env.apiUrl}/api/locations/${deactivateTarget.id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Deactivate failed: ${res.status}`);
    setDeactivateTarget(null);
    await fetchLocations();
  };

  const openCreate = () => {
    setEditLocation(null);
    setModalOpen(true);
  };

  const openEdit = (loc: Location) => {
    setEditLocation(loc);
    setModalOpen(true);
  };

  const statusBadge = (status: string) => {
    const colors = status === 'active'
      ? 'bg-emerald-500/20 text-emerald-400'
      : 'bg-slate-600/30 text-slate-400';
    return (
      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors}`}>
        {status}
      </span>
    );
  };

  const linkStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      linked: 'bg-emerald-500/20 text-emerald-400',
      failed: 'bg-red-500/20 text-red-400',
    };
    return (
      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${map[status] || 'bg-slate-600/30 text-slate-400'}`}>
        {status}
      </span>
    );
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-100">Locations</h2>
        <Button onClick={openCreate}>Add Location</Button>
      </div>

      {error && (
        <Card className="mb-4 border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-400">{error}</p>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading locations...</p>
      ) : locations.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-400">
            No locations configured. Add a location to start managing Minor IDs for AIR submissions.
          </p>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-left text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Minor ID</th>
                <th className="px-4 py-3 font-medium">Suburb</th>
                <th className="px-4 py-3 font-medium">State</th>
                <th className="px-4 py-3 font-medium">PRODA Link</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {locations.map((loc) => (
                <tr key={loc.id} className="bg-slate-800/50 hover:bg-slate-800">
                  <td className="px-4 py-3 text-slate-100">{loc.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{loc.minor_id}</td>
                  <td className="px-4 py-3 text-slate-300">{loc.suburb || '-'}</td>
                  <td className="px-4 py-3 text-slate-300">{loc.state || '-'}</td>
                  <td className="px-4 py-3">{linkStatusBadge(loc.proda_link_status)}</td>
                  <td className="px-4 py-3">{statusBadge(loc.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(loc)}>
                        Edit
                      </Button>
                      {loc.status === 'active' && (
                        <Button variant="ghost" size="sm" onClick={() => setDeactivateTarget(loc)}>
                          Deactivate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LocationModal
        open={modalOpen}
        location={editLocation}
        onClose={() => {
          setModalOpen(false);
          setEditLocation(null);
        }}
        onSave={editLocation ? handleUpdate : handleCreate}
      />

      <DeactivateDialog
        open={!!deactivateTarget}
        locationName={deactivateTarget?.name || ''}
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
}
