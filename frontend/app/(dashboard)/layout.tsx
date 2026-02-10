'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { LocationSelector } from '@/components/layout/LocationSelector';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-6 py-4">
          <h1 className="text-xl font-semibold text-emerald-400">
            AIR Bulk Vaccination Upload
          </h1>
          <LocationSelector />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
