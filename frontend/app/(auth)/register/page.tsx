'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { env } from '@/lib/env';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    ahpra_number: '',
    password: '',
    confirm_password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${env.apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone || null,
          ahpra_number: form.ahpra_number || null,
          password: form.password,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: 'Registration failed' }));
        const msg = data.message || data.error || data.detail;
        setError(typeof msg === 'string' ? msg : 'Registration failed');
        setIsLoading(false);
        return;
      }

      router.push('/login?registered=1');
    } catch {
      setError('Network error');
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md rounded-lg bg-slate-800 p-8 shadow-xl">
        <h1 className="mb-2 text-2xl font-bold text-emerald-400">
          Create Account
        </h1>
        <p className="mb-6 text-sm text-slate-400">
          Register for AIR Bulk Vaccination Upload
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className="mb-1 block text-sm text-slate-300">
                First Name
              </label>
              <input
                id="first_name"
                type="text"
                required
                value={form.first_name}
                onChange={(e) => updateField('first_name', e.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="last_name" className="mb-1 block text-sm text-slate-300">
                Last Name
              </label>
              <input
                id="last_name"
                type="text"
                required
                value={form.last_name}
                onChange={(e) => updateField('last_name', e.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-slate-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="phone" className="mb-1 block text-sm text-slate-300">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
              placeholder="04XX XXX XXX"
            />
          </div>

          <div>
            <label htmlFor="ahpra_number" className="mb-1 block text-sm text-slate-300">
              AHPRA Number
            </label>
            <input
              id="ahpra_number"
              type="text"
              value={form.ahpra_number}
              onChange={(e) => updateField('ahpra_number', e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
              placeholder="MED0001234567"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-slate-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={12}
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
              placeholder="Min 12 characters"
            />
          </div>

          <div>
            <label htmlFor="confirm_password" className="mb-1 block text-sm text-slate-300">
              Confirm Password
            </label>
            <input
              id="confirm_password"
              type="password"
              required
              minLength={12}
              value={form.confirm_password}
              onChange={(e) => updateField('confirm_password', e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
              placeholder="Re-enter password"
            />
          </div>

          {error && (
            <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
