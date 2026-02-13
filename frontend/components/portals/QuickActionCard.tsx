'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';

interface QuickActionCardProps {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBgColor: string;
  iconColor: string;
  onClick: () => void;
}

export function QuickActionCard({
  title,
  subtitle,
  icon: Icon,
  iconBgColor,
  iconColor,
  onClick,
}: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left transition-shadow hover:shadow-md cursor-pointer"
    >
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: iconBgColor }}
      >
        <span style={{ color: iconColor }}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900">{title}</div>
        <div className="text-sm text-gray-500">{subtitle}</div>
      </div>
      <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400" />
    </button>
  );
}
