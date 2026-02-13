'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { CLINICS, FACILITIES } from '@/lib/mock/portal-data';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  // JS getDay() returns 0=Sun, we want Mon=0
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];

  // Leading blanks
  for (let i = 0; i < startDow; i++) {
    currentWeek.push(null);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Trailing blanks
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function PharmAvailabilityPage() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [blockedDays, setBlockedDays] = useState<Set<string>>(new Set());

  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-AU', {
    month: 'long',
    year: 'numeric',
  });

  const weeks = useMemo(
    () => getMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  // Build a map of booked dates from CLINICS
  const bookedMap = useMemo(() => {
    const map: Record<string, { clinicName: string; facilityName: string }[]> = {};
    for (const c of CLINICS) {
      if (c.status === 'upcoming' || c.status === 'in_progress') {
        const facility = FACILITIES.find(f => f.id === c.facilityId);
        if (!map[c.clinicDate]) map[c.clinicDate] = [];
        map[c.clinicDate].push({
          clinicName: c.name,
          facilityName: facility?.name ?? 'Unknown',
        });
      }
    }
    return map;
  }, []);

  // Next 5 upcoming clinics
  const upcomingSchedule = useMemo(() => {
    return [...CLINICS]
      .filter(c => c.status === 'upcoming')
      .sort((a, b) => a.clinicDate.localeCompare(b.clinicDate))
      .slice(0, 5);
  }, []);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(y => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(y => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const toggleDay = (day: number) => {
    const key = formatDateKey(viewYear, viewMonth, day);
    // Cannot toggle booked or past days
    if (bookedMap[key]) return;
    const dateObj = new Date(viewYear, viewMonth, day);
    if (dateObj < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return;

    setBlockedDays(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Availability</h1>

      <div className="flex gap-6">
        {/* Calendar grid */}
        <div className="flex-1 rounded-2xl border border-gray-200 bg-white p-6">
          {/* Month navigation */}
          <div className="mb-5 flex items-center justify-between">
            <button
              onClick={prevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">{monthName}</h2>
            <button
              onClick={nextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Days of week header */}
          <div className="mb-2 grid grid-cols-7 text-center">
            {DAYS_OF_WEEK.map(d => (
              <div
                key={d}
                className="py-2 text-xs font-semibold uppercase text-gray-400"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {weeks.flat().map((day, idx) => {
              if (day === null) {
                return <div key={`blank-${idx}`} className="h-24 border border-gray-50" />;
              }

              const dateKey = formatDateKey(viewYear, viewMonth, day);
              const dateObj = new Date(viewYear, viewMonth, day);
              const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const isPast = dateObj < todayDate;
              const isToday =
                dateObj.getTime() === todayDate.getTime();
              const isBooked = !!bookedMap[dateKey];
              const isBlocked = blockedDays.has(dateKey);

              let bgClass = 'bg-white hover:bg-gray-50 cursor-pointer';
              let dotColor = '';
              let label = '';

              if (isPast) {
                bgClass = 'bg-gray-50 opacity-40 cursor-default';
              } else if (isBooked) {
                bgClass = 'bg-blue-50 cursor-default';
                dotColor = 'bg-blue-500';
                label = bookedMap[dateKey].map(b => b.clinicName).join(', ');
              } else if (isBlocked) {
                bgClass = 'bg-gray-50 cursor-pointer border-dashed';
                dotColor = 'bg-gray-400';
                label = 'Blocked';
              } else if (!isPast) {
                dotColor = 'bg-emerald-500';
                label = 'Available';
              }

              return (
                <div
                  key={dateKey}
                  onClick={() => !isPast && !isBooked && toggleDay(day)}
                  className={`relative h-24 border border-gray-100 p-2 transition-colors ${bgClass} ${
                    isToday ? 'ring-2 ring-blue-400 ring-inset' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-sm font-medium ${
                        isPast
                          ? 'text-gray-400'
                          : isToday
                            ? 'text-blue-600 font-bold'
                            : 'text-gray-700'
                      }`}
                    >
                      {day}
                    </span>
                    {dotColor && !isPast && (
                      <span
                        className={`h-2 w-2 rounded-full ${dotColor}`}
                      />
                    )}
                  </div>
                  {label && !isPast && (
                    <div className="mt-1 text-[10px] leading-tight text-gray-500 truncate">
                      {label}
                    </div>
                  )}
                  {isBooked && !isPast && (
                    <div className="mt-0.5">
                      {bookedMap[dateKey].map((b, i) => (
                        <div
                          key={i}
                          className="text-[9px] font-medium text-blue-600 truncate"
                        >
                          {b.facilityName}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-6 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Available
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              Booked
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
              Blocked
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
              Past
            </div>
          </div>
        </div>

        {/* Right panel - My Schedule */}
        <div className="w-72 flex-shrink-0 self-start sticky top-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" style={{ color: '#3B6CE7' }} />
              <h3 className="text-lg font-semibold text-gray-900">My Schedule</h3>
            </div>

            {upcomingSchedule.length === 0 ? (
              <p className="text-sm text-gray-400">No upcoming clinics.</p>
            ) : (
              <div className="space-y-4">
                {upcomingSchedule.map(clinic => {
                  const d = new Date(clinic.clinicDate);
                  const dateStr = d.toLocaleDateString('en-AU', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  });
                  const facility = FACILITIES.find(
                    f => f.id === clinic.facilityId,
                  );

                  return (
                    <div
                      key={clinic.id}
                      className="border-l-2 pl-3"
                      style={{ borderLeftColor: '#3B6CE7' }}
                    >
                      <p className="text-xs font-medium text-gray-400">
                        {dateStr}
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {facility?.name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">{clinic.timeRange}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
