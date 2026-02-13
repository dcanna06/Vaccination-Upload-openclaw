'use client';

import React from 'react';

interface PillProps {
  color: 'green' | 'orange' | 'red' | 'blue' | 'purple' | 'gray' | 'teal';
  children: React.ReactNode;
}

const colorMap: Record<PillProps['color'], string> = {
  green: 'bg-emerald-50 text-emerald-700',
  orange: 'bg-orange-50 text-orange-700',
  red: 'bg-red-50 text-red-700',
  blue: 'bg-blue-50 text-blue-700',
  purple: 'bg-violet-50 text-violet-700',
  gray: 'bg-gray-100 text-gray-600',
  teal: 'bg-teal-50 text-teal-700',
};

export function Pill({ color, children }: PillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorMap[color]}`}
    >
      {children}
    </span>
  );
}
