'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProviderVerifyResult } from '@/components/admin/ProviderVerifyResult';
import { HW027Guidance } from '@/components/admin/HW027Guidance';
import { useLocationStore } from '@/stores/locationStore';
import type { Location, LocationProvider } from '@/types/location';
import { env } from '@/lib/env';

export default function ProvidersPage() {
  const { locations, setLocations } = useLocationStore();
  const [providers, setProviders] = useState<LocationProvider[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Link form
  const [linkProvider, setLinkProvider] = useState('');
  const [linkType, setLinkType] = useState('');
  const [linking, setLinking] = useState(false);

  // Verify state
  const [verifyResults, setVerifyResults] = useState<Record<number, {
    status: string;
    errorCode?: string;
    message?: string;
    accessList?: Record<string, unknown>;
  }>>({});
  const [verifying, setVerifying] = useState<number | null>(null);

  // HW027 expanded
  const [hw027Expanded, setHw027Expanded] = useState<number | null>(null);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch(`${env.apiUrl}/api/locations`);
      if (res.ok) {
        const data: Location[] = await res.json();
        setLocations(data);
        if (data.length > 0 && !selectedLocationId) {
          setSelectedLocationId(data[0].id);
        }
      }
    } catch {
      // Locations may fail if DB not connected yet
    }
  }, [setLocations, selectedLocationId]);

  const fetchProviders = useCallback(async () => {
    if (!selectedLocationId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${env.apiUrl}/api/providers?location_id=${selectedLocationId}`);
      if (!res.ok) throw new Error(`Failed to load providers: ${res.status}`);
      const data: LocationProvider[] = await res.json();
      setProviders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load providers');
    } finally {
      setIsLoading(false);
    }
  }, [selectedLocationId]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleLink = async () => {
    if (!selectedLocationId || !linkProvider.trim()) return;
    setLinking(true);
    setError(null);
    try {
      const res = await fetch(`${env.apiUrl}/api/providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: selectedLocationId,
          provider_number: linkProvider.trim(),
          provider_type: linkType.trim(),
        }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || `Link failed: ${res.status}`);
      }
      setLinkProvider('');
      setLinkType('');
      await fetchProviders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link provider');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (providerId: number) => {
    try {
      const res = await fetch(`${env.apiUrl}/api/providers/${providerId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Unlink failed: ${res.status}`);
      await fetchProviders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlink provider');
    }
  };

  const handleVerify = async (providerId: number) => {
    setVerifying(providerId);
    try {
      const res = await fetch(`${env.apiUrl}/api/providers/${providerId}/verify`, {
        method: 'POST',
      });
      const data = await res.json();
      setVerifyResults((prev) => ({ ...prev, [providerId]: data }));
    } catch (err) {
      setVerifyResults((prev) => ({
        ...prev,
        [providerId]: { status: 'error', message: 'Request failed' },
      }));
    } finally {
      setVerifying(null);
    }
  };

  const handleHW027Update = async (providerId: number, newStatus: string) => {
    try {
      const res = await fetch(`${env.apiUrl}/api/providers/${providerId}/hw027`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hw027_status: newStatus }),
      });
      if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      await fetchProviders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update HW027 status');
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold text-slate-100">Provider Setup</h2>

      {error && (
        <Card className="mb-4 border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-400">{error}</p>
        </Card>
      )}

      {/* Location selector */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-slate-300">Location</label>
        <select
          value={selectedLocationId ?? ''}
          onChange={(e) => setSelectedLocationId(Number(e.target.value) || null)}
          className="rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
        >
          <option value="">Select a location...</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name} ({loc.minor_id})
            </option>
          ))}
        </select>
      </div>

      {/* Link provider form */}
      {selectedLocationId && (
        <Card className="mb-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-100">Link Provider</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={linkProvider}
              onChange={(e) => setLinkProvider(e.target.value)}
              placeholder="Provider number (e.g. 1234567A)"
              className="flex-1 rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
            <input
              type="text"
              value={linkType}
              onChange={(e) => setLinkType(e.target.value)}
              placeholder="Type (e.g. GP)"
              className="w-32 rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
            <Button onClick={handleLink} disabled={linking || !linkProvider.trim()}>
              {linking ? 'Linking...' : 'Link'}
            </Button>
          </div>
        </Card>
      )}

      {/* Providers list */}
      {isLoading ? (
        <p className="text-sm text-slate-400">Loading providers...</p>
      ) : !selectedLocationId ? (
        <Card>
          <p className="text-sm text-slate-400">Select a location to manage its providers.</p>
        </Card>
      ) : providers.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-400">No providers linked to this location.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {providers.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-100">
                    {p.provider_number}
                    {p.provider_type && (
                      <span className="ml-2 text-xs text-slate-400">({p.provider_type})</span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    HW027: <span className={
                      p.hw027_status === 'approved' ? 'text-emerald-400' :
                      p.hw027_status === 'rejected' ? 'text-red-400' :
                      p.hw027_status === 'submitted' ? 'text-yellow-400' :
                      'text-slate-400'
                    }>{p.hw027_status}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleVerify(p.id)}
                    disabled={verifying === p.id}
                  >
                    {verifying === p.id ? 'Verifying...' : 'Verify'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setHw027Expanded(hw027Expanded === p.id ? null : p.id)}
                  >
                    HW027
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleUnlink(p.id)}>
                    Unlink
                  </Button>
                </div>
              </div>

              <ProviderVerifyResult result={verifyResults[p.id] ?? null} />

              {hw027Expanded === p.id && (
                <div>
                  <HW027Guidance currentStatus={p.hw027_status} />
                  <div className="mt-3 flex gap-2">
                    {['not_submitted', 'submitted', 'approved', 'rejected'].map((s) => (
                      <Button
                        key={s}
                        variant={p.hw027_status === s ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => handleHW027Update(p.id, s)}
                      >
                        {s.replace('_', ' ')}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
