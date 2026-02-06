'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ProviderSettings {
  providerNumber: string;
  hpioNumber: string;
  hpiiNumber: string;
}

const STORAGE_KEY = 'air-provider-settings';

function loadSettings(): ProviderSettings {
  if (typeof window === 'undefined') return { providerNumber: '', hpioNumber: '', hpiiNumber: '' };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore parse errors
  }
  return { providerNumber: '', hpioNumber: '', hpiiNumber: '' };
}

function saveSettings(settings: ProviderSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<ProviderSettings>(loadSettings);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const validateProviderNumber = (value: string): string | null => {
    if (!value) return 'Provider number is required';
    if (value.length < 6 || value.length > 8) return 'Provider number must be 6-8 characters';
    return null;
  };

  const handleSave = useCallback(() => {
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
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }, [settings]);

  const handleChange = (field: keyof ProviderSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Provider Settings</h2>

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
            />
            <p className="mt-1 text-xs text-slate-500">
              Your Medicare or AIR provider number (6-8 characters)
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              HPI-O Number
            </label>
            <input
              type="text"
              value={settings.hpioNumber}
              onChange={(e) => handleChange('hpioNumber', e.target.value)}
              placeholder="16-digit HPI-O"
              className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              data-testid="hpio-number"
            />
            <p className="mt-1 text-xs text-slate-500">
              Healthcare Provider Identifier - Organisation (optional, 16 digits)
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              HPI-I Number
            </label>
            <input
              type="text"
              value={settings.hpiiNumber}
              onChange={(e) => handleChange('hpiiNumber', e.target.value)}
              placeholder="16-digit HPI-I"
              className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              data-testid="hpii-number"
            />
            <p className="mt-1 text-xs text-slate-500">
              Healthcare Provider Identifier - Individual (optional, 16 digits)
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-400" data-testid="settings-error">{error}</p>
        )}

        {saved && (
          <p className="mt-3 text-sm text-emerald-400">Settings saved successfully.</p>
        )}

        <div className="mt-4 flex justify-end">
          <Button onClick={handleSave}>Save Settings</Button>
        </div>
      </Card>
    </div>
  );
}
