import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Clinic } from '@/types/portals';

export function useClinics(facilityId?: number, status?: string) {
  const params = new URLSearchParams();
  if (facilityId) params.set('facilityId', String(facilityId));
  if (status) params.set('status', status);
  const qs = params.toString();

  return useQuery<Clinic[]>({
    queryKey: ['portals', 'clinics', facilityId, status],
    queryFn: async () => {
      const res = await fetch(`/api/v1/portals/clinics${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch clinics');
      return res.json();
    },
  });
}

export function useCreateClinic() {
  const queryClient = useQueryClient();

  return useMutation<
    Clinic,
    Error,
    Omit<Clinic, 'id' | 'residents'>
  >({
    mutationFn: async (clinic) => {
      const res = await fetch('/api/v1/portals/clinics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clinic),
      });
      if (!res.ok) throw new Error('Failed to create clinic');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portals', 'clinics'] });
    },
  });
}

export function useUpdateConsent() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { clinicId: number; residentId: number; vaccine: string; consent: boolean | null }
  >({
    mutationFn: async ({ clinicId, residentId, vaccine, consent }) => {
      const res = await fetch(
        `/api/v1/portals/clinics/${clinicId}/consent`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ residentId, vaccine, consent }),
        },
      );
      if (!res.ok) throw new Error('Failed to update consent');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portals', 'clinics'] });
    },
  });
}
