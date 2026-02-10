'use client';

import { useEffect, useState } from 'react';
import type { Location, LocationCreate } from '@/types/location';
import { Button } from '@/components/ui/Button';

const AUSTRALIAN_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

interface LocationModalProps {
  open: boolean;
  location?: Location | null;
  onClose: () => void;
  onSave: (data: LocationCreate) => Promise<void>;
}

export function LocationModal({ open, location, onClose, onSave }: LocationModalProps) {
  const [name, setName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [suburb, setSuburb] = useState('');
  const [state, setState] = useState('');
  const [postcode, setPostcode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!location;

  useEffect(() => {
    if (location) {
      setName(location.name);
      setAddressLine1(location.address_line_1);
      setAddressLine2(location.address_line_2);
      setSuburb(location.suburb);
      setState(location.state);
      setPostcode(location.postcode);
    } else {
      setName('');
      setAddressLine1('');
      setAddressLine2('');
      setSuburb('');
      setState('');
      setPostcode('');
    }
    setError(null);
  }, [location, open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        address_line_1: addressLine1.trim(),
        address_line_2: addressLine2.trim(),
        suburb: suburb.trim(),
        state,
        postcode: postcode.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-800 p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-100">
          {isEdit ? 'Edit Location' : 'Add Location'}
        </h2>

        {error && (
          <div className="mb-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              placeholder="e.g. Main Clinic"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Address Line 1</label>
            <input
              type="text"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Address Line 2</label>
            <input
              type="text"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Suburb</label>
              <input
                type="text"
                value={suburb}
                onChange={(e) => setSuburb(e.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">State</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Select...</option>
                {AUSTRALIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Postcode</label>
              <input
                type="text"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                maxLength={4}
                className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
