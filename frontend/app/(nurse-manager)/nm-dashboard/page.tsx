'use client';

import { useRouter } from 'next/navigation';
import { StatTile } from '@/components/portals/StatTile';
import { QuickActionCard } from '@/components/portals/QuickActionCard';
import { Pill } from '@/components/portals/Pill';
import {
  Building2,
  Users,
  Calendar,
  Syringe,
  ClipboardCheck,
  Plus,
  CalendarPlus,
  FileBarChart,
  ChevronRight,
  MapPin,
  Phone,
} from 'lucide-react';
import {
  FACILITIES,
  RESIDENTS,
  CLINICS,
  countDueVaccines,
  countPendingConsents,
  getFacilityResidents,
  getFacilityClinics,
} from '@/lib/mock/portal-data';
import { useAuthStore } from '@/stores/authStore';

const ACCENT = '#7c3aed';

export default function NMDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const firstName = user?.first_name ?? 'Lisa';

  const activeFacilities = FACILITIES.filter(f => f.status === 'active');
  const activeResidents = RESIDENTS.filter(r => r.status === 'active');
  const upcomingClinics = CLINICS.filter(c => c.status === 'upcoming');

  const totalOverdue = activeResidents.reduce(
    (sum, r) => sum + countDueVaccines(r).overdue,
    0,
  );

  const pendingConsents = countPendingConsents(upcomingClinics);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good morning, {firstName}</h1>
        <p className="text-gray-500">Here is what is happening across your facilities.</p>
      </div>

      {/* Stat Tiles */}
      <div className="grid grid-cols-5 gap-4">
        <StatTile
          label="Active Facilities"
          value={activeFacilities.length}
          icon={Building2}
          color="#7c3aed"
          bgColor="#f5f3ff"
        />
        <StatTile
          label="Total Residents"
          value={activeResidents.length}
          icon={Users}
          color="#3b82f6"
          bgColor="#eff6ff"
        />
        <StatTile
          label="Upcoming Clinics"
          value={upcomingClinics.length}
          icon={Calendar}
          color="#047857"
          bgColor="#ecfdf5"
        />
        <StatTile
          label="Vaccines Overdue"
          value={totalOverdue}
          icon={Syringe}
          color="#dc2626"
          bgColor="#fef2f2"
        />
        <StatTile
          label="Consents Pending"
          value={pendingConsents}
          icon={ClipboardCheck}
          color="#ea580c"
          bgColor="#fff7ed"
        />
      </div>

      {/* Quick Actions */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' }}
      >
        <div className="grid grid-cols-3 gap-4">
          <QuickActionCard
            title="Add New Facility"
            subtitle="Register a new aged care facility"
            icon={Plus}
            iconBgColor="#ede9fe"
            iconColor="#7c3aed"
            onClick={() => router.push('/nm-facilities')}
          />
          <QuickActionCard
            title="Book a Clinic"
            subtitle="Schedule a vaccination session"
            icon={CalendarPlus}
            iconBgColor="#ede9fe"
            iconColor="#7c3aed"
            onClick={() => router.push('/nm-clinics')}
          />
          <QuickActionCard
            title="Run Eligibility Report"
            subtitle="View cross-facility eligibility"
            icon={FileBarChart}
            iconBgColor="#ede9fe"
            iconColor="#7c3aed"
            onClick={() => router.push('/nm-eligibility')}
          />
        </div>
      </div>

      {/* Facility Summary Cards */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Facility Overview</h2>
        <div className="grid grid-cols-2 gap-4">
          {activeFacilities.map(facility => {
            const residents = getFacilityResidents(facility.id).filter(r => r.status === 'active');
            const clinics = getFacilityClinics(facility.id).filter(c => c.status === 'upcoming');
            const nextClinic = clinics.sort((a, b) => a.clinicDate.localeCompare(b.clinicDate))[0];

            return (
              <div
                key={facility.id}
                className="rounded-2xl border border-gray-200 bg-white p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{facility.name}</h3>
                    <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="h-3.5 w-3.5" />
                      {facility.address}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                      <Phone className="h-3.5 w-3.5" />
                      {facility.contactPerson} &middot; {facility.contactPhone}
                    </div>
                  </div>
                  <Pill color="purple">{residents.length} residents</Pill>
                </div>

                {nextClinic ? (
                  <div className="mt-4 flex items-center gap-3 rounded-lg bg-violet-50 px-3 py-2">
                    <Calendar className="h-4 w-4 text-violet-600" />
                    <div className="flex-1 text-sm">
                      <span className="font-medium text-gray-900">{nextClinic.name}</span>
                      <span className="text-gray-500">
                        {' '}&middot; {new Date(nextClinic.clinicDate).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-400">
                    No upcoming clinics
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Clinics */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Clinics</h2>
          <button
            onClick={() => router.push('/nm-clinics')}
            className="flex items-center gap-1 text-sm font-medium"
            style={{ color: ACCENT }}
          >
            See all <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {upcomingClinics.length === 0 ? (
          <p className="text-sm text-gray-500">No upcoming clinics scheduled.</p>
        ) : (
          <div className="space-y-3">
            {upcomingClinics
              .sort((a, b) => a.clinicDate.localeCompare(b.clinicDate))
              .slice(0, 3)
              .map(clinic => {
                const d = new Date(clinic.clinicDate);
                const day = d.getDate();
                const month = d.toLocaleDateString('en-AU', { month: 'short' });
                const facility = FACILITIES.find(f => f.id === clinic.facilityId);

                return (
                  <div
                    key={clinic.id}
                    className="flex items-center gap-4 rounded-xl border border-gray-100 p-4 hover:bg-gray-50"
                  >
                    <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-violet-50">
                      <span className="text-lg font-bold" style={{ color: ACCENT }}>
                        {day}
                      </span>
                      <span className="text-[10px] font-medium uppercase text-gray-500">
                        {month}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{clinic.name}</p>
                      <p className="text-sm text-gray-500">
                        {clinic.timeRange} &middot; {clinic.location}
                      </p>
                    </div>
                    {facility && (
                      <Pill color="purple">{facility.name.split(' ')[0]}</Pill>
                    )}
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
