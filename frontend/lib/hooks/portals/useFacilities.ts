import { useQuery } from '@tanstack/react-query';
import type { Facility } from '@/types/portals';

export function useFacilities() {
  return useQuery<Facility[]>({
    queryKey: ['portals', 'facilities'],
    queryFn: async () => {
      const res = await fetch('/api/v1/portals/facilities');
      if (!res.ok) throw new Error('Failed to fetch facilities');
      return res.json();
    },
  });
}
