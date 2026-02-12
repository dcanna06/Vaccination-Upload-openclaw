'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocationStore } from '@/stores/locationStore';
import { env } from '@/lib/env';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { Location, LocationProvider } from '@/types/location';

interface ProviderSettings {
  providerNumber: string;
  hpioNumber: string;
  hpiiNumber: string;
}

const STORAGE_KEY = 'air-provider-settings';

function loadLocalSettings(): ProviderSettings {
  if (typeof window === 'undefined') return { providerNumber: '', hpioNumber: '', hpiiNumber: '' };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore parse errors
  }
  return { providerNumber: '', hpioNumber: '', hpiiNumber: '' };
}

function saveLocalSettings(settings: ProviderSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export default function SettingsPage() {
  const { selectedLocationId } = useLocationStore();
  const [settings, setSettings] = useState<ProviderSettings>(loadLocalSettings);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Location info from backend
  const [location, setLocation] = useState<Location | null>(null);
  const [providers, setProviders] = useState<LocationProvider[]>([]);

  // Load provider settings from backend when location is selected
  useEffect(() => {
    if (!selectedLocationId) {
      setSettings(loadLocalSettings());
      setLocation(null);
      setProviders([]);
      return;
    }

    const loadFromBackend = async () => {
      setLoading(true);
      try {
        // Fetch location details
        const locRes = await fetch(`${env.apiUrl}/api/locations/${selectedLocationId}`);
        if (locRes.ok) {
          setLocation(await locRes.json());
        }

        // Fetch linked providers
        const provRes = await fetch(
          `${env.apiUrl}/api/providers?location_id=${selectedLocationId}`,
        );
        if (provRes.ok) {
          const provList: LocationProvider[] = await provRes.json();
          setProviders(provList);

          // Use first linked provider as default
          if (provList.length > 0) {
            setSettings((prev) => ({
              ...prev,
              providerNumber: provList[0].provider_number || prev.providerNumber,
            }));
          }
        }
      } catch {
        // Fall back to localStorage
        setSettings(loadLocalSettings());
      } finally {
        setLoading(false);
      }
    };

    loadFromBackend();
  }, [selectedLocationId]);

  const validateProviderNumber = (value: string): string | null => {
    if (!value) return 'Provider number is required';
    if (value.length < 6 || value.length > 8) return 'Provider number must be 6-8 characters';
    return null;
  };

  const handleSave = useCallback(async () => {
    const err = validateProviderNumber(settings.providerNumber);
    if (err) {
      setError(err);
      return;
    }
    if (settings.hpioNumber && !/^\d{16}$/.test(settings.hpioNumber)) {
      setError('HPI-O Number must be exactly 16 digits');
      return;
    }
    if (settings.hpiiNumber && !/^\d{16}$/.test(settings.hpiiNumber)) {
      setError('HPI-I Number must be exactly 16 digits');
      return;
    }
    setError(null);

    // Save to localStorage as offline cache
    saveLocalSettings(settings);

    // If a location is selected, save/update provider via backend
    if (selectedLocationId) {
      setLoading(true);
      try {
        // Check if provider already linked
        const existing = providers.find(
          (p) => p.provider_number === settings.providerNumber,
        );
        if (!existing) {
          const res = await fetch(`${env.apiUrl}/api/providers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location_id: selectedLocationId,
              provider_number: settings.providerNumber,
              provider_type: '',
            }),
          });
          if (!res.ok && res.status !== 409) {
            const body = await res.json().catch(() => ({ detail: 'Save failed' }));
            throw new Error(body.detail || 'Failed to link provider');
          }
        }
      } catch (saveErr) {
        setError(saveErr instanceof Error ? saveErr.message : 'Failed to save to backend');
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }, [settings, selectedLocationId, providers]);

  const handleChange = (field: keyof ProviderSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Provider Settings</h2>

      {/* Location info card */}
      {location && (
        <Card className="border-emerald-500/20">
          <CardHeader>
            <CardTitle>Selected Location</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400">Location</p>
              <p className="font-medium text-slate-200">{location.name}</p>
            </div>
            <div>
              <p className="text-slate-400">Minor ID</p>
              <p className="font-mono font-medium text-emerald-400">{location.minor_id}</p>
            </div>
            <div>
              <p className="text-slate-400">PRODA Link Status</p>
              <p
                className={`font-medium ${
                  location.proda_link_status === 'linked'
                    ? 'text-emerald-400'
                    : 'text-yellow-400'
                }`}
              >
                {location.proda_link_status}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Linked Providers</p>
              <p className="font-medium text-slate-200">{providers.length}</p>
            </div>
          </div>
        </Card>
      )}

      {!selectedLocationId && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <p className="text-sm text-yellow-400">
            No location selected. Settings will be saved to local storage only. Select a location
            from the header dropdown to sync with the backend.
          </p>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Information Provider</CardTitle>
        </CardHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Provider Number <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={settings.providerNumber}
              onChange={(e) => handleChange('providerNumber', e.target.value)}
              placeholder="e.g., 1234560V"
              className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              data-testid="provider-number"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-slate-500">
              Your Medicare or AIR provider number (6-8 characters)
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">HPI-O Number</label>
            <input
              type="text"
              value={settings.hpioNumber}
              onChange={(e) => handleChange('hpioNumber', e.target.value)}
              placeholder="16-digit HPI-O"
              className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              data-testid="hpio-number"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-slate-500">
              Healthcare Provider Identifier - Organisation (optional, 16 digits)
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">HPI-I Number</label>
            <input
              type="text"
              value={settings.hpiiNumber}
              onChange={(e) => handleChange('hpiiNumber', e.target.value)}
              placeholder="16-digit HPI-I"
              className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              data-testid="hpii-number"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-slate-500">
              Healthcare Provider Identifier - Individual (optional, 16 digits)
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-400" data-testid="settings-error">
            {error}
          </p>
        )}

        {saved && <p className="mt-3 text-sm text-emerald-400">Settings saved successfully.</p>}

        <div className="mt-4 flex justify-end">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
