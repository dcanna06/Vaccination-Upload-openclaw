import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NotificationItem } from '@/types/portals';

export function useNotifications() {
  return useQuery<NotificationItem[]>({
    queryKey: ['portals', 'notifications'],
    queryFn: async () => {
      const res = await fetch('/api/v1/portals/notifications');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    },
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/v1/portals/notifications/${id}/read`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Failed to mark notification as read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portals', 'notifications'] });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const res = await fetch('/api/v1/portals/notifications/read-all', {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Failed to mark all notifications as read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portals', 'notifications'] });
    },
  });
}
