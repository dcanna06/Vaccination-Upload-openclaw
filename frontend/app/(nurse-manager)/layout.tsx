'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { PortalSidebar } from '@/components/portals/PortalSidebar';
import { PortalHeader } from '@/components/portals/PortalHeader';
import { Activity, Building2, Calendar, Users, Syringe, Upload, MessageSquare, Shield } from 'lucide-react';
import { NOTIFICATIONS, MESSAGES } from '@/lib/mock/portal-data';
import type { NotificationItem } from '@/types/portals';

const unreadMessageCount = (() => {
  const facilityIds = [...new Set(MESSAGES.map(m => m.facilityId))];
  let count = 0;
  for (const fid of facilityIds) {
    const thread = MESSAGES.filter(m => m.facilityId === fid);
    const last = thread[thread.length - 1];
    if (last && last.senderRole !== 'nurse_manager') count++;
  }
  return count;
})();

const NAV_ITEMS = [
  { id: 'nm-dashboard', label: 'Dashboard', icon: Activity, hint: 'Overview & stats' },
  { id: 'nm-facilities', label: 'Facilities', icon: Building2, hint: 'Manage facilities' },
  { id: 'nm-clinics', label: 'Clinics', icon: Calendar, hint: 'All facility clinics' },
  { id: 'nm-residents', label: 'Residents', icon: Users, hint: 'Cross-facility residents' },
  { id: 'nm-eligibility', label: 'Eligibility', icon: Syringe, hint: 'Vaccine eligibility' },
  { id: 'nm-upload', label: 'Upload', icon: Upload, hint: 'Import spreadsheets' },
  { id: 'nm-messages', label: 'Messages', icon: MessageSquare, hint: 'Facility threads', badge: unreadMessageCount },
];

const PAGE_LABELS: Record<string, string> = {
  'nm-dashboard': 'Dashboard',
  'nm-facilities': 'Facilities',
  'nm-clinics': 'Clinics',
  'nm-residents': 'Residents',
  'nm-eligibility': 'Eligibility',
  'nm-upload': 'Upload',
  'nm-messages': 'Messages',
};

export default function NurseManagerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user, checkAuth } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>(NOTIFICATIONS);

  const activeTab = NAV_ITEMS.find(item => pathname.startsWith(`/${item.id}`))?.id ?? 'nm-dashboard';
  const currentPage = PAGE_LABELS[activeTab] ?? 'Dashboard';

  useEffect(() => { checkAuth(); }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const allowedRoles = ['nurse_manager', 'org_admin', 'super_admin'];
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

  const userInitials = user ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}` : 'LC';
  const userName = user ? `${user.first_name} ${user.last_name}` : 'Lisa Chang';

  return (
    <div className="flex min-h-screen" style={{ background: '#f8f9fb' }}>
      <PortalSidebar
        brandName="VaxManager"
        brandSubtitle="Nurse Manager"
        brandIcon={Shield}
        accentColor="#7c3aed"
        navItems={NAV_ITEMS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        user={{
          initials: userInitials,
          name: userName,
          role: 'Nurse Manager',
        }}
        switchLink={{ label: 'Switch to AIR Upload \u2192', href: '/upload' }}
      />
      <div className="flex flex-1 flex-col">
        <PortalHeader
          brandName="VaxManager"
          currentPage={currentPage}
          accentColor="#7c3aed"
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
