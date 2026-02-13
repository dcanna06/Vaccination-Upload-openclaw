'use client';

import React from 'react';
import Link from 'next/link';
import { LogOut } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  badge?: number;
}

interface SidebarProps {
  brandName: string;
  brandSubtitle: string;
  brandIcon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  navItems: NavItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  user: { initials: string; name: string; role: string };
  facilityInfo?: { name: string; address: string };
  switchLink?: { label: string; href: string };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 59, g: 108, b: 231 };
}

export function PortalSidebar({
  brandName,
  brandSubtitle,
  brandIcon: BrandIcon,
  accentColor,
  navItems,
  activeTab,
  onTabChange,
  user,
  facilityInfo,
  switchLink,
}: SidebarProps) {
  const rgb = hexToRgb(accentColor);
  const accentBg = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`;

  return (
    <aside className="flex w-56 flex-col bg-white border-r border-gray-200 h-full">
      {/* Brand Section */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: accentColor }}
          >
            <BrandIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900">{brandName}</div>
            <div className="text-xs text-gray-500">{brandSubtitle}</div>
          </div>
        </div>
      </div>

      {/* Facility Info */}
      {facilityInfo && (
        <div className="mx-4 mb-3 rounded-lg bg-gray-50 px-3 py-2.5">
          <div className="text-xs font-medium text-gray-700">{facilityInfo.name}</div>
          <div className="text-xs text-gray-500">{facilityInfo.address}</div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <li key={item.id}>
                <button
                  onClick={() => onTabChange(item.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors"
                  style={
                    isActive
                      ? { backgroundColor: accentBg, color: accentColor }
                      : undefined
                  }
                >
                  <span
                    className="flex-shrink-0"
                    style={isActive ? { color: accentColor } : { color: '#9ca3af' }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-sm font-medium ${
                        isActive ? '' : 'text-gray-700'
                      }`}
                      style={isActive ? { color: accentColor } : undefined}
                    >
                      {item.label}
                    </span>
                    {item.hint && (
                      <div className="text-xs text-gray-400 truncate">{item.hint}</div>
                    )}
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-gray-200 p-3">
        {/* Switch Link */}
        {switchLink && (
          <Link
            href={switchLink.href}
            className="mb-3 block rounded-lg px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            {switchLink.label}
          </Link>
        )}

        {/* User Card */}
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: accentColor }}
          >
            {user.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
            <div className="text-xs text-gray-500 truncate">{user.role}</div>
          </div>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
