'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { PortalSidebar } from '@/components/portals/PortalSidebar';
import { PortalHeader } from '@/components/portals/PortalHeader';
import { Activity, Calendar, Users, Clock, MessageSquare, Syringe } from 'lucide-react';
import { NOTIFICATIONS, MESSAGES } from '@/lib/mock/portal-data';
import type { NotificationItem } from '@/types/portals';

const unreadMessageCount = (() => {
  const facilityIds = [...new Set(MESSAGES.map(m => m.facilityId))];
  let count = 0;
  for (const fid of facilityIds) {
    const thread = MESSAGES.filter(m => m.facilityId === fid);
    const last = thread[thread.length - 1];
    if (last && last.senderRole !== 'pharmacist') count++;
  }
  return count;
})();

const NAV_ITEMS = [
  { id: 'pharm-dashboard', label: 'Dashboard', icon: Activity, hint: 'Overview & stats' },
  { id: 'pharm-clinics', label: 'My Clinics', icon: Calendar, hint: 'All facility clinics' },
  { id: 'pharm-residents', label: 'Residents', icon: Users, hint: 'Cross-facility residents' },
  { id: 'pharm-availability', label: 'Availability', icon: Clock, hint: 'Calendar & schedule' },
  { id: 'pharm-messages', label: 'Messages', icon: MessageSquare, hint: 'Facility threads', badge: unreadMessageCount },
];

const PAGE_LABELS: Record<string, string> = {
  'pharm-dashboard': 'Dashboard',
  'pharm-clinics': 'My Clinics',
  'pharm-residents': 'Residents',
  'pharm-availability': 'Availability',
  'pharm-messages': 'Messages',
};

export default function PharmacistLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user, checkAuth } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>(NOTIFICATIONS);

  const activeTab = NAV_ITEMS.find(item => pathname.startsWith(`/${item.id}`))?.id ?? 'pharm-dashboard';
  const currentPage = PAGE_LABELS[activeTab] ?? 'Dashboard';

  useEffect(() => { checkAuth(); }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const allowedRoles = ['pharmacist', 'org_admin', 'super_admin'];
      if (!allowedRoles.includes(user.role)) {
        const roleHome: Record<string, string> = {
          facility_staff: '/facility-dashboard',
          pharmacist: '/pharm-dashboard',
          nurse_manager: '/nm-dashboard',
        };
        router.push(roleHome[user.role] || '/login');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#f8f9fb' }}>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const handleTabChange = (id: string) => {
    router.push(`/${id}`);
  };

  const handleMarkRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const userInitials = user ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}` : 'SC';
  const userName = user ? `${user.first_name} ${user.last_name}` : 'Dr. Sarah Chen';

  return (
    <div className="flex min-h-screen" style={{ background: '#f8f9fb' }}>
      <PortalSidebar
        brandName="VaxManager"
        brandSubtitle="Pharmacist Portal"
        brandIcon={Syringe}
        accentColor="#3B6CE7"
        navItems={NAV_ITEMS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        user={{
          initials: userInitials,
          name: userName,
          role: 'Pharmacist',
        }}
        switchLink={{ label: 'Switch to AIR Upload \u2192', href: '/upload' }}
      />
      <div className="flex flex-1 flex-col">
        <PortalHeader
          brandName="VaxManager"
          currentPage={currentPage}
          accentColor="#3B6CE7"
          notifications={notifications}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
          user={{
            initials: userInitials,
            name: userName,
          }}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
