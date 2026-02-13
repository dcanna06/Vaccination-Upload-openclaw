'use client';

import { useRouter } from 'next/navigation';
import { StatTile } from '@/components/portals/StatTile';
import { Pill } from '@/components/portals/Pill';
import {
  Building2,
  Users,
  Calendar,
  ClipboardCheck,
  Syringe,
  ChevronRight,
} from 'lucide-react';
import {
  FACILITIES,
  RESIDENTS,
  CLINICS,
  countPendingConsents,
} from '@/lib/mock/portal-data';

export default function PharmDashboardPage() {
  const router = useRouter();

  const activeFacilities = FACILITIES.filter(f => f.status === 'active');
  const activeResidents = RESIDENTS.filter(r => r.status === 'active');
  const upcomingClinics = CLINICS.filter(c => c.status === 'upcoming');
  const pendingConsents = countPendingConsents(upcomingClinics);

  const vaccinesDue = activeResidents.reduce((sum, r) => {
    let count = 0;
    for (const v of Object.values(r.eligibility)) {
      if (v.isDue || v.isOverdue) count++;
    }
    return sum + count;
  }, 0);

  // Next 3 upcoming clinics sorted by date
  const nextClinics = [...upcomingClinics]
    .sort((a, b) => a.clinicDate.localeCompare(b.clinicDate))
    .slice(0, 3);

  // Facility summary: active facilities with their resident count + next clinic
  const facilitySummaries = activeFacilities.map(f => {
    const resCount = RESIDENTS.filter(r => r.facilityId === f.id && r.status === 'active').length;
    const nextClinic = upcomingClinics
      .filter(c => c.facilityId === f.id)
      .sort((a, b) => a.clinicDate.localeCompare(b.clinicDate))[0] ?? null;
    return { facility: f, resCount, nextClinic };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stat Tiles */}
      <div className="grid grid-cols-5 gap-4">
        <StatTile
          label="Total Facilities"
          value={activeFacilities.length}
          icon={Building2}
          color="#3B6CE7"
          bgColor="#eff6ff"
        />
        <StatTile
          label="Total Residents"
          value={activeResidents.length}
          icon={Users}
          color="#047857"
          bgColor="#ecfdf5"
        />
        <StatTile
          label="Upcoming Clinics"
          value={upcomingClinics.length}
          icon={Calendar}
          color="#7c3aed"
          bgColor="#f3e8ff"
        />
        <StatTile
          label="Consents Pending"
          value={pendingConsents}
          icon={ClipboardCheck}
          color="#c2410c"
          bgColor="#fff7ed"
        />
        <StatTile
          label="Vaccines Due"
          value={vaccinesDue}
          icon={Syringe}
          color="#dc2626"
          bgColor="#fef2f2"
        />
      </div>

      {/* Upcoming Clinics */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Clinics</h2>
          <button
            onClick={() => router.push('/pharm-clinics')}
            className="flex items-center gap-1 text-sm font-medium"
            style={{ color: '#3B6CE7' }}
          >
            See all <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {nextClinics.length === 0 ? (
          <p className="text-sm text-gray-500">No upcoming clinics scheduled.</p>
        ) : (
          <div className="space-y-3">
            {nextClinics.map(clinic => {
              const d = new Date(clinic.clinicDate);
              const day = d.getDate();
              const month = d.toLocaleDateString('en-AU', { month: 'short' });
              const facility = FACILITIES.find(f => f.id === clinic.facilityId);

              return (
                <div
                  key={clinic.id}
                  className="flex items-center gap-4 rounded-xl border border-gray-100 p-4 hover:bg-gray-50"
                >
                  {/* Date badge */}
                  <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-blue-50">
                    <span className="text-lg font-bold" style={{ color: '#3B6CE7' }}>
                      {day}
                    </span>
                    <span className="text-[10px] font-medium uppercase text-gray-500">
                      {month}
                    </span>
                  </div>

                  {/* Clinic info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{clinic.name}</p>
                      {facility && <Pill color="blue">{facility.name}</Pill>}
                    </div>
                    <p className="text-sm text-gray-500">
                      {clinic.timeRange} &middot; {clinic.location}
                    </p>
                  </div>

                  {/* Vaccine pills */}
                  <div className="flex gap-2">
                    {clinic.vaccines.map(v => (
                      <Pill key={v} color="purple">{v}</Pill>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Facility Summary */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Facility Summary</h2>
        <div className="grid grid-cols-2 gap-4">
          {facilitySummaries.map(({ facility, resCount, nextClinic }) => {
            const nextDate = nextClinic
              ? new Date(nextClinic.clinicDate).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : null;

            return (
              <div
                key={facility.id}
                className="rounded-2xl border border-gray-200 bg-white p-5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{facility.name}</h3>
                  <Pill color="green">Active</Pill>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Residents</span>
                    <span className="font-medium text-gray-900">{resCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Next Clinic</span>
                    <span className="font-medium text-gray-900">
                      {nextClinic ? `${nextClinic.name} (${nextDate})` : 'None scheduled'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
