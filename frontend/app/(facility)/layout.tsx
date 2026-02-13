'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { PortalSidebar } from '@/components/portals/PortalSidebar';
import { PortalHeader } from '@/components/portals/PortalHeader';
import { Activity, Calendar, Users, Syringe, Upload, Building2 } from 'lucide-react';
import { NOTIFICATIONS } from '@/lib/mock/portal-data';
import type { NotificationItem } from '@/types/portals';

const NAV_ITEMS = [
  { id: 'facility-dashboard', label: 'Dashboard', icon: Activity, hint: 'Overview & alerts' },
  { id: 'facility-clinics', label: 'Clinics', icon: Calendar, hint: 'Book & manage clinics' },
  { id: 'facility-residents', label: 'Residents', icon: Users, hint: 'View all residents' },
  { id: 'facility-eligibility', label: 'Eligibility', icon: Syringe, hint: 'Who needs vaccines' },
  { id: 'facility-upload', label: 'Upload', icon: Upload, hint: 'Import spreadsheets' },
];

const PAGE_LABELS: Record<string, string> = {
  'facility-dashboard': 'Dashboard',
  'facility-clinics': 'Clinics',
  'facility-residents': 'Residents',
  'facility-eligibility': 'Eligibility',
  'facility-upload': 'Upload',
};

export default function FacilityLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user, checkAuth } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>(NOTIFICATIONS);

  const activeTab = NAV_ITEMS.find(item => pathname.startsWith(`/${item.id}`))?.id ?? 'facility-dashboard';
  const currentPage = PAGE_LABELS[activeTab] ?? 'Dashboard';

  useEffect(() => { checkAuth(); }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const allowedRoles = ['facility_staff', 'org_admin', 'super_admin'];
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

  return (
    <div className="flex min-h-screen" style={{ background: '#f8f9fb' }}>
      <PortalSidebar
        brandName="AIR Connect"
        brandSubtitle="NURSING HOME"
        brandIcon={Building2}
        accentColor="#3B6CE7"
        navItems={NAV_ITEMS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        user={{
          initials: user ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}` : 'FM',
          name: user ? `${user.first_name} ${user.last_name}` : 'Facility Manager',
          role: 'Facility Manager',
        }}
        facilityInfo={{ name: 'Sunny Acres Aged Care', address: 'Melbourne, VIC 3000' }}
      />
      <div className="flex flex-1 flex-col">
        <PortalHeader
          brandName="AIR Connect"
          currentPage={currentPage}
          accentColor="#3B6CE7"
          notifications={notifications}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
          user={{
            initials: user ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}` : 'FM',
            name: user ? `${user.first_name} ${user.last_name}` : 'Facility Manager',
          }}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
