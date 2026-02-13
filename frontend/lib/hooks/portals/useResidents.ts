import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Resident, NewResident } from '@/types/portals';

export function useResidents(facilityId?: number, status?: string) {
  const params = new URLSearchParams();
  if (facilityId) params.set('facilityId', String(facilityId));
  if (status) params.set('status', status);
  const qs = params.toString();

  return useQuery<Resident[]>({
    queryKey: ['portals', 'residents', facilityId, status],
    queryFn: async () => {
      const res = await fetch(`/api/v1/portals/residents${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch residents');
      return res.json();
    },
  });
}

export function useAddResident() {
  const queryClient = useQueryClient();

  return useMutation<Resident, Error, NewResident>({
    mutationFn: async (resident) => {
      const res = await fetch('/api/v1/portals/residents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resident),
      });
      if (!res.ok) throw new Error('Failed to add resident');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portals', 'residents'] });
    },
  });
}

export function useAddResidentsBulk() {
  const queryClient = useQueryClient();

  return useMutation<Resident[], Error, NewResident[]>({
    mutationFn: async (residents) => {
      const res = await fetch('/api/v1/portals/residents/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ residents }),
      });
      if (!res.ok) throw new Error('Failed to add residents in bulk');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portals', 'residents'] });
    },
  });
}
