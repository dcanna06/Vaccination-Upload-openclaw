'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { LocationSelector } from '@/components/layout/LocationSelector';
import { useAuthStore } from '@/stores/authStore';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, checkAuth, logout } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-6 py-4">
          <h1 className="text-xl font-semibold text-emerald-400">
            AIR Bulk Vaccination Upload
          </h1>
          <div className="flex items-center gap-4">
            <LocationSelector />
            {user && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">
                  {user.first_name} {user.last_name}
                </span>
                <button
                  onClick={logout}
                  className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
