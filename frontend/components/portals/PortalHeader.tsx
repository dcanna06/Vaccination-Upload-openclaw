'use client';

import React from 'react';
import { NotificationsDropdown } from './NotificationsDropdown';
import type { NotificationItem } from '@/types/portals';

interface HeaderProps {
  brandName: string;
  currentPage: string;
  accentColor: string;
  notifications: NotificationItem[];
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  user: { initials: string; name: string };
}

export function PortalHeader({
  brandName,
  currentPage,
  accentColor,
  notifications,
  onMarkRead,
  onMarkAllRead,
  user,
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <span className="text-gray-400">{brandName}</span>
        <span className="text-gray-300">&gt;</span>
        <span className="font-medium" style={{ color: accentColor }}>
          {currentPage}
        </span>
      </nav>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        <NotificationsDropdown
          notifications={notifications}
          onMarkRead={onMarkRead}
          onMarkAllRead={onMarkAllRead}
        />

        {/* User Avatar */}
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: accentColor }}
        >
          {user.initials}
        </div>
      </div>
    </header>
  );
}
