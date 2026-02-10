'use client';

import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

interface HubLink {
  href: string;
  label: string;
  description: string;
  accessCode?: string;
}

export default function IndividualDetailHub() {
  const params = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const individualId = params.id as string;
  const dob = searchParams.get('dob') || '';
  const provider = searchParams.get('provider') || '';

  const queryString = new URLSearchParams({
    identifier: individualId,
    ...(dob && { dob }),
    ...(provider && { provider }),
  }).toString();

  const hubLinks: HubLink[] = [
    {
      href: `/individuals/${encodeURIComponent(individualId)}/history?${queryString}`,
      label: 'Immunisation History',
      description: 'View immunisation history details, due vaccines, and editable encounters.',
      accessCode: 'HIST',
    },
    {
      href: `/individuals/${encodeURIComponent(individualId)}/statement?${queryString}`,
      label: 'History Statement',
      description: 'View the official immunisation history statement for this individual.',
      accessCode: 'STMT',
    },
    {
      href: `/individuals/${encodeURIComponent(individualId)}/vaccinetrial?${queryString}`,
      label: 'Vaccine Trial History',
      description: 'View vaccine clinical trial participation history.',
      accessCode: 'VTRL',
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Individual Details</h1>
        <Link
          href="/individuals"
          className="rounded-md bg-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-600"
        >
          New Search
        </Link>
      </div>

      <div className="rounded-md border border-slate-600 bg-slate-800/50 p-4">
        <p className="text-xs text-slate-500">Individual Identifier</p>
        <p className="text-sm font-mono text-slate-400 mt-1 break-all">
          {individualId.substring(0, 8)}...
        </p>
        {dob && (
          <p className="text-xs text-slate-500 mt-2">
            DOB: <span className="text-slate-400">{dob}</span>
          </p>
        )}
      </div>

      <div className="grid gap-4">
        {hubLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              'block rounded-lg border p-4 transition-colors',
              'border-slate-600 bg-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/80',
            )}
          >
            <h3 className="text-lg font-medium text-slate-100">{link.label}</h3>
            <p className="text-sm text-slate-400 mt-1">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
