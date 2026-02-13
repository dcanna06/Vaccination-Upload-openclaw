import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Message } from '@/types/portals';

export function useMessages(facilityId: number) {
  return useQuery<Message[]>({
    queryKey: ['portals', 'messages', facilityId],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/portals/messages?facilityId=${facilityId}`,
      );
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
    enabled: facilityId > 0,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation<
    Message,
    Error,
    { facilityId: number; body: string }
  >({
    mutationFn: async (payload) => {
      const res = await fetch('/api/v1/portals/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to send message');
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['portals', 'messages', variables.facilityId],
      });
    },
  });
}

export function useThreads() {
  return useQuery<Message[]>({
    queryKey: ['portals', 'threads'],
    queryFn: async () => {
      const res = await fetch('/api/v1/portals/messages/threads');
      if (!res.ok) throw new Error('Failed to fetch threads');
      return res.json();
    },
  });
}
