import type {
  HistoryEntry,
  IndividualResult,
  ParsedRecord,
  ClinicType,
  EligibilityResult,
  ClinicPatient,
} from './types';

// ── Date helpers ──────────────────────────────────────────────

/** Parse AIR date formats (ddMMyyyy or yyyy-MM-dd) into a Date */
export function parseDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  // ddMMyyyy (8 digits)
  if (/^\d{8}$/.test(raw)) {
    const d = parseInt(raw.slice(0, 2), 10);
    const m = parseInt(raw.slice(2, 4), 10) - 1;
    const y = parseInt(raw.slice(4, 8), 10);
    return new Date(y, m, d);
  }
  // yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return null;
}

/** Calculate age in whole years from DOB to a reference date */
export function calcAge(dob: Date, ref: Date = new Date()): number {
  let age = ref.getFullYear() - dob.getFullYear();
  const monthDiff = ref.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/** Months between two dates (fractional) */
function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) +
    (b.getDate() - a.getDate()) / 30;
}

/** Format Date as dd/MM/yyyy for display */
function fmtDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

// ── Vaccine code matchers ─────────────────────────────────────

const FLU_CODES = new Set(['FLUADQ', 'FLUVRX', 'INFLVX', 'AFLURI']);
const FLU_PATTERN = /influenza|flu/i;

const COVID_CODES = new Set(['COMIRN', 'MODERN', 'NUVAXO', 'AZN', 'VAXZEV']);
const COVID_PATTERN = /covid|comirnaty|spikevax/i;

const SHINGRIX_CODES = new Set(['ZOSTAV']);
const SHINGRIX_PATTERN = /shingrix/i;

const ZOSTAVAX_CODES = new Set(['ZOSTAVX']);
const ZOSTAVAX_PATTERN = /zostavax/i;

const PREVNAR13_CODES = new Set(['PRVNAR', 'PREVNA']);
const PREVNAR13_PATTERN = /prevenar.13/i;

const PREVNAR23_CODES = new Set(['PNVX23', 'PNEUM']);
const PREVNAR23_PATTERN = /pneumovax.23/i;

function matchesVaccine(
  entry: HistoryEntry,
  codes: Set<string>,
  pattern: RegExp,
): boolean {
  if (entry.vaccineCode && codes.has(entry.vaccineCode.toUpperCase())) return true;
  if (entry.vaccineDescription && pattern.test(entry.vaccineDescription)) return true;
  return false;
}

function filterVaccines(
  history: HistoryEntry[],
  codes: Set<string>,
  pattern: RegExp,
): { entry: HistoryEntry; date: Date }[] {
  const matches: { entry: HistoryEntry; date: Date }[] = [];
  for (const h of history) {
    if (!matchesVaccine(h, codes, pattern)) continue;
    const d = parseDate(h.dateOfService);
    if (d) matches.push({ entry: h, date: d });
  }
  matches.sort((a, b) => b.date.getTime() - a.date.getTime()); // newest first
  return matches;
}

// ── Clinic evaluators ─────────────────────────────────────────

function evaluateFlu(history: HistoryEntry[], _dob: Date | null, now: Date): EligibilityResult {
  const fluVaccines = filterVaccines(history, FLU_CODES, FLU_PATTERN);
  const currentYear = now.getFullYear();
  const thisYearDoses = fluVaccines.filter((v) => v.date.getFullYear() === currentYear);

  if (thisYearDoses.length === 0) {
    const lastDose = fluVaccines[0];
    return {
      eligible: true,
      reason: lastDose
        ? `No flu vaccine in ${currentYear}. Last: ${fmtDate(lastDose.date)}`
        : `No flu vaccine on record`,
      details: {
        'Last Flu Date': lastDose ? fmtDate(lastDose.date) : 'None',
        'Vaccine Used': lastDose ? (lastDose.entry.vaccineDescription || lastDose.entry.vaccineCode || '') : 'N/A',
      },
    };
  }

  return {
    eligible: false,
    reason: `Flu vaccine given ${fmtDate(thisYearDoses[0].date)}`,
    details: {
      'Last Flu Date': fmtDate(thisYearDoses[0].date),
      'Vaccine Used': thisYearDoses[0].entry.vaccineDescription || thisYearDoses[0].entry.vaccineCode || '',
    },
  };
}

function evaluateCovid(history: HistoryEntry[], _dob: Date | null, now: Date): EligibilityResult {
  const covidVaccines = filterVaccines(history, COVID_CODES, COVID_PATTERN);
  const totalDoses = covidVaccines.length;

  if (totalDoses === 0) {
    return {
      eligible: true,
      reason: 'No COVID vaccines on record',
      details: { 'Last COVID Date': 'None', 'Total Doses': '0', 'Months Since': 'N/A' },
    };
  }

  const lastDose = covidVaccines[0];
  const months = monthsBetween(lastDose.date, now);

  if (months >= 6) {
    return {
      eligible: true,
      reason: `${Math.floor(months)} months since last COVID vaccine`,
      details: {
        'Last COVID Date': fmtDate(lastDose.date),
        'Total Doses': String(totalDoses),
        'Months Since': String(Math.floor(months)),
      },
    };
  }

  return {
    eligible: false,
    reason: `COVID vaccine ${Math.floor(months)}mo ago (need 6mo)`,
    details: {
      'Last COVID Date': fmtDate(lastDose.date),
      'Total Doses': String(totalDoses),
      'Months Since': String(Math.floor(months)),
    },
  };
}

function evaluateShingrix(history: HistoryEntry[], dob: Date | null, now: Date): EligibilityResult {
  if (!dob) {
    return { eligible: false, reason: 'DOB unknown — cannot assess age', details: {} };
  }

  const age = calcAge(dob, now);
  if (age < 65) {
    return {
      eligible: false,
      reason: `Age ${age} — must be 65+`,
      details: { 'Doses Given': '0', 'Due Date': 'N/A', 'Zostavax History': 'N/A' },
    };
  }

  const shingrixDoses = filterVaccines(history, SHINGRIX_CODES, SHINGRIX_PATTERN);
  const zostavaxDoses = filterVaccines(history, ZOSTAVAX_CODES, ZOSTAVAX_PATTERN);
  const recentZostavax = zostavaxDoses.find(
    (v) => monthsBetween(v.date, now) < 60, // 5 years
  );

  if (recentZostavax) {
    return {
      eligible: false,
      reason: `Zostavax given ${fmtDate(recentZostavax.date)} (within 5 years)`,
      details: {
        'Doses Given': String(shingrixDoses.length),
        'Due Date': 'N/A',
        'Zostavax History': fmtDate(recentZostavax.date),
      },
    };
  }

  const doseCount = shingrixDoses.length;
  if (doseCount >= 2) {
    return {
      eligible: false,
      reason: 'Shingrix course complete (2 doses)',
      details: {
        'Doses Given': '2',
        'Due Date': 'Completed',
        'Zostavax History': zostavaxDoses[0] ? fmtDate(zostavaxDoses[0].date) : 'None',
      },
    };
  }

  // Calculate due date
  let dueDate: string;
  if (doseCount === 0) {
    // Due when turned 65
    const turned65 = new Date(dob.getFullYear() + 65, dob.getMonth(), dob.getDate());
    dueDate = turned65 <= now ? 'Now' : fmtDate(turned65);
  } else {
    // Dose 1 given — dose 2 due at dose 1 + 2 months
    const dose1Date = shingrixDoses[shingrixDoses.length - 1].date; // earliest
    const dose2Due = new Date(dose1Date.getFullYear(), dose1Date.getMonth() + 2, dose1Date.getDate());
    dueDate = dose2Due <= now ? 'Now' : fmtDate(dose2Due);
  }

  const dosesNeeded = 2 - doseCount;
  return {
    eligible: true,
    reason: `${dosesNeeded} dose${dosesNeeded > 1 ? 's' : ''} needed`,
    details: {
      'Doses Given': String(doseCount),
      'Due Date': dueDate,
      'Zostavax History': zostavaxDoses[0] ? fmtDate(zostavaxDoses[0].date) : 'None',
    },
  };
}

function evaluatePneumococcal(history: HistoryEntry[], dob: Date | null, now: Date): EligibilityResult {
  if (!dob) {
    return { eligible: false, reason: 'DOB unknown — cannot assess age', details: {} };
  }

  const age = calcAge(dob, now);
  if (age < 70) {
    return {
      eligible: false,
      reason: `Age ${age} — must be 70+`,
      details: { 'Prevnar 13 History': 'N/A', 'Last Prevnar 23': 'N/A', 'Due Date': 'N/A' },
    };
  }

  const p13Doses = filterVaccines(history, PREVNAR13_CODES, PREVNAR13_PATTERN);
  const p23Doses = filterVaccines(history, PREVNAR23_CODES, PREVNAR23_PATTERN);

  if (p13Doses.length > 0) {
    return {
      eligible: false,
      reason: `Prevnar 13 given ${fmtDate(p13Doses[0].date)}`,
      details: {
        'Prevnar 13 History': fmtDate(p13Doses[0].date),
        'Last Prevnar 23': p23Doses[0] ? fmtDate(p23Doses[0].date) : 'None',
        'Due Date': 'Completed',
      },
    };
  }

  // No Prevnar 13 — check Prevnar 23 timing
  if (p23Doses.length > 0) {
    const lastP23 = p23Doses[0];
    const monthsSinceP23 = monthsBetween(lastP23.date, now);

    if (monthsSinceP23 < 12) {
      const dueDate = new Date(
        lastP23.date.getFullYear(),
        lastP23.date.getMonth() + 12,
        lastP23.date.getDate(),
      );
      return {
        eligible: false,
        reason: `Prevnar 23 given ${Math.floor(monthsSinceP23)}mo ago (need 12mo gap)`,
        details: {
          'Prevnar 13 History': 'None',
          'Last Prevnar 23': fmtDate(lastP23.date),
          'Due Date': fmtDate(dueDate),
        },
      };
    }
  }

  // Eligible: age 70+, no Prevnar 13, and no Prevnar 23 in 12 months
  const turned70 = new Date(dob.getFullYear() + 70, dob.getMonth(), dob.getDate());
  let dueDate: string;
  if (p23Doses.length === 0) {
    dueDate = turned70 <= now ? 'Now' : fmtDate(turned70);
  } else {
    const p23Plus12 = new Date(
      p23Doses[0].date.getFullYear(),
      p23Doses[0].date.getMonth() + 12,
      p23Doses[0].date.getDate(),
    );
    dueDate = p23Plus12 <= now ? 'Now' : fmtDate(p23Plus12);
  }

  return {
    eligible: true,
    reason: p23Doses.length > 0
      ? `Needs Prevnar 13 (last P23: ${fmtDate(p23Doses[0].date)})`
      : 'No pneumococcal vaccines on record',
    details: {
      'Prevnar 13 History': 'None',
      'Last Prevnar 23': p23Doses[0] ? fmtDate(p23Doses[0].date) : 'None',
      'Due Date': dueDate,
    },
  };
}

// ── Public API ─────────────────────────────────────────────────

const EVALUATORS: Record<ClinicType, (history: HistoryEntry[], dob: Date | null, now: Date) => EligibilityResult> = {
  flu: evaluateFlu,
  covid: evaluateCovid,
  shingrix: evaluateShingrix,
  pneumococcal: evaluatePneumococcal,
};

export function evaluatePatient(
  result: IndividualResult,
  clinic: ClinicType,
  now: Date = new Date(),
): EligibilityResult {
  if (result.status !== 'success') {
    return { eligible: false, reason: 'History not available', details: {} };
  }
  const dob = parseDate(result.dateOfBirth);
  return EVALUATORS[clinic](result.immunisationHistory, dob, now);
}

export function evaluateAll(
  results: IndividualResult[],
  records: ParsedRecord[],
  clinic: ClinicType,
  now: Date = new Date(),
): ClinicPatient[] {
  const recordMap = new Map(records.map((r) => [r.rowNumber, r]));

  return results
    .filter((r) => r.status === 'success')
    .map((result) => {
      const dob = parseDate(result.dateOfBirth);
      return {
        result,
        record: recordMap.get(result.rowNumber),
        age: dob ? calcAge(dob, now) : null,
        eligibility: evaluatePatient(result, clinic, now),
      };
    });
}

/** Return detail column keys for a given clinic type */
export function getDetailColumns(clinic: ClinicType): string[] {
  switch (clinic) {
    case 'flu':
      return ['Last Flu Date', 'Vaccine Used'];
    case 'covid':
      return ['Last COVID Date', 'Total Doses', 'Months Since'];
    case 'shingrix':
      return ['Doses Given', 'Due Date', 'Zostavax History'];
    case 'pneumococcal':
      return ['Prevnar 13 History', 'Last Prevnar 23', 'Due Date'];
  }
}
