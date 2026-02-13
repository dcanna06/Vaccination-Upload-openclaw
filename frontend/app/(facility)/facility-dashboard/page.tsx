'use client';

import { useRouter } from 'next/navigation';
import { StatTile } from '@/components/portals/StatTile';
import { QuickActionCard } from '@/components/portals/QuickActionCard';
import { Pill } from '@/components/portals/Pill';
import { Users, Calendar, Syringe, ClipboardCheck, ListPlus, CalendarPlus, Settings, ChevronRight } from 'lucide-react';
import { RESIDENTS, CLINICS, getFacilityResidents, getFacilityClinics, countDueVaccines, countPendingConsents } from '@/lib/mock/portal-data';
import { useAuthStore } from '@/stores/authStore';

const FACILITY_ID = 2; // Sunny Acres (user's assigned facility)

export default function FacilityDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const residents = getFacilityResidents(FACILITY_ID).filter(r => r.status === 'active');
  const clinics = getFacilityClinics(FACILITY_ID).filter(c => c.status === 'upcoming');
  const firstName = user?.first_name ?? 'there';

  const totalDue = residents.reduce((sum, r) => {
    const { due, overdue } = countDueVaccines(r);
    return sum + due + overdue;
  }, 0);
  const totalOverdue = residents.reduce((sum, r) => countDueVaccines(r).overdue + sum, 0);
  const pendingConsents = countPendingConsents(clinics);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good morning, {firstName}</h1>
        <p className="text-gray-500">Here is what is happening at Sunny Acres Aged Care today.</p>
      </div>

      {/* Task Cards */}
      <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' }}>
        <div className="grid grid-cols-3 gap-4">
          <QuickActionCard
            title="Update Resident List"
            subtitle="Add or manage your residents"
            icon={ListPlus}
            iconBgColor="#f3e8ff"
            iconColor="#7c3aed"
            onClick={() => router.push('/facility-residents')}
          />
          <QuickActionCard
            title="Book a New Clinic"
            subtitle="Schedule a vaccination session"
            icon={CalendarPlus}
            iconBgColor="#ecfdf5"
            iconColor="#047857"
            onClick={() => router.push('/facility-clinics')}
          />
          <QuickActionCard
            title="Manage Existing Clinic"
            subtitle="Consents, residents, details"
            icon={Settings}
            iconBgColor="#fff7ed"
            iconColor="#c2410c"
            onClick={() => router.push('/facility-clinics')}
          />
        </div>
      </div>

      {/* Stat Tiles */}
      <div className="grid grid-cols-4 gap-4">
        <StatTile
          label="Total Residents"
          value={residents.length}
          icon={Users}
          color="#3B6CE7"
          bgColor="#eff6ff"
        />
        <StatTile
          label="Upcoming Clinics"
          value={clinics.length}
          icon={Calendar}
          color="#047857"
          bgColor="#ecfdf5"
        />
        <StatTile
          label="Vaccines Due"
          value={totalDue}
          icon={Syringe}
          color="#c2410c"
          bgColor="#fff7ed"
          subtitle={totalOverdue > 0 ? `${totalOverdue} overdue` : undefined}
        />
        <StatTile
          label="Consents Required"
          value={pendingConsents}
          icon={ClipboardCheck}
          color={pendingConsents > 0 ? '#b91c1c' : '#047857'}
          bgColor={pendingConsents > 0 ? '#fef2f2' : '#ecfdf5'}
        />
      </div>

      {/* Upcoming Clinics */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Clinics</h2>
          <button
            onClick={() => router.push('/facility-clinics')}
            className="flex items-center gap-1 text-sm font-medium"
            style={{ color: '#3B6CE7' }}
          >
            See all <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {clinics.length === 0 ? (
          <p className="text-sm text-gray-500">No upcoming clinics scheduled.</p>
        ) : (
          <div className="space-y-3">
            {clinics.map(clinic => {
              const d = new Date(clinic.clinicDate);
              const day = d.getDate();
              const month = d.toLocaleDateString('en-AU', { month: 'short' });
              return (
                <div key={clinic.id} className="flex items-center gap-4 rounded-xl border border-gray-100 p-4 hover:bg-gray-50">
                  <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-blue-50">
                    <span className="text-lg font-bold" style={{ color: '#3B6CE7' }}>{day}</span>
                    <span className="text-[10px] font-medium uppercase text-gray-500">{month}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{clinic.name}</p>
                    <p className="text-sm text-gray-500">{clinic.timeRange} &middot; {clinic.location}</p>
                  </div>
                  <div className="flex gap-2">
                    {clinic.vaccines.map(v => (
                      <Pill key={v} color="blue">{v}</Pill>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
