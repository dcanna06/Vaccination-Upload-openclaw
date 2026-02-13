import { useQuery } from '@tanstack/react-query';
import type { VaccineEligibility } from '@/types/portals';

interface EligibilityResponse {
  residentId: number;
  eligibility: Record<string, VaccineEligibility>;
}

export function useEligibility(facilityId?: number, vaccines?: string[]) {
  const params = new URLSearchParams();
  if (facilityId) params.set('facilityId', String(facilityId));
  if (vaccines && vaccines.length > 0) params.set('vaccines', vaccines.join(','));
  const qs = params.toString();

  return useQuery<EligibilityResponse[]>({
    queryKey: ['portals', 'eligibility', facilityId, vaccines],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/portals/eligibility${qs ? `?${qs}` : ''}`,
      );
      if (!res.ok) throw new Error('Failed to fetch eligibility data');
      return res.json();
    },
  });
}
