'use client';

interface ResultsToolbarProps {
  counts: { total: number; success: number; warning: number; error: number };
  activeFilter: 'ALL' | 'SUCCESS' | 'WARNING' | 'ERROR';
  onFilterChange: (filter: 'ALL' | 'SUCCESS' | 'WARNING' | 'ERROR') => void;
  onExport?: () => void;
  onConfirmAll?: () => void;
  hasConfirmable: boolean;
}

const FILTERS = [
  { key: 'ALL' as const, label: 'All', countKey: 'total' as const, color: 'text-slate-100' },
  { key: 'SUCCESS' as const, label: 'Success', countKey: 'success' as const, color: 'text-emerald-400' },
  { key: 'WARNING' as const, label: 'Warnings', countKey: 'warning' as const, color: 'text-yellow-400' },
  { key: 'ERROR' as const, label: 'Errors', countKey: 'error' as const, color: 'text-red-400' },
];

export function ResultsToolbar({
  counts,
  activeFilter,
  onFilterChange,
  onExport,
  onConfirmAll,
  hasConfirmable,
}: ResultsToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      {/* Filter tabs */}
      <div className="flex rounded-lg bg-slate-800 border border-slate-700 p-1 gap-1">
        {FILTERS.map((f) => {
          const count = counts[f.countKey];
          const isActive = activeFilter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => onFilterChange(f.key)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <span>{f.label}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-xs font-mono ${
                isActive ? f.color : 'text-slate-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {hasConfirmable && onConfirmAll && (
          <button
            type="button"
            onClick={onConfirmAll}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Confirm All Warnings
          </button>
        )}
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-700 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export
          </button>
        )}
      </div>
    </div>
  );
}
