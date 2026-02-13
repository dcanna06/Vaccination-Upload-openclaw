'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocationStore } from '@/stores/locationStore';
import { env } from '@/lib/env';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { Location, LocationProvider } from '@/types/location';

type WizardStep = 'site' | 'provider' | 'hw027' | 'proda';

interface SetupStatus {
  location: Location | null;
  providers: LocationProvider[];
  setupComplete: boolean;
  steps: {
    siteDetails: { complete: boolean };
    providerLinked: { complete: boolean };
    hw027: { complete: boolean; statuses: Record<string, string> };
    prodaLink: { complete: boolean; status: string };
    providerVerified: { complete: boolean; accessLists: Record<string, unknown> };
  };
}

const STEPS: { key: WizardStep; label: string; description: string }[] = [
  {
    key: 'site',
    label: 'Site Details',
    description: 'Create your healthcare location and receive a Minor ID',
  },
  {
    key: 'provider',
    label: 'Provider Number',
    description: 'Link a provider number to your location',
  },
  {
    key: 'hw027',
    label: 'HW027 Form',
    description: 'Submit HW027 to link provider to Minor ID with Services Australia',
  },
  {
    key: 'proda',
    label: 'PRODA Link',
    description: 'Verify PRODA linking and complete setup',
  },
];

const STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
const PROVIDER_TYPES = ['GP', 'Pharmacist', 'Nurse Practitioner', 'Midwife', 'Other'];
const HW027_STATUSES = ['not_submitted', 'submitted', 'approved', 'rejected'];

export default function SetupPage() {
  const { selectedLocationId, setSelectedLocationId } = useLocationStore();
  const [currentStep, setCurrentStep] = useState<WizardStep>('site');
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Site form state
  const [siteName, setSiteName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [suburb, setSuburb] = useState('');
  const [state, setState] = useState('');
  const [postcode, setPostcode] = useState('');

  // Provider form state
  const [providerNumber, setProviderNumber] = useState('');
  const [providerType, setProviderType] = useState('GP');
  const [verifyResult, setVerifyResult] = useState<Record<string, unknown> | null>(null);

  // Load setup status when a location is selected
  const loadSetupStatus = useCallback(async (locationId: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${env.apiUrl}/api/locations/${locationId}/setup-status`);
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
      const data: SetupStatus = await res.json();
      setSetupStatus(data);

      // Pre-fill form from existing data
      if (data.location) {
        setSiteName(data.location.name);
        setAddressLine1(data.location.address_line_1);
        setSuburb(data.location.suburb);
        setState(data.location.state);
        setPostcode(data.location.postcode);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load setup status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedLocationId) {
      loadSetupStatus(selectedLocationId);
    }
  }, [selectedLocationId, loadSetupStatus]);

  // Step 1: Create location
  const handleCreateSite = useCallback(async () => {
    if (!siteName.trim()) {
      setError('Site name is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${env.apiUrl}/api/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: siteName,
          address_line_1: addressLine1,
          suburb,
          state,
          postcode,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(body.detail || `Creation failed: ${res.status}`);
      }
      const location: Location = await res.json();
      setSelectedLocationId(location.id);
      await loadSetupStatus(location.id);
      setCurrentStep('provider');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create location');
    } finally {
      setLoading(false);
    }
  }, [siteName, addressLine1, suburb, state, postcode, setSelectedLocationId, loadSetupStatus]);

  // Step 2: Link provider
  const handleLinkProvider = useCallback(async () => {
    if (!providerNumber.trim() || providerNumber.length < 6 || providerNumber.length > 8) {
      setError('Provider number must be 6-8 characters');
      return;
    }
    if (!selectedLocationId) {
      setError('No location selected');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${env.apiUrl}/api/providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: selectedLocationId,
          provider_number: providerNumber,
          provider_type: providerType,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(body.detail || `Linking failed: ${res.status}`);
      }
      await loadSetupStatus(selectedLocationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link provider');
    } finally {
      setLoading(false);
    }
  }, [providerNumber, providerType, selectedLocationId, loadSetupStatus]);

  // Verify provider AIR access
  const handleVerifyProvider = useCallback(
    async (providerId: number) => {
      setLoading(true);
      setError(null);
      setVerifyResult(null);
      try {
        const res = await fetch(`${env.apiUrl}/api/providers/${providerId}/verify`, {
          method: 'POST',
        });
        if (!res.ok) throw new Error(`Verification failed: ${res.status}`);
        const data = await res.json();
        setVerifyResult(data);
        if (selectedLocationId) {
          await loadSetupStatus(selectedLocationId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Verification failed');
      } finally {
        setLoading(false);
      }
    },
    [selectedLocationId, loadSetupStatus],
  );

  // Update HW027 status
  const handleHW027Update = useCallback(
    async (providerId: number, newStatus: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${env.apiUrl}/api/providers/${providerId}/hw027`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hw027_status: newStatus }),
        });
        if (!res.ok) throw new Error(`Update failed: ${res.status}`);
        if (selectedLocationId) {
          await loadSetupStatus(selectedLocationId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update HW027 status');
      } finally {
        setLoading(false);
      }
    },
    [selectedLocationId, loadSetupStatus],
  );

  const goTo = (step: WizardStep) => {
    setError(null);
    setCurrentStep(step);
  };

  // Step indicator
  const stepIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Site Setup</h2>

      {/* Step indicator */}
      <div className="flex gap-2">
        {STEPS.map((step, i) => {
          const isComplete =
            setupStatus?.steps &&
            ((step.key === 'site' && setupStatus.steps.siteDetails.complete) ||
              (step.key === 'provider' && setupStatus.steps.providerLinked.complete) ||
              (step.key === 'hw027' && setupStatus.steps.hw027.complete) ||
              (step.key === 'proda' && setupStatus.steps.prodaLink.complete));

          return (
            <button
              key={step.key}
              onClick={() => goTo(step.key)}
              className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                i === stepIndex
                  ? 'border-emerald-500 bg-emerald-600/20 text-emerald-400'
                  : isComplete
                    ? 'border-emerald-700/50 bg-emerald-900/10 text-emerald-600'
                    : 'border-slate-600 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <span className="font-medium">
                {i + 1}. {step.label}
              </span>
              {isComplete && <span className="ml-1 text-emerald-500">&#10003;</span>}
            </button>
          );
        })}
      </div>

      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-400">{error}</p>
        </Card>
      )}

      {/* Step 1: Site Details */}
      {currentStep === 'site' && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Site Details</CardTitle>
          </CardHeader>
          <p className="mb-4 text-sm text-slate-400">
            Create your healthcare location. Once you link a provider number in the next step,
            a Minor ID (WRR#####) will be assigned for AIR submissions.
          </p>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Site Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g., Main Street Pharmacy"
                className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                data-testid="site-name"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Address</label>
              <input
                type="text"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="Street address"
                className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Suburb</label>
                <input
                  type="text"
                  value={suburb}
                  onChange={(e) => setSuburb(e.target.value)}
                  className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">State</label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Select</option>
                  {STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
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
                  className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            {!setupStatus?.location ? (
              <Button onClick={handleCreateSite} disabled={loading}>
                {loading ? 'Creating...' : 'Create Site'}
              </Button>
            ) : (
              <Button onClick={() => goTo('provider')}>Next: Provider Number</Button>
            )}
          </div>
        </Card>
      )}

      {/* Step 2: Provider Number */}
      {currentStep === 'provider' && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Provider Number</CardTitle>
          </CardHeader>
          <p className="mb-4 text-sm text-slate-400">
            Link your AIR provider number. A Minor ID (WRR#####) will be automatically assigned
            and used as the dhs-auditId for AIR submissions.
          </p>

          {setupStatus?.providers && setupStatus.providers.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-sm font-medium text-slate-300">Linked Providers:</p>
              {setupStatus.providers.map((p) => (
                <div
                  key={p.id}
                  className="rounded-md border border-slate-600 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-sm text-emerald-400">{p.provider_number}</span>
                      <span className="ml-2 text-xs text-slate-400">({p.provider_type})</span>
                      {p.air_access_list && (
                        <span className="ml-2 text-xs text-emerald-600">Verified</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleVerifyProvider(p.id)}
                      disabled={loading}
                    >
                      Verify AIR Access
                    </Button>
                  </div>
                  <div className="mt-2 rounded bg-slate-700/50 px-2 py-1">
                    <span className="text-xs text-slate-400">Minor ID: </span>
                    <span className="font-mono text-sm font-medium text-emerald-400">{p.minor_id}</span>
                    <span className="ml-2 text-xs text-slate-500">(use this on HW027 form)</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {verifyResult && (
            <div className="mb-4 rounded-md border border-slate-600 bg-slate-700/50 p-3">
              <p className="mb-1 text-sm font-medium text-slate-300">AIR Access List:</p>
              {verifyResult.status === 'success' && Array.isArray(verifyResult.accessList) ? (
                <ul className="space-y-1">
                  {(verifyResult.accessList as Array<{ accessTypeCode: string; accessTypeDescription: string }>).map(
                    (item) => (
                      <li key={item.accessTypeCode} className="text-xs text-slate-400">
                        <span className="font-mono text-emerald-400">
                          {item.accessTypeCode}
                        </span>{' '}
                        &mdash; {item.accessTypeDescription}
                      </li>
                    ),
                  )}
                </ul>
              ) : (
                <p className="text-xs text-red-400">
                  {String(verifyResult.error || 'Verification returned no access list')}
                </p>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Provider Number <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={providerNumber}
                onChange={(e) => setProviderNumber(e.target.value)}
                placeholder="e.g., 1234567A"
                maxLength={8}
                className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                data-testid="provider-number-input"
              />
              <p className="mt-1 text-xs text-slate-500">
                Medicare or AIR provider number (6-8 characters)
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Provider Type</label>
              <select
                value={providerType}
                onChange={(e) => setProviderType(e.target.value)}
                className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                {PROVIDER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-between">
            <Button variant="secondary" onClick={() => goTo('site')}>
              Back
            </Button>
            <div className="flex gap-2">
              <Button onClick={handleLinkProvider} disabled={loading}>
                {loading ? 'Linking...' : 'Link Provider'}
              </Button>
              {setupStatus?.steps.providerLinked.complete && (
                <Button onClick={() => goTo('hw027')}>Next: HW027</Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: HW027 Form Guidance */}
      {currentStep === 'hw027' && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: HW027 Form</CardTitle>
          </CardHeader>
          <p className="mb-4 text-sm text-slate-400">
            Health professionals must submit form HW027 to Services Australia to link their provider
            number to their assigned Minor ID. This is an external process.
          </p>

          <div className="mb-4 rounded-md border border-slate-600 bg-slate-700/50 p-4 text-sm text-slate-300">
            <p className="mb-2 font-medium">What to do:</p>
            <ol className="list-inside list-decimal space-y-1 text-slate-400">
              <li>Download or obtain an HW027 form from Services Australia</li>
              <li>Fill in the provider number and their assigned Minor ID (shown below)</li>
              <li>Submit to Services Australia for processing</li>
              <li>Update the status below once submitted/approved</li>
            </ol>
          </div>

          {setupStatus?.providers && setupStatus.providers.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-300">Provider HW027 Status:</p>
              {setupStatus.providers.map((p) => (
                <div
                  key={p.id}
                  className="rounded-md border border-slate-600 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-sm text-slate-300">{p.provider_number}</span>
                      <span className="mx-2 text-slate-500">&rarr;</span>
                      <span className="font-mono text-sm font-medium text-emerald-400">{p.minor_id}</span>
                    </div>
                    <select
                      value={p.hw027_status}
                      onChange={(e) => handleHW027Update(p.id, e.target.value)}
                      className="rounded-md border border-slate-600 bg-slate-700 px-2 py-1 text-sm text-slate-200"
                      disabled={loading}
                    >
                      {HW027_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex justify-between">
            <Button variant="secondary" onClick={() => goTo('provider')}>
              Back
            </Button>
            <Button onClick={() => goTo('proda')}>Next: PRODA Link</Button>
          </div>
        </Card>
      )}

      {/* Step 4: PRODA Linking & Summary */}
      {currentStep === 'proda' && (
        <Card>
          <CardHeader>
            <CardTitle>Step 4: PRODA Linking & Verification</CardTitle>
          </CardHeader>
          <p className="mb-4 text-sm text-slate-400">
            After completing the PRODA UI linking process (Steps 7-8 from the Minor ID guide), your
            first successful submission will automatically activate the link.
          </p>

          <div className="mb-4 rounded-md border border-slate-600 bg-slate-700/50 p-4 text-sm text-slate-300">
            <p className="mb-2 font-medium">PRODA Linking Process:</p>
            <ol className="list-inside list-decimal space-y-1 text-slate-400">
              <li>Log in to the PRODA portal</li>
              <li>Navigate to Organisation &gt; Manage Services</li>
              <li>Link the AIR service to your organisation</li>
              <li>Your first successful AIR submission will confirm the link</li>
            </ol>
          </div>

          <div className="mb-4 rounded-md border border-slate-600 p-3">
            <p className="text-sm text-slate-300">
              PRODA Link Status:{' '}
              <span
                className={`font-medium ${
                  setupStatus?.steps.prodaLink.status === 'linked'
                    ? 'text-emerald-400'
                    : 'text-yellow-400'
                }`}
              >
                {setupStatus?.steps.prodaLink.status || 'pending'}
              </span>
            </p>
          </div>

          {/* Setup Summary */}
          <div className="mt-6">
            <p className="mb-3 text-sm font-medium text-slate-300">Setup Summary:</p>
            <div className="space-y-2">
              {STEPS.map((step) => {
                const isComplete =
                  setupStatus?.steps &&
                  ((step.key === 'site' && setupStatus.steps.siteDetails.complete) ||
                    (step.key === 'provider' && setupStatus.steps.providerLinked.complete) ||
                    (step.key === 'hw027' && setupStatus.steps.hw027.complete) ||
                    (step.key === 'proda' && setupStatus.steps.prodaLink.complete));

                return (
                  <div
                    key={step.key}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span
                      className={
                        isComplete ? 'text-emerald-400' : 'text-slate-500'
                      }
                    >
                      {isComplete ? '\u2713' : '\u25CB'}
                    </span>
                    <span className={isComplete ? 'text-slate-200' : 'text-slate-400'}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {setupStatus?.setupComplete && (
            <div className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
              <p className="text-sm font-medium text-emerald-400">
                Setup complete! Your site is ready for AIR submissions.
              </p>
            </div>
          )}

          <div className="mt-4 flex justify-between">
            <Button variant="secondary" onClick={() => goTo('hw027')}>
              Back
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
