'use client';

import type { EpisodeResult } from '@/types/submission';

interface EpisodePillProps {
  episode: EpisodeResult;
}

export function EpisodePill({ episode }: EpisodePillProps) {
  const isValid = episode.status === 'VALID';

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        isValid
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
          : 'bg-red-500/15 text-red-400 border border-red-500/30'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isValid ? 'bg-emerald-400' : 'bg-red-400'}`} />
      <span>{episode.vaccine || `Episode ${episode.id}`}</span>
      <span className="text-slate-500">|</span>
      <span className="font-mono">{episode.code}</span>
    </div>
  );
}
