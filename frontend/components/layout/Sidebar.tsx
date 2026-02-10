'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

interface NavItem {
  href: string;
  label: string;
}

const navItems: NavItem[] = [
  { href: '/upload', label: 'Upload' },
  { href: '/validate', label: 'Validate' },
  { href: '/submit', label: 'Submit' },
  { href: '/history', label: 'History' },
  { href: '/individuals', label: 'Individuals' },
  { href: '/confirm', label: 'Confirm' },
  { href: '/indicators', label: 'Indicators' },
  { href: '/catchup', label: 'Catch-Up' },
  { href: '/admin/locations', label: 'Locations' },
  { href: '/admin/providers', label: 'Providers' },
  { href: '/settings', label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex w-56 flex-col border-r border-slate-700 bg-slate-800 p-4">
      <ul className="space-y-1">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={clsx(
                'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                pathname === item.href || pathname.startsWith(item.href + '/')
                  ? 'bg-emerald-600/20 text-emerald-400'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-slate-100',
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
