'use client';

import React from 'react';

interface StatTileProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  subtitle?: string;
}

export function StatTile({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
  subtitle,
}: StatTileProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: bgColor }}
        >
          <span style={{ color }}>
            <Icon className="h-5 w-5" />
          </span>
        </div>
        <div>
          <div className="text-xs font-medium uppercase text-gray-500">{label}</div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          {subtitle && (
            <div className="text-sm text-gray-500">{subtitle}</div>
          )}
        </div>
      </div>
    </div>
  );
}
