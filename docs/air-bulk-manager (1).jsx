import { useState, useMemo, useCallback, useRef } from "react";

// ─── Vaccine Reference Data ────────────────────────────────────────────
const VACCINE_DB = {
  COMIRN: { name: "Pfizer Comirnaty", category: "COV19", antigen: "COVID-19", brand: "Pfizer" },
  MODERN: { name: "Moderna Spikevax", category: "COV19", antigen: "COVID-19", brand: "Moderna" },
  NUVAXO: { name: "Nuvaxovid", category: "COV19", antigen: "COVID-19", brand: "Novavax" },
  FLUADQ: { name: "Fluad Quad", category: "FLU", antigen: "Influenza", brand: "Seqirus" },
  FLUVRX: { name: "Fluarix Tetra", category: "FLU", antigen: "Influenza", brand: "GSK" },
  INFLVX: { name: "Influvac Tetra", category: "FLU", antigen: "Influenza", brand: "Viatris" },
  AFLURI: { name: "Afluria Quad", category: "FLU", antigen: "Influenza", brand: "Seqirus" },
  ZOSTAV: { name: "Shingrix", category: "NIP", antigen: "Herpes Zoster", brand: "GSK", seriesDoses: 2 },
  ADACEL: { name: "Adacel", category: "NIP", antigen: "dTpa", brand: "Sanofi" },
  BOOSTR: { name: "Boostrix", category: "NIP", antigen: "dTpa", brand: "GSK" },
  PRVNAR: { name: "Prevenar 13", category: "NIP", antigen: "Pneumococcal", brand: "Pfizer" },
  PNVX23: { name: "Pneumovax 23", category: "NIP", antigen: "Pneumococcal", brand: "MSD" },
  GARDSQ: { name: "Gardasil 9", category: "NIP", antigen: "HPV", brand: "MSD", seriesDoses: 3 },
  MMRVAX: { name: "Priorix", category: "NIP", antigen: "MMR", brand: "GSK", seriesDoses: 2 },
  HAVRIX: { name: "Havrix", category: "NIP", antigen: "Hepatitis A", brand: "GSK", seriesDoses: 2 },
  ENGERX: { name: "Engerix-B", category: "NIP", antigen: "Hepatitis B", brand: "GSK", seriesDoses: 3 },
  MENVEO: { name: "Menveo", category: "NIP", antigen: "Meningococcal ACWY", brand: "GSK" },
};

const ANTIGEN_LABELS = {
  CPF: "COVID-19", COV19: "COVID-19", COV: "COVID-19",
  FLU: "Influenza", INF: "Influenza", INFLZ: "Influenza",
  DTP: "dTpa", PNE: "Pneumococcal", HPV: "HPV",
  HZV: "Herpes Zoster", MMR: "MMR", HEP: "Hepatitis",
  MENA: "Meningococcal",
};

// ─── Clinic Presets ────────────────────────────────────────────────────
// These are the smart clinical filter presets for common pharmacy scenarios
const CLINIC_PRESETS = [
  {
    id: "flu_this_year",
    icon: "💉",
    label: "Flu Clinic",
    sublabel: "No flu shot this year",
    color: "#3B82F6",
    description: "Patients who have NOT received an influenza vaccine in the current year (2026). Ideal for planning flu vaccination clinics.",
    filterFn: (p) => {
      const currentYear = 2026;
      const fluVaccines = (p.history || []).filter(h => {
        const cat = VACCINE_DB[h.vaccine]?.category;
        return (cat === "FLU" || ["Influenza"].includes(h.antigen));
      });
      const hadFluThisYear = fluVaccines.some(h => {
        const parts = h.date.split("/");
        return parseInt(parts[2]) === currentYear;
      });
      return !hadFluThisYear && !p.error;
    },
    sortKey: (p) => {
      // Sort by most recent flu shot date (oldest first = most overdue)
      const fluVaccines = (p.history || []).filter(h => VACCINE_DB[h.vaccine]?.category === "FLU" || h.antigen === "Influenza");
      if (fluVaccines.length === 0) return "0000-00-00";
      const dates = fluVaccines.map(h => { const [d,m,y] = h.date.split("/"); return `${y}-${m}-${d}`; });
      dates.sort();
      return dates[dates.length - 1];
    },
    extraColumns: [
      { header: "Last Flu Shot", key: (p) => {
        const fluVaccines = (p.history || []).filter(h => VACCINE_DB[h.vaccine]?.category === "FLU" || h.antigen === "Influenza");
        if (fluVaccines.length === 0) return { text: "Never recorded", color: "#EF4444" };
        // find most recent
        const sorted = [...fluVaccines].sort((a,b) => {
          const [ad,am,ay] = a.date.split("/"); const [bd,bm,by] = b.date.split("/");
          return new Date(by,bm-1,bd) - new Date(ay,am-1,ad);
        });
        return { text: sorted[0].date, color: "#94A3B8" };
      }},
      { header: "Vaccine Used", key: (p) => {
        const fluVaccines = (p.history || []).filter(h => VACCINE_DB[h.vaccine]?.category === "FLU" || h.antigen === "Influenza");
        if (fluVaccines.length === 0) return { text: "—", color: "#64748B" };
        const sorted = [...fluVaccines].sort((a,b) => {
          const [ad,am,ay] = a.date.split("/"); const [bd,bm,by] = b.date.split("/");
          return new Date(by,bm-1,bd) - new Date(ay,am-1,ad);
        });
        return { text: sorted[0].name || sorted[0].vaccine, color: "#94A3B8" };
      }},
      { header: "Days Since", key: (p) => {
        const fluVaccines = (p.history || []).filter(h => VACCINE_DB[h.vaccine]?.category === "FLU" || h.antigen === "Influenza");
        if (fluVaccines.length === 0) return { text: "∞", color: "#EF4444" };
        const sorted = [...fluVaccines].sort((a,b) => {
          const [ad,am,ay] = a.date.split("/"); const [bd,bm,by] = b.date.split("/");
          return new Date(by,bm-1,bd) - new Date(ay,am-1,ad);
        });
        const [d,m,y] = sorted[0].date.split("/");
        const lastDate = new Date(y, m-1, d);
        const days = Math.floor((new Date(2026,1,11) - lastDate) / 86400000);
        return { text: `${days} days`, color: days > 365 ? "#EF4444" : days > 180 ? "#F59E0B" : "#94A3B8" };
      }},
    ],
  },
  {
    id: "covid_6_months",
    icon: "🦠",
    label: "COVID Booster",
    sublabel: "No COVID in 6 months",
    color: "#8B5CF6",
    description: "Patients who have NOT received a COVID-19 vaccine in the past 6 months. Per ATAGI, boosters are recommended every 6 months for high-risk groups.",
    filterFn: (p) => {
      const sixMonthsAgo = new Date(2025, 7, 11); // Aug 11, 2025
      const covidVaccines = (p.history || []).filter(h => {
        const cat = VACCINE_DB[h.vaccine]?.category;
        return (cat === "COV19" || ["COVID-19"].includes(h.antigen));
      });
      const hadCovidRecently = covidVaccines.some(h => {
        const [d,m,y] = h.date.split("/");
        return new Date(y, m-1, d) >= sixMonthsAgo;
      });
      return !hadCovidRecently && !p.error;
    },
    sortKey: (p) => {
      const covidVaccines = (p.history || []).filter(h => VACCINE_DB[h.vaccine]?.category === "COV19" || h.antigen === "COVID-19");
      if (covidVaccines.length === 0) return "0000-00-00";
      const dates = covidVaccines.map(h => { const [d,m,y] = h.date.split("/"); return `${y}-${m}-${d}`; });
      dates.sort();
      return dates[dates.length - 1];
    },
    extraColumns: [
      { header: "Last COVID Dose", key: (p) => {
        const cv = (p.history || []).filter(h => VACCINE_DB[h.vaccine]?.category === "COV19" || h.antigen === "COVID-19");
        if (cv.length === 0) return { text: "Never recorded", color: "#EF4444" };
        const sorted = [...cv].sort((a,b) => {
          const [ad,am,ay] = a.date.split("/"); const [bd,bm,by] = b.date.split("/");
          return new Date(by,bm-1,bd) - new Date(ay,am-1,ad);
        });
        return { text: sorted[0].date, color: "#94A3B8" };
      }},
      { header: "Total Doses", key: (p) => {
        const cv = (p.history || []).filter(h => VACCINE_DB[h.vaccine]?.category === "COV19" || h.antigen === "COVID-19");
        return { text: `${cv.length}`, color: cv.length === 0 ? "#EF4444" : cv.length < 3 ? "#F59E0B" : "#10B981" };
      }},
      { header: "Months Since", key: (p) => {
        const cv = (p.history || []).filter(h => VACCINE_DB[h.vaccine]?.category === "COV19" || h.antigen === "COVID-19");
        if (cv.length === 0) return { text: "∞", color: "#EF4444" };
        const sorted = [...cv].sort((a,b) => {
          const [ad,am,ay] = a.date.split("/"); const [bd,bm,by] = b.date.split("/");
          return new Date(by,bm-1,bd) - new Date(ay,am-1,ad);
        });
        const [d,m,y] = sorted[0].date.split("/");
        const months = Math.round((new Date(2026,1,11) - new Date(y,m-1,d)) / (86400000*30.44));
        return { text: `${months}mo`, color: months >= 12 ? "#EF4444" : months >= 6 ? "#F59E0B" : "#10B981" };
      }},
    ],
  },
  {
    id: "shingrix_incomplete",
    icon: "🛡️",
    label: "Shingrix Series",
    sublabel: "Incomplete 2-dose course",
    color: "#F59E0B",
    description: "Patients aged 50+ who have received 0 or 1 dose of Shingrix (2-dose series required). NIP funded for 65+ and immunocompromised 18+.",
    filterFn: (p) => {
      // Check age >= 50
      const [d,m,y] = p.dob.split("/");
      const age = Math.floor((new Date(2026,1,11) - new Date(y,m-1,d)) / (86400000 * 365.25));
      if (age < 50) return false;
      const shingrixDoses = (p.history || []).filter(h => h.vaccine === "ZOSTAV" || h.antigen === "Herpes Zoster");
      return shingrixDoses.length < 2 && !p.error;
    },
    sortKey: (p) => {
      const doses = (p.history || []).filter(h => h.vaccine === "ZOSTAV" || h.antigen === "Herpes Zoster");
      return `${doses.length}`;
    },
    extraColumns: [
      { header: "Age", key: (p) => {
        const [d,m,y] = p.dob.split("/");
        const age = Math.floor((new Date(2026,1,11) - new Date(y,m-1,d)) / (86400000 * 365.25));
        return { text: `${age}`, color: age >= 65 ? "#10B981" : "#94A3B8" };
      }},
      { header: "Doses Given", key: (p) => {
        const doses = (p.history || []).filter(h => h.vaccine === "ZOSTAV" || h.antigen === "Herpes Zoster");
        return { text: `${doses.length} of 2`, color: doses.length === 0 ? "#EF4444" : "#F59E0B" };
      }},
      { header: "NIP Eligible", key: (p) => {
        const [d,m,y] = p.dob.split("/");
        const age = Math.floor((new Date(2026,1,11) - new Date(y,m-1,d)) / (86400000 * 365.25));
        return { text: age >= 65 ? "✓ Yes (65+)" : "Private", color: age >= 65 ? "#10B981" : "#94A3B8" };
      }},
    ],
  },
  {
    id: "pneumo_due",
    icon: "🫁",
    label: "Pneumococcal",
    sublabel: "No pneumococcal vaccine",
    color: "#EC4899",
    description: "Patients aged 65+ who have not received a pneumococcal vaccine (Prevenar 13 or Pneumovax 23). NIP funded for 70+, Aboriginal/TSI 50+.",
    filterFn: (p) => {
      const [d,m,y] = p.dob.split("/");
      const age = Math.floor((new Date(2026,1,11) - new Date(y,m-1,d)) / (86400000 * 365.25));
      if (age < 65) return false;
      const pneumoDoses = (p.history || []).filter(h => h.vaccine === "PRVNAR" || h.vaccine === "PNVX23" || h.antigen === "Pneumococcal");
      return pneumoDoses.length === 0 && !p.error;
    },
    sortKey: (p) => {
      const [d,m,y] = p.dob.split("/");
      return `${y}-${m}-${d}`;
    },
    extraColumns: [
      { header: "Age", key: (p) => {
        const [d,m,y] = p.dob.split("/");
        const age = Math.floor((new Date(2026,1,11) - new Date(y,m-1,d)) / (86400000 * 365.25));
        return { text: `${age}`, color: age >= 70 ? "#10B981" : "#94A3B8" };
      }},
      { header: "Pneumo History", key: () => ({ text: "None recorded", color: "#EF4444" }) },
      { header: "NIP Eligible", key: (p) => {
        const [d,m,y] = p.dob.split("/");
        const age = Math.floor((new Date(2026,1,11) - new Date(y,m-1,d)) / (86400000 * 365.25));
        return { text: age >= 70 ? "✓ Yes (70+)" : "Private", color: age >= 70 ? "#10B981" : "#94A3B8" };
      }},
    ],
  },
  {
    id: "dtpa_10yr",
    icon: "💪",
    label: "dTpa Booster",
    sublabel: "No dTpa in 10 years",
    color: "#06B6D4",
    description: "Patients who have not received a dTpa (whooping cough) booster in the past 10 years. Recommended for adults every 10 years, especially pregnant women and close contacts of infants.",
    filterFn: (p) => {
      const tenYearsAgo = new Date(2016, 1, 11);
      const dtpaVaccines = (p.history || []).filter(h =>
        h.vaccine === "ADACEL" || h.vaccine === "BOOSTR" || h.antigen === "dTpa"
      );
      const hadRecently = dtpaVaccines.some(h => {
        const [d,m,y] = h.date.split("/");
        return new Date(y, m-1, d) >= tenYearsAgo;
      });
      return !hadRecently && !p.error;
    },
    sortKey: (p) => {
      const dtpa = (p.history || []).filter(h => h.vaccine === "ADACEL" || h.vaccine === "BOOSTR" || h.antigen === "dTpa");
      if (dtpa.length === 0) return "0000-00-00";
      const dates = dtpa.map(h => { const [d,m,y] = h.date.split("/"); return `${y}-${m}-${d}`; });
      dates.sort();
      return dates[dates.length - 1];
    },
    extraColumns: [
      { header: "Last dTpa", key: (p) => {
        const dtpa = (p.history || []).filter(h => h.vaccine === "ADACEL" || h.vaccine === "BOOSTR" || h.antigen === "dTpa");
        if (dtpa.length === 0) return { text: "Never recorded", color: "#EF4444" };
        const sorted = [...dtpa].sort((a,b) => {
          const [ad,am,ay] = a.date.split("/"); const [bd,bm,by] = b.date.split("/");
          return new Date(by,bm-1,bd) - new Date(ay,am-1,ad);
        });
        return { text: sorted[0].date, color: "#94A3B8" };
      }},
      { header: "Years Since", key: (p) => {
        const dtpa = (p.history || []).filter(h => h.vaccine === "ADACEL" || h.vaccine === "BOOSTR" || h.antigen === "dTpa");
        if (dtpa.length === 0) return { text: "10+", color: "#EF4444" };
        const sorted = [...dtpa].sort((a,b) => {
          const [ad,am,ay] = a.date.split("/"); const [bd,bm,by] = b.date.split("/");
          return new Date(by,bm-1,bd) - new Date(ay,am-1,ad);
        });
        const [d,m,y] = sorted[0].date.split("/");
        const years = Math.round((new Date(2026,1,11) - new Date(y,m-1,d)) / (86400000*365.25) * 10) / 10;
        return { text: `${years}yr`, color: years >= 10 ? "#EF4444" : "#F59E0B" };
      }},
    ],
  },
];

// ─── Custom Filter Config ──────────────────────────────────────────────
const VACCINE_CATEGORIES_FOR_FILTER = [
  { value: "FLU", label: "Influenza (any)", matchFn: (h) => VACCINE_DB[h.vaccine]?.category === "FLU" || h.antigen === "Influenza" },
  { value: "COV19", label: "COVID-19 (any)", matchFn: (h) => VACCINE_DB[h.vaccine]?.category === "COV19" || h.antigen === "COVID-19" },
  { value: "ZOSTAV", label: "Shingrix", matchFn: (h) => h.vaccine === "ZOSTAV" || h.antigen === "Herpes Zoster" },
  { value: "DTPA", label: "dTpa (any)", matchFn: (h) => h.vaccine === "ADACEL" || h.vaccine === "BOOSTR" || h.antigen === "dTpa" },
  { value: "PRVNAR", label: "Pneumococcal (any)", matchFn: (h) => h.vaccine === "PRVNAR" || h.vaccine === "PNVX23" || h.antigen === "Pneumococcal" },
  { value: "HPV", label: "HPV / Gardasil", matchFn: (h) => h.vaccine === "GARDSQ" || h.antigen === "HPV" },
  { value: "MMR", label: "MMR / Priorix", matchFn: (h) => h.vaccine === "MMRVAX" || h.antigen === "MMR" },
  { value: "HEPA", label: "Hepatitis A", matchFn: (h) => h.vaccine === "HAVRIX" || h.antigen === "Hepatitis A" },
  { value: "HEPB", label: "Hepatitis B", matchFn: (h) => h.vaccine === "ENGERX" || h.antigen === "Hepatitis B" },
  { value: "MENACWY", label: "Meningococcal ACWY", matchFn: (h) => h.vaccine === "MENVEO" || h.antigen === "Meningococcal ACWY" },
];

const TIMEFRAME_OPTIONS = [
  { value: "this_year", label: "This year (2026)", months: null, startDate: new Date(2026, 0, 1) },
  { value: "6_months", label: "Past 6 months", months: 6 },
  { value: "12_months", label: "Past 12 months", months: 12 },
  { value: "2_years", label: "Past 2 years", months: 24 },
  { value: "5_years", label: "Past 5 years", months: 60 },
  { value: "10_years", label: "Past 10 years", months: 120 },
  { value: "ever", label: "Ever (all time)", months: null, startDate: new Date(1900, 0, 1) },
];

const FILTER_MODES = [
  { value: "has_not", label: "Has NOT had" },
  { value: "has", label: "Has had" },
  { value: "fewer_than", label: "Fewer than X doses" },
];

// ─── Enhanced Mock Patients ────────────────────────────────────────────
const SEED_PATIENTS = [
  { id: 1, firstName: "Sarah", lastName: "Mitchell", dob: "15/03/1985", gender: "F", medicare: "2123456789", irn: "1", postcode: "2000",
    dueList: [{ disease: "FLU", vaccineDose: "1", dueDate: "01032025" }, { disease: "DTP", vaccineDose: "1", dueDate: "15062026" }],
    history: [
      { date: "12/03/2024", vaccine: "COMIRN", name: "Pfizer Comirnaty", dose: "5", antigen: "COVID-19", status: "SUCCESS" },
      { date: "15/04/2023", vaccine: "FLUADQ", name: "Fluad Quad", dose: "1", antigen: "Influenza", status: "SUCCESS" },
      { date: "01/06/2021", vaccine: "COMIRN", name: "Pfizer Comirnaty", dose: "2", antigen: "COVID-19", status: "SUCCESS" },
      { date: "20/03/2015", vaccine: "ADACEL", name: "Adacel", dose: "1", antigen: "dTpa", status: "SUCCESS" },
    ],
  },
  { id: 2, firstName: "James", lastName: "O'Brien", dob: "22/07/1978", gender: "M", medicare: "3456789012", irn: "2", postcode: "3000",
    dueList: [{ disease: "CPF", vaccineDose: "6", dueDate: "01012025" }, { disease: "FLU", vaccineDose: "1", dueDate: "15032025" }],
    history: [
      { date: "05/05/2024", vaccine: "COMIRN", name: "Pfizer Comirnaty", dose: "5", antigen: "COVID-19", status: "SUCCESS" },
      { date: "20/03/2024", vaccine: "FLUADQ", name: "Fluad Quad", dose: "1", antigen: "Influenza", status: "SUCCESS" },
      { date: "10/01/2014", vaccine: "BOOSTR", name: "Boostrix", dose: "1", antigen: "dTpa", status: "SUCCESS" },
    ],
  },
  { id: 3, firstName: "Emily", lastName: "Wang", dob: "08/11/1992", gender: "F", medicare: "4567890123", irn: "1", postcode: "4000",
    dueList: [{ disease: "CPF", vaccineDose: "4", dueDate: "01062026" }],
    history: [
      { date: "10/01/2025", vaccine: "MODERN", name: "Moderna Spikevax", dose: "3", antigen: "COVID-19", status: "SUCCESS" },
      { date: "12/04/2025", vaccine: "FLUVRX", name: "Fluarix Tetra", dose: "1", antigen: "Influenza", status: "SUCCESS" },
      { date: "15/10/2024", vaccine: "ADACEL", name: "Adacel", dose: "1", antigen: "dTpa", status: "SUCCESS" },
    ],
  },
  { id: 4, firstName: "Michael", lastName: "Thompson", dob: "30/01/1960", gender: "M", medicare: "5678901234", irn: "3", postcode: "2010",
    dueList: [{ disease: "FLU", vaccineDose: "1", dueDate: "01032025" }, { disease: "HZV", vaccineDose: "1", dueDate: "01012025" }, { disease: "PNE", vaccineDose: "1", dueDate: "30012025" }],
    history: [
      { date: "01/04/2023", vaccine: "FLUADQ", name: "Fluad Quad", dose: "1", antigen: "Influenza", status: "SUCCESS" },
      { date: "15/03/2022", vaccine: "COMIRN", name: "Pfizer Comirnaty", dose: "3", antigen: "COVID-19", status: "SUCCESS" },
    ],
  },
  { id: 5, firstName: "Priya", lastName: "Sharma", dob: "12/06/1995", gender: "F", medicare: "6789012345", irn: "1", postcode: "2060",
    dueList: [],
    history: [
      { date: "20/02/2026", vaccine: "COMIRN", name: "Pfizer Comirnaty", dose: "5", antigen: "COVID-19", status: "SUCCESS" },
      { date: "01/04/2026", vaccine: "FLUVRX", name: "Fluarix Tetra", dose: "1", antigen: "Influenza", status: "SUCCESS" },
      { date: "15/01/2025", vaccine: "ADACEL", name: "Adacel", dose: "1", antigen: "dTpa", status: "SUCCESS" },
    ],
  },
  { id: 6, firstName: "David", lastName: "Nguyen", dob: "05/09/1988", gender: "M", medicare: "7890123456", irn: "2", postcode: "5000",
    dueList: [{ disease: "FLU", vaccineDose: "1", dueDate: "01042026" }],
    history: [
      { date: "10/03/2025", vaccine: "COMIRN", name: "Pfizer Comirnaty", dose: "4", antigen: "COVID-19", status: "SUCCESS" },
      { date: "15/04/2025", vaccine: "FLUVRX", name: "Fluarix Tetra", dose: "1", antigen: "Influenza", status: "SUCCESS" },
    ],
  },
  { id: 7, firstName: "Rachel", lastName: "Kim", dob: "18/02/2001", gender: "F", medicare: "8901234567", irn: "1", postcode: "2040",
    dueList: [{ disease: "HPV", vaccineDose: "2", dueDate: "15072026" }],
    history: [
      { date: "01/06/2025", vaccine: "GARDSQ", name: "Gardasil 9", dose: "1", antigen: "HPV", status: "SUCCESS" },
      { date: "15/03/2026", vaccine: "FLUADQ", name: "Fluad Quad", dose: "1", antigen: "Influenza", status: "SUCCESS" },
      { date: "20/01/2025", vaccine: "COMIRN", name: "Pfizer Comirnaty", dose: "3", antigen: "COVID-19", status: "SUCCESS" },
    ],
  },
  { id: 8, firstName: "Thomas", lastName: "Brown", dob: "25/12/1956", gender: "M", medicare: "9012345678", irn: "1", postcode: "6000",
    dueList: [{ disease: "CPF", vaccineDose: "5", dueDate: "01112024" }, { disease: "FLU", vaccineDose: "1", dueDate: "01032025" }],
    history: [
      { date: "15/10/2023", vaccine: "COMIRN", name: "Pfizer Comirnaty", dose: "4", antigen: "COVID-19", status: "SUCCESS" },
      { date: "01/04/2023", vaccine: "INFLVX", name: "Influvac Tetra", dose: "1", antigen: "Influenza", status: "SUCCESS" },
      { date: "20/06/2024", vaccine: "ZOSTAV", name: "Shingrix", dose: "1", antigen: "Herpes Zoster", status: "SUCCESS" },
    ],
  },
  { id: 9, firstName: "Lisa", lastName: "Anderson", dob: "14/08/1958", gender: "F", medicare: "1234509876", irn: "2", postcode: "7000",
    dueList: [],
    history: [
      { date: "01/02/2025", vaccine: "ZOSTAV", name: "Shingrix", dose: "2", antigen: "Herpes Zoster", status: "SUCCESS" },
      { date: "15/08/2024", vaccine: "ZOSTAV", name: "Shingrix", dose: "1", antigen: "Herpes Zoster", status: "SUCCESS" },
      { date: "20/03/2026", vaccine: "FLUADQ", name: "Fluad Quad", dose: "1", antigen: "Influenza", status: "SUCCESS" },
      { date: "10/01/2025", vaccine: "COMIRN", name: "Pfizer Comirnaty", dose: "5", antigen: "COVID-19", status: "SUCCESS" },
      { date: "05/11/2024", vaccine: "PRVNAR", name: "Prevenar 13", dose: "1", antigen: "Pneumococcal", status: "SUCCESS" },
    ],
  },
  { id: 10, firstName: "Ahmed", lastName: "Hassan", dob: "03/04/1990", gender: "M", medicare: "2345678901", irn: "1", postcode: "2170",
    dueList: [], history: [],
    error: { code: "AIR-W-1004", message: "Individual was not found. Please either correct the individual details or confirm and accept individual details are correct" },
  },
  { id: 11, firstName: "Margaret", lastName: "Clarke", dob: "12/05/1955", gender: "F", medicare: "3451234567", irn: "1", postcode: "2031",
    dueList: [{ disease: "FLU", vaccineDose: "1", dueDate: "01032025" }, { disease: "PNE", vaccineDose: "1", dueDate: "01012025" }],
    history: [
      { date: "01/04/2025", vaccine: "FLUADQ", name: "Fluad Quad", dose: "1", antigen: "Influenza", status: "SUCCESS" },
      { date: "20/09/2024", vaccine: "COMIRN", name: "Pfizer Comirnaty", dose: "5", antigen: "COVID-19", status: "SUCCESS" },
      { date: "15/03/2020", vaccine: "ADACEL", name: "Adacel", dose: "1", antigen: "dTpa", status: "SUCCESS" },
    ],
  },
  { id: 12, firstName: "Robert", lastName: "Taylor", dob: "28/09/1952", gender: "M", medicare: "4562345678", irn: "2", postcode: "3150",
    dueList: [{ disease: "HZV", vaccineDose: "2", dueDate: "01082025" }],
    history: [
      { date: "01/02/2025", vaccine: "ZOSTAV", name: "Shingrix", dose: "1", antigen: "Herpes Zoster", status: "SUCCESS" },
      { date: "10/04/2024", vaccine: "FLUADQ", name: "Fluad Quad", dose: "1", antigen: "Influenza", status: "SUCCESS" },
      { date: "01/08/2024", vaccine: "COMIRN", name: "Pfizer Comirnaty", dose: "4", antigen: "COVID-19", status: "SUCCESS" },
      { date: "15/03/2024", vaccine: "PRVNAR", name: "Prevenar 13", dose: "1", antigen: "Pneumococcal", status: "SUCCESS" },
    ],
  },
  { id: 13, firstName: "Susan", lastName: "White", dob: "07/03/1961", gender: "F", medicare: "5673456789", irn: "1", postcode: "4051",
    dueList: [{ disease: "FLU", vaccineDose: "1", dueDate: "01042026" }, { disease: "HZV", vaccineDose: "1", dueDate: "01072025" }],
    history: [
      { date: "15/09/2025", vaccine: "COMIRN", name: "Pfizer Comirnaty", dose: "5", antigen: "COVID-19", status: "SUCCESS" },
    ],
  },
  { id: 14, firstName: "Daniel", lastName: "Lee", dob: "19/11/1970", gender: "M", medicare: "6784567890", irn: "3", postcode: "2113",
    dueList: [],
    history: [
      { date: "01/02/2026", vaccine: "FLUADQ", name: "Fluad Quad", dose: "1", antigen: "Influenza", status: "SUCCESS" },
      { date: "20/11/2025", vaccine: "MODERN", name: "Moderna Spikevax", dose: "4", antigen: "COVID-19", status: "SUCCESS" },
      { date: "05/06/2023", vaccine: "ADACEL", name: "Adacel", dose: "1", antigen: "dTpa", status: "SUCCESS" },
      { date: "10/10/2024", vaccine: "ZOSTAV", name: "Shingrix", dose: "2", antigen: "Herpes Zoster", status: "SUCCESS" },
      { date: "01/04/2024", vaccine: "ZOSTAV", name: "Shingrix", dose: "1", antigen: "Herpes Zoster", status: "SUCCESS" },
    ],
  },
  { id: 15, firstName: "Helen", lastName: "Wilson", dob: "23/06/1957", gender: "F", medicare: "7895678901", irn: "1", postcode: "5041",
    dueList: [{ disease: "FLU", vaccineDose: "1", dueDate: "01032025" }, { disease: "CPF", vaccineDose: "6", dueDate: "01012025" }],
    history: [
      { date: "01/06/2024", vaccine: "COMIRN", name: "Pfizer Comirnaty", dose: "5", antigen: "COVID-19", status: "SUCCESS" },
      { date: "10/04/2024", vaccine: "FLUADQ", name: "Fluad Quad", dose: "1", antigen: "Influenza", status: "SUCCESS" },
      { date: "01/11/2023", vaccine: "ZOSTAV", name: "Shingrix", dose: "2", antigen: "Herpes Zoster", status: "SUCCESS" },
      { date: "01/05/2023", vaccine: "ZOSTAV", name: "Shingrix", dose: "1", antigen: "Herpes Zoster", status: "SUCCESS" },
      { date: "15/10/2022", vaccine: "PRVNAR", name: "Prevenar 13", dose: "1", antigen: "Pneumococcal", status: "SUCCESS" },
    ],
  },
];

// Generate additional patients with varied history
const generateBulkPatients = () => {
  const firstNames = ["Oliver","Charlotte","William","Amelia","Jack","Mia","Noah","Isla","Leo","Grace","Ethan","Chloe","Liam","Sophie","Lucas","Ruby","Henry","Ella","Alexander","Lily","Samuel","Zoe","Benjamin","Ava","Max","Olivia","Oscar","Emma","Jake","Matilda","Ryan","Sienna","Nathan","Harper","Connor","Aria","Kai","Luna","George","Evelyn","Arthur","Isabella","Hugo","Violet","Felix","Piper","Theodore","Hazel","Sebastian","Aurora"];
  const lastNames = ["Smith","Jones","Williams","Brown","Wilson","Taylor","Johnson","White","Martin","Anderson","Clark","Lewis","Walker","Hall","Harris","Young","King","Wright","Green","Baker","Adams","Nelson","Hill","Moore","Lee","Turner","Campbell","Phillips","Parker","Evans","Collins","Stewart","Rogers","Cook","Murphy","Watson","Morgan","Cooper","Bennett","Howard","Foster","Kelly","Price","Russell","Gray"];

  const more = [];
  const vaccineOptions = ["COMIRN","MODERN","FLUADQ","FLUVRX","INFLVX","ZOSTAV","ADACEL","BOOSTR","PRVNAR","GARDSQ"];
  const rng = (seed) => { let s = seed; return () => { s = (s * 16807 + 1) % 2147483647; return s / 2147483647; }; };
  const rand = rng(42);

  for (let i = 16; i <= 55; i++) {
    const fn = firstNames[Math.floor(rand() * firstNames.length)];
    const ln = lastNames[Math.floor(rand() * lastNames.length)];
    const birthYear = 1945 + Math.floor(rand() * 60);
    const birthMonth = 1 + Math.floor(rand() * 12);
    const birthDay = 1 + Math.floor(rand() * 28);
    const dob = `${String(birthDay).padStart(2,"0")}/${String(birthMonth).padStart(2,"0")}/${birthYear}`;
    const gender = rand() > 0.5 ? "F" : "M";
    const age = 2026 - birthYear;

    // Generate varied history
    const history = [];
    // Maybe flu shots from various years
    if (rand() > 0.3) {
      const fluYear = 2023 + Math.floor(rand() * 3); // 2023-2025
      if (fluYear <= 2025) {
        const fluVac = ["FLUADQ","FLUVRX","INFLVX","AFLURI"][Math.floor(rand()*4)];
        history.push({ date: `${10+Math.floor(rand()*18)}/${String(3+Math.floor(rand()*4)).padStart(2,"0")}/${fluYear}`, vaccine: fluVac, name: VACCINE_DB[fluVac].name, dose: "1", antigen: "Influenza", status: "SUCCESS" });
      }
    }
    // Some get 2026 flu
    if (rand() > 0.7) {
      history.push({ date: `${String(5+Math.floor(rand()*20)).padStart(2,"0")}/01/2026`, vaccine: "FLUADQ", name: "Fluad Quad", dose: "1", antigen: "Influenza", status: "SUCCESS" });
    }
    // COVID doses
    const covidDoses = Math.floor(rand() * 6);
    for (let cd = 0; cd < covidDoses; cd++) {
      const cYear = 2021 + Math.floor(rand() * 5);
      const cMonth = 1 + Math.floor(rand() * 12);
      const cVac = rand() > 0.5 ? "COMIRN" : "MODERN";
      history.push({ date: `${String(1+Math.floor(rand()*28)).padStart(2,"0")}/${String(cMonth).padStart(2,"0")}/${cYear}`, vaccine: cVac, name: VACCINE_DB[cVac].name, dose: String(cd+1), antigen: "COVID-19", status: "SUCCESS" });
    }
    // Shingrix for 50+
    if (age >= 50) {
      const shingDoses = rand() > 0.6 ? (rand() > 0.5 ? 2 : 1) : 0;
      if (shingDoses >= 1) history.push({ date: `15/06/2024`, vaccine: "ZOSTAV", name: "Shingrix", dose: "1", antigen: "Herpes Zoster", status: "SUCCESS" });
      if (shingDoses >= 2) history.push({ date: `15/12/2024`, vaccine: "ZOSTAV", name: "Shingrix", dose: "2", antigen: "Herpes Zoster", status: "SUCCESS" });
    }
    // dTpa
    if (rand() > 0.5) {
      const dtpaYear = 2010 + Math.floor(rand() * 16);
      const dtpaVac = rand() > 0.5 ? "ADACEL" : "BOOSTR";
      history.push({ date: `${String(1+Math.floor(rand()*28)).padStart(2,"0")}/${String(1+Math.floor(rand()*12)).padStart(2,"0")}/${dtpaYear}`, vaccine: dtpaVac, name: VACCINE_DB[dtpaVac].name, dose: "1", antigen: "dTpa", status: "SUCCESS" });
    }
    // Pneumococcal for 65+
    if (age >= 65 && rand() > 0.6) {
      history.push({ date: `10/08/2024`, vaccine: "PRVNAR", name: "Prevenar 13", dose: "1", antigen: "Pneumococcal", status: "SUCCESS" });
    }

    // Build dueList from what they're missing
    const dueList = [];
    const hasFlu2026 = history.some(h => h.antigen === "Influenza" && h.date.endsWith("/2026"));
    if (!hasFlu2026 && rand() > 0.3) dueList.push({ disease: "FLU", vaccineDose: "1", dueDate: "01032026" });
    const covidRecent = history.some(h => h.antigen === "COVID-19" && (h.date.includes("/2025") || h.date.includes("/2026")));
    if (!covidRecent && rand() > 0.4) dueList.push({ disease: "CPF", vaccineDose: String(covidDoses+1), dueDate: rand() > 0.5 ? "01012025" : "01072026" });

    more.push({
      id: i, firstName: fn, lastName: ln, dob, gender,
      medicare: String(1000000000 + Math.floor(rand() * 9000000000)),
      irn: String(1 + Math.floor(rand() * 9)),
      postcode: String(2000 + Math.floor(rand() * 6000)),
      dueList, history,
    });
  }
  return [...SEED_PATIENTS, ...more];
};

const ALL_PATIENTS = generateBulkPatients();

// ─── Utility helpers ─────────────────────────────────────────────────
const parseDueDate = (d) => {
  if (!d || d.length !== 8) return new Date(2099,0,1);
  return new Date(parseInt(d.slice(4,8)), parseInt(d.slice(2,4))-1, parseInt(d.slice(0,2)));
};
const formatDueDate = (d) => {
  if (!d || d.length !== 8) return "—";
  return `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4,8)}`;
};
const TODAY = new Date(2026, 1, 11);
const FLU_CODES = ["FLU","INF","INFLZ"];
const COVID_CODES = ["CPF","COV","COV19"];
const isFlu = (code) => FLU_CODES.includes(code);
const isCovid = (code) => COVID_CODES.includes(code);

const getPatientEligibility = (p) => {
  const due = p.dueList || [];
  const fluDue = due.filter(d => isFlu(d.disease));
  const covidDue = due.filter(d => isCovid(d.disease));
  const nipDue = due.filter(d => !isFlu(d.disease) && !isCovid(d.disease));
  const overdue = due.filter(d => parseDueDate(d.dueDate) < TODAY);
  return { fluDue, covidDue, nipDue, overdue, allDue: due, upToDate: due.length === 0 && !p.error };
};

const getAge = (dob) => {
  const [d,m,y] = dob.split("/");
  return Math.floor((TODAY - new Date(y, m-1, d)) / (86400000 * 365.25));
};

// ─── App Component ───────────────────────────────────────────────────
export default function App() {
  const [currentPage, setCurrentPage] = useState("eligibility");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [basicFilter, setBasicFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadStep, setUploadStep] = useState("upload");
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [lookupRunning, setLookupRunning] = useState(false);
  const [lookupProgress, setLookupProgress] = useState(0);
  const [lookupComplete, setLookupComplete] = useState(true);

  // ─── Clinic Mode State ───────────────────────────────────────────
  const [clinicMode, setClinicMode] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customVaccine, setCustomVaccine] = useState("FLU");
  const [customTimeframe, setCustomTimeframe] = useState("this_year");
  const [customMode, setCustomMode] = useState("has_not");
  const [customDoseCount, setCustomDoseCount] = useState(2);
  const [customMinAge, setCustomMinAge] = useState("");
  const [customMaxAge, setCustomMaxAge] = useState("");
  const [customActive, setCustomActive] = useState(false);

  // Build custom filter function
  const customFilterFn = useCallback((p) => {
    if (p.error) return false;
    // Age filter
    if (customMinAge || customMaxAge) {
      const age = getAge(p.dob);
      if (customMinAge && age < parseInt(customMinAge)) return false;
      if (customMaxAge && age > parseInt(customMaxAge)) return false;
    }
    const vaccCat = VACCINE_CATEGORIES_FOR_FILTER.find(v => v.value === customVaccine);
    if (!vaccCat) return false;
    const matchingHistory = (p.history || []).filter(vaccCat.matchFn);

    // Timeframe
    const tf = TIMEFRAME_OPTIONS.find(t => t.value === customTimeframe);
    let cutoff;
    if (tf.startDate) {
      cutoff = tf.startDate;
    } else if (tf.months) {
      cutoff = new Date(TODAY);
      cutoff.setMonth(cutoff.getMonth() - tf.months);
    } else {
      cutoff = new Date(1900, 0, 1);
    }
    const inTimeframe = matchingHistory.filter(h => {
      const [d,m,y] = h.date.split("/");
      return new Date(y, m-1, d) >= cutoff;
    });

    if (customMode === "has_not") return inTimeframe.length === 0;
    if (customMode === "has") return inTimeframe.length > 0;
    if (customMode === "fewer_than") return inTimeframe.length < customDoseCount;
    return false;
  }, [customVaccine, customTimeframe, customMode, customDoseCount, customMinAge, customMaxAge]);

  const applyCustomFilter = () => {
    setActivePreset(null);
    setCustomActive(true);
    setClinicMode(true);
  };
  const clearClinicMode = () => {
    setClinicMode(false);
    setActivePreset(null);
    setCustomActive(false);
    setShowCustom(false);
  };

  // Simulate bulk lookup
  const runBulkLookup = () => {
    setLookupRunning(true); setLookupComplete(false); setLookupProgress(0);
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setLookupProgress(Math.round((current / ALL_PATIENTS.length) * 100));
      if (current >= ALL_PATIENTS.length) { clearInterval(interval); setLookupRunning(false); setLookupComplete(true); }
    }, 60);
  };

  const runSubmit = () => {
    setSubmitting(true); setSubmitProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 15;
      if (p >= 100) { p = 100; clearInterval(interval); setTimeout(() => { setSubmitting(false); setUploadStep("results"); }, 500); }
      setSubmitProgress(Math.round(p));
    }, 300);
  };

  // ─── Compute Stats & Filtering ─────────────────────────────────
  const stats = useMemo(() => ({
    total: ALL_PATIENTS.length,
    upToDate: ALL_PATIENTS.filter(p => getPatientEligibility(p).upToDate).length,
    due: ALL_PATIENTS.filter(p => { const e = getPatientEligibility(p); return e.allDue.length > 0 && e.overdue.length === 0; }).length,
    overdue: ALL_PATIENTS.filter(p => getPatientEligibility(p).overdue.length > 0).length,
    errors: ALL_PATIENTS.filter(p => p.error).length,
    fluEligible: ALL_PATIENTS.filter(p => getPatientEligibility(p).fluDue.length > 0).length,
    covidEligible: ALL_PATIENTS.filter(p => getPatientEligibility(p).covidDue.length > 0).length,
  }), []);

  // Active clinic filter info
  const activeClinic = activePreset ? CLINIC_PRESETS.find(c => c.id === activePreset) : null;

  const filteredPatients = useMemo(() => {
    let result = ALL_PATIENTS.filter(p => {
      const matchesSearch = searchTerm === "" || `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) || p.medicare.includes(searchTerm);
      return matchesSearch;
    });

    // Apply clinic mode filter
    if (clinicMode && activeClinic) {
      result = result.filter(activeClinic.filterFn);
      if (activeClinic.sortKey) {
        result.sort((a, b) => {
          const sa = activeClinic.sortKey(a);
          const sb = activeClinic.sortKey(b);
          return sa < sb ? -1 : sa > sb ? 1 : 0;
        });
      }
    } else if (clinicMode && customActive) {
      result = result.filter(customFilterFn);
    } else {
      // Basic filters
      result = result.filter(p => {
        const e = getPatientEligibility(p);
        if (basicFilter === "all") return true;
        if (basicFilter === "flu") return e.fluDue.length > 0;
        if (basicFilter === "covid") return e.covidDue.length > 0;
        if (basicFilter === "nip") return e.nipDue.length > 0;
        if (basicFilter === "overdue") return e.overdue.length > 0;
        if (basicFilter === "uptodate") return e.upToDate;
        if (basicFilter === "errors") return !!p.error;
        return true;
      });
    }
    return result;
  }, [searchTerm, basicFilter, clinicMode, activeClinic, customActive, customFilterFn]);

  // Clinic preset match counts
  const presetCounts = useMemo(() => {
    const counts = {};
    CLINIC_PRESETS.forEach(p => { counts[p.id] = ALL_PATIENTS.filter(pt => !pt.error && p.filterFn(pt)).length; });
    return counts;
  }, []);

  // Custom filter count
  const customCount = useMemo(() => {
    if (!customActive && !showCustom) return 0;
    return ALL_PATIENTS.filter(customFilterFn).length;
  }, [customFilterFn, customActive, showCustom]);

  return (
    <div style={{ minHeight: "100vh", background: "#0B0F1A", color: "#E2E8F0", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #1A1F2E; }
        ::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
        .card-hover { transition: all 0.2s ease; }
        .card-hover:hover { transform: translateY(-1px); box-shadow: 0 8px 25px rgba(0,0,0,0.3); }
        .btn-primary { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; transition: all 0.2s; font-family: inherit; }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(16,185,129,0.3); }
        .btn-secondary { background: #1E293B; color: #94A3B8; border: 1px solid #334155; padding: 10px 20px; border-radius: 8px; font-weight: 500; cursor: pointer; font-size: 14px; transition: all 0.2s; font-family: inherit; }
        .btn-secondary:hover { background: #334155; color: #E2E8F0; }
        .nav-item { padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 14px; transition: all 0.15s; border: none; background: transparent; color: #94A3B8; font-family: inherit; }
        .nav-item:hover { background: #1E293B; color: #E2E8F0; }
        .nav-item.active { background: linear-gradient(135deg, #10B98120, #05966910); color: #10B981; border: 1px solid #10B98130; }
        .filter-chip { padding: 7px 14px; border-radius: 20px; cursor: pointer; font-size: 13px; font-weight: 500; border: 1px solid #334155; background: #1A1F2E; color: #94A3B8; transition: all 0.15s; font-family: inherit; white-space: nowrap; }
        .filter-chip:hover { border-color: #10B981; color: #E2E8F0; }
        .filter-chip.active { background: #10B98120; border-color: #10B981; color: #10B981; }
        .status-badge { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .eligibility-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; }
        .progress-bar { height: 4px; background: #1E293B; border-radius: 2px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #10B981, #34D399); border-radius: 2px; transition: width 0.3s ease; }
        input[type="text"], input[type="search"], input[type="number"], select {
          background: #1A1F2E; border: 1px solid #334155; color: #E2E8F0; padding: 10px 14px; border-radius: 8px; font-size: 14px; font-family: inherit; outline: none; transition: border-color 0.2s;
        }
        input:focus, select:focus { border-color: #10B981; }
        select { cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394A3B8' d='M2 4l4 4 4-4'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; }
        .drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; backdrop-filter: blur(4px); }
        .drawer { position: fixed; right: 0; top: 0; bottom: 0; width: min(560px, 92vw); background: #111827; z-index: 101; overflow-y: auto; box-shadow: -20px 0 60px rgba(0,0,0,0.5); animation: slideIn 0.25s ease; }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .clinic-card { background: #111827; border: 1px solid #1E293B; border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; }
        .clinic-card:hover { border-color: #334155; transform: translateY(-1px); box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
        .clinic-card.selected { border-width: 2px; }
        .clinic-panel { background: #0D1117; border: 1px solid #1E293B; border-radius: 14px; padding: 20px; margin-bottom: 20px; animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .custom-builder { background: #111827; border: 1px solid #1E293B; border-radius: 12px; padding: 20px; margin-top: 16px; animation: fadeIn 0.2s ease; }
        .clinic-banner { padding: 14px 20px; border-radius: 10px; display: flex; align-items: center; gap: 12px; margin-bottom: 16px; animation: fadeIn 0.15s ease; }
        .upload-zone { border: 2px dashed #334155; border-radius: 12px; padding: 48px; text-align: center; cursor: pointer; transition: all 0.2s; }
        .upload-zone:hover { border-color: #10B981; background: #10B98108; }
        .validation-row { display: grid; grid-template-columns: 0.3fr 1fr 0.5fr 1fr 1fr 0.8fr 0.8fr 0.6fr 0.5fr; gap: 4px; padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #1E293B; align-items: center; }
        .cell-error { background: #EF444420; border: 1px solid #EF444440; border-radius: 4px; padding: 2px 6px; color: #FCA5A5; }
        .cell-ok { padding: 2px 6px; }
      `}</style>

      {/* ─── Navbar ─── */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: "1px solid #1E293B", background: "#0D1117" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg, #10B981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16 }}>A</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#F1F5F9", letterSpacing: "-0.02em" }}>AIR Bulk Manager</div>
            <div style={{ fontSize: 11, color: "#64748B", fontFamily: "'JetBrains Mono', monospace" }}>v1.1 • Vendor Environment</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button className={`nav-item ${currentPage === "eligibility" ? "active" : ""}`} onClick={() => setCurrentPage("eligibility")}>📊 Eligibility</button>
          <button className={`nav-item ${currentPage === "upload" ? "active" : ""}`} onClick={() => { setCurrentPage("upload"); setUploadStep("upload"); }}>📤 Upload</button>
          <button className={`nav-item ${currentPage === "history" ? "active" : ""}`} onClick={() => setCurrentPage("history")}>📜 History</button>
          <button className={`nav-item ${currentPage === "settings" ? "active" : ""}`} onClick={() => setCurrentPage("settings")}>⚙️ Settings</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
          <span style={{ fontSize: 13, color: "#94A3B8" }}>PRODA Connected</span>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1E293B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600 }}>DM</div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ─── ELIGIBILITY DASHBOARD ─── */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {currentPage === "eligibility" && (
        <div style={{ padding: "24px", maxWidth: 1440, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: "#F1F5F9", letterSpacing: "-0.02em" }}>Vaccination Eligibility Dashboard</h1>
              <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>
                {stats.total} patients • Last updated: 11 Feb 2026, 9:15 AM
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-secondary" onClick={runBulkLookup} disabled={lookupRunning}>
                {lookupRunning ? `Looking up... ${lookupProgress}%` : "🔄 Refresh Lookup"}
              </button>
              <button className="btn-primary">📥 Export Report</button>
            </div>
          </div>

          {/* Lookup progress */}
          {lookupRunning && (
            <div style={{ marginBottom: 20, background: "#1A1F2E", borderRadius: 10, padding: 16, border: "1px solid #334155" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "#94A3B8" }}>Looking up {stats.total} patients on AIR...</span>
                <span style={{ fontSize: 13, color: "#10B981", fontFamily: "'JetBrains Mono', monospace" }}>{lookupProgress}%</span>
              </div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${lookupProgress}%` }} /></div>
            </div>
          )}

          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Up to Date", value: stats.upToDate, color: "#10B981", bg: "#10B98115", icon: "✅", fk: "uptodate" },
              { label: "Due Soon", value: stats.due, color: "#F59E0B", bg: "#F59E0B15", icon: "📅", fk: "all" },
              { label: "Overdue", value: stats.overdue, color: "#EF4444", bg: "#EF444415", icon: "⚠️", fk: "overdue" },
              { label: "Flu Eligible", value: stats.fluEligible, color: "#3B82F6", bg: "#3B82F615", icon: "💉", fk: "flu" },
              { label: "COVID Eligible", value: stats.covidEligible, color: "#8B5CF6", bg: "#8B5CF615", icon: "🦠", fk: "covid" },
              { label: "Errors", value: stats.errors, color: "#EF4444", bg: "#EF444410", icon: "❌", fk: "errors" },
            ].map((card, i) => (
              <div key={i} className="card-hover" style={{ background: card.bg, borderRadius: 10, padding: "16px 14px", border: `1px solid ${card.color}20`, cursor: "pointer" }}
                onClick={() => { clearClinicMode(); setBasicFilter(card.fk); }}>
                <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>{card.icon} {card.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: card.color, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* ──────────────────────────────────────────────────────── */}
          {/* ─── CLINIC MODE PANEL ─── */}
          {/* ──────────────────────────────────────────────────────── */}
          <div className="clinic-panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>🏥</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#F1F5F9" }}>Clinic Mode</div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>Smart filters based on vaccination history — find who needs what</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {(clinicMode) && (
                  <button className="btn-secondary" style={{ fontSize: 12, padding: "6px 14px" }} onClick={clearClinicMode}>✕ Clear Filter</button>
                )}
                <button
                  className="btn-secondary"
                  style={{ fontSize: 12, padding: "6px 14px", borderColor: showCustom ? "#10B981" : undefined, color: showCustom ? "#10B981" : undefined }}
                  onClick={() => setShowCustom(!showCustom)}
                >
                  🔧 Custom Filter
                </button>
              </div>
            </div>

            {/* Preset Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
              {CLINIC_PRESETS.map(preset => {
                const isActive = activePreset === preset.id && clinicMode;
                return (
                  <div
                    key={preset.id}
                    className={`clinic-card ${isActive ? "selected" : ""}`}
                    style={{ borderColor: isActive ? preset.color : undefined }}
                    onClick={() => {
                      if (isActive) { clearClinicMode(); } else {
                        setActivePreset(preset.id); setCustomActive(false); setClinicMode(true); setShowCustom(false);
                      }
                    }}
                  >
                    {isActive && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: preset.color }} />}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 20 }}>{preset.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#F1F5F9" }}>{preset.label}</div>
                        <div style={{ fontSize: 11, color: "#64748B" }}>{preset.sublabel}</div>
                      </div>
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: preset.color }}>
                      {presetCounts[preset.id]}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>patients match</div>
                  </div>
                );
              })}
            </div>

            {/* Custom Filter Builder */}
            {showCustom && (
              <div className="custom-builder">
                <div style={{ fontWeight: 600, fontSize: 14, color: "#F1F5F9", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>🔧</span> Build Custom Filter
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
                  <div>
                    <label style={{ fontSize: 12, color: "#64748B", display: "block", marginBottom: 4 }}>Show patients who</label>
                    <select value={customMode} onChange={e => setCustomMode(e.target.value)} style={{ width: 180 }}>
                      {FILTER_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  {customMode === "fewer_than" && (
                    <div>
                      <label style={{ fontSize: 12, color: "#64748B", display: "block", marginBottom: 4 }}>Doses</label>
                      <input type="number" min="1" max="10" value={customDoseCount} onChange={e => setCustomDoseCount(parseInt(e.target.value) || 1)} style={{ width: 70 }} />
                    </div>
                  )}
                  <div>
                    <label style={{ fontSize: 12, color: "#64748B", display: "block", marginBottom: 4 }}>Vaccine</label>
                    <select value={customVaccine} onChange={e => setCustomVaccine(e.target.value)} style={{ width: 200 }}>
                      {VACCINE_CATEGORIES_FOR_FILTER.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#64748B", display: "block", marginBottom: 4 }}>Timeframe</label>
                    <select value={customTimeframe} onChange={e => setCustomTimeframe(e.target.value)} style={{ width: 170 }}>
                      {TIMEFRAME_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#64748B", display: "block", marginBottom: 4 }}>Min Age</label>
                    <input type="number" min="0" max="120" value={customMinAge} onChange={e => setCustomMinAge(e.target.value)} placeholder="Any" style={{ width: 70 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#64748B", display: "block", marginBottom: 4 }}>Max Age</label>
                    <input type="number" min="0" max="120" value={customMaxAge} onChange={e => setCustomMaxAge(e.target.value)} placeholder="Any" style={{ width: 70 }} />
                  </div>
                  <button className="btn-primary" style={{ padding: "10px 16px" }} onClick={applyCustomFilter}>
                    Apply ({customCount} match)
                  </button>
                </div>
                <div style={{ marginTop: 12, padding: "10px 14px", background: "#0B0F1A", borderRadius: 8, fontSize: 13, color: "#94A3B8" }}>
                  <span style={{ color: "#F1F5F9", fontWeight: 500 }}>Preview:</span>{" "}
                  Show patients {customMinAge ? `aged ${customMinAge}${customMaxAge ? `-${customMaxAge}` : "+"}` : customMaxAge ? `under ${customMaxAge}` : ""} who{" "}
                  <span style={{ color: "#10B981", fontWeight: 600 }}>
                    {customMode === "has_not" ? "have NOT had" : customMode === "has" ? "have had" : `have fewer than ${customDoseCount} doses of`}
                  </span>{" "}
                  <span style={{ color: "#3B82F6", fontWeight: 600 }}>{VACCINE_CATEGORIES_FOR_FILTER.find(v => v.value === customVaccine)?.label}</span>{" "}
                  {customTimeframe === "ever" ? "ever" : `in the ${TIMEFRAME_OPTIONS.find(t => t.value === customTimeframe)?.label.toLowerCase()}`}
                  {" "}→{" "}
                  <span style={{ color: "#F59E0B", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{customCount} patients</span>
                </div>
              </div>
            )}
          </div>

          {/* Active Clinic Banner */}
          {clinicMode && activeClinic && (
            <div className="clinic-banner" style={{ background: `${activeClinic.color}12`, border: `1px solid ${activeClinic.color}30` }}>
              <span style={{ fontSize: 24 }}>{activeClinic.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: activeClinic.color, fontSize: 15 }}>
                  {activeClinic.label}: {filteredPatients.length} patients
                </div>
                <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 2 }}>{activeClinic.description}</div>
              </div>
              <button className="btn-primary" style={{ fontSize: 12, padding: "8px 14px" }}>📥 Export This List</button>
            </div>
          )}

          {clinicMode && customActive && !activeClinic && (
            <div className="clinic-banner" style={{ background: "#10B98112", border: "1px solid #10B98130" }}>
              <span style={{ fontSize: 24 }}>🔧</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#10B981", fontSize: 15 }}>
                  Custom Filter: {filteredPatients.length} patients
                </div>
                <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 2 }}>
                  {customMode === "has_not" ? "Have NOT had" : customMode === "has" ? "Have had" : `Fewer than ${customDoseCount} doses of`}
                  {" "}{VACCINE_CATEGORIES_FOR_FILTER.find(v => v.value === customVaccine)?.label}
                  {" "}{customTimeframe === "ever" ? "ever" : `in ${TIMEFRAME_OPTIONS.find(t => t.value === customTimeframe)?.label.toLowerCase()}`}
                  {customMinAge ? `, age ${customMinAge}+` : ""}
                  {customMaxAge ? `, under ${customMaxAge}` : ""}
                </div>
              </div>
              <button className="btn-primary" style={{ fontSize: 12, padding: "8px 14px" }}>📥 Export This List</button>
            </div>
          )}

          {/* Basic Filters + Search (when not in clinic mode) */}
          {!clinicMode && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  { key: "all", label: `All (${stats.total})` },
                  { key: "flu", label: `💉 Flu Due (${stats.fluEligible})` },
                  { key: "covid", label: `🦠 COVID Due (${stats.covidEligible})` },
                  { key: "nip", label: "🛡️ NIP Due" },
                  { key: "overdue", label: `⚠️ Overdue (${stats.overdue})` },
                  { key: "uptodate", label: `✅ Up to Date` },
                  { key: "errors", label: `❌ Errors` },
                ].map(f => (
                  <button key={f.key} className={`filter-chip ${basicFilter === f.key ? "active" : ""}`} onClick={() => setBasicFilter(f.key)}>{f.label}</button>
                ))}
              </div>
              <input type="search" placeholder="Search by name or Medicare..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: 260 }} />
            </div>
          )}

          {clinicMode && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: "#64748B" }}>Showing {filteredPatients.length} patients matching clinic filter</span>
              <input type="search" placeholder="Search within results..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: 260 }} />
            </div>
          )}

          {/* ─── Patient Table ─── */}
          <div style={{ background: "#111827", borderRadius: 12, border: "1px solid #1E293B", overflow: "hidden" }}>
            {/* Table header - dynamic columns when clinic mode */}
            {clinicMode && activeClinic ? (
              <div style={{ display: "grid", gridTemplateColumns: `2fr 0.6fr 0.8fr ${activeClinic.extraColumns.map(() => "1fr").join(" ")} 0.4fr`, alignItems: "center", padding: "12px 16px", background: "#0D1117", fontWeight: 600, fontSize: 12, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                <span>Patient</span>
                <span>Age</span>
                <span>Status</span>
                {activeClinic.extraColumns.map((col, i) => <span key={i}>{col.header}</span>)}
                <span></span>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.8fr 0.6fr 0.6fr 0.8fr 0.4fr", alignItems: "center", padding: "12px 16px", background: "#0D1117", fontWeight: 600, fontSize: 12, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px", cursor: "default" }}>
                <span>Patient</span><span>DOB</span><span>Status</span><span>Flu</span><span>COVID</span><span>Other Due</span><span></span>
              </div>
            )}

            <div style={{ maxHeight: 520, overflowY: "auto" }}>
              {filteredPatients.length === 0 && (
                <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>No patients match this filter</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>Try adjusting your filter criteria</div>
                </div>
              )}
              {filteredPatients.map(p => {
                const elig = getPatientEligibility(p);
                const age = getAge(p.dob);

                // Clinic mode rows with extra columns
                if (clinicMode && activeClinic) {
                  return (
                    <div key={p.id}
                      style={{ display: "grid", gridTemplateColumns: `2fr 0.6fr 0.8fr ${activeClinic.extraColumns.map(() => "1fr").join(" ")} 0.4fr`, alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #1E293B", cursor: "pointer", transition: "background 0.1s" }}
                      className="card-hover"
                      onClick={() => setSelectedPatient(p)}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{p.firstName} {p.lastName}</div>
                        <div style={{ fontSize: 12, color: "#64748B", fontFamily: "'JetBrains Mono', monospace" }}>{p.medicare}-{p.irn}</div>
                      </div>
                      <span style={{ fontSize: 13, color: "#94A3B8" }}>{age}</span>
                      <span>
                        {elig.overdue.length > 0 ? (
                          <span className="status-badge" style={{ background: "#EF444420", color: "#FCA5A5" }}>OVERDUE</span>
                        ) : elig.allDue.length > 0 ? (
                          <span className="status-badge" style={{ background: "#F59E0B20", color: "#FCD34D" }}>DUE</span>
                        ) : (
                          <span className="status-badge" style={{ background: "#10B98120", color: "#6EE7B7" }}>OK</span>
                        )}
                      </span>
                      {activeClinic.extraColumns.map((col, i) => {
                        const val = col.key(p);
                        return (
                          <span key={i} style={{ fontSize: 13, color: val.color, fontFamily: val.text.match(/^\d/) ? "'JetBrains Mono', monospace" : "inherit" }}>
                            {val.text}
                          </span>
                        );
                      })}
                      <span style={{ textAlign: "right", color: "#64748B", fontSize: 18 }}>›</span>
                    </div>
                  );
                }

                // Default rows
                return (
                  <div key={p.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.8fr 0.6fr 0.6fr 0.8fr 0.4fr", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #1E293B", cursor: "pointer", transition: "background 0.1s" }}
                    className="card-hover"
                    onClick={() => setSelectedPatient(p)}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.firstName} {p.lastName}</div>
                      <div style={{ fontSize: 12, color: "#64748B", fontFamily: "'JetBrains Mono', monospace" }}>{p.medicare}-{p.irn}</div>
                    </div>
                    <span style={{ fontSize: 13, color: "#94A3B8" }}>{p.dob}</span>
                    <span>
                      {p.error ? (
                        <span className="status-badge" style={{ background: "#EF444420", color: "#FCA5A5" }}>ERROR</span>
                      ) : elig.overdue.length > 0 ? (
                        <span className="status-badge" style={{ background: "#EF444420", color: "#FCA5A5" }}>OVERDUE</span>
                      ) : elig.allDue.length > 0 ? (
                        <span className="status-badge" style={{ background: "#F59E0B20", color: "#FCD34D" }}>DUE</span>
                      ) : (
                        <span className="status-badge" style={{ background: "#10B98120", color: "#6EE7B7" }}>UP TO DATE</span>
                      )}
                    </span>
                    <span>
                      {elig.fluDue.length > 0 ? (
                        <span className="eligibility-dot" style={{ background: "#3B82F620", border: "2px solid #3B82F6", color: "#3B82F6", fontSize: 10, fontWeight: 700 }}>DUE</span>
                      ) : (
                        <span className="eligibility-dot" style={{ background: "#10B98115", color: "#10B981" }}>✓</span>
                      )}
                    </span>
                    <span>
                      {elig.covidDue.length > 0 ? (
                        <span className="eligibility-dot" style={{ background: "#8B5CF620", border: "2px solid #8B5CF6", color: "#8B5CF6", fontSize: 10, fontWeight: 700 }}>DUE</span>
                      ) : p.error ? (
                        <span className="eligibility-dot" style={{ background: "#EF444415", color: "#EF4444" }}>?</span>
                      ) : (
                        <span className="eligibility-dot" style={{ background: "#10B98115", color: "#10B981" }}>✓</span>
                      )}
                    </span>
                    <span style={{ fontSize: 12, color: "#94A3B8" }}>
                      {elig.nipDue.length > 0 ? elig.nipDue.map(d => ANTIGEN_LABELS[d.disease] || d.disease).join(", ") : p.error ? "—" : "None"}
                    </span>
                    <span style={{ textAlign: "right", color: "#64748B", fontSize: 18 }}>›</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#64748B" }}>Showing {filteredPatients.length} of {stats.total} patients</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-secondary" style={{ fontSize: 12, padding: "8px 14px" }}>📋 Export Flu List</button>
              <button className="btn-secondary" style={{ fontSize: 12, padding: "8px 14px" }}>📋 Export COVID List</button>
              <button className="btn-primary" style={{ fontSize: 12, padding: "8px 14px" }}>📥 Export Full Report</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ─── UPLOAD PAGE ─── */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {currentPage === "upload" && (
        <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 0, marginBottom: 32 }}>
            {["Upload Excel", "Validate", "Review & Submit", "Results"].map((step, i) => {
              const stepKeys = ["upload", "validate", "submit", "results"];
              const isActive = stepKeys.indexOf(uploadStep) >= i;
              const isCurrent = stepKeys[i] === uploadStep;
              return (
                <div key={i} style={{ flex: 1, display: "flex", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, background: isCurrent ? "#10B981" : isActive ? "#10B98140" : "#1E293B", color: isActive ? "#fff" : "#64748B" }}>{i + 1}</div>
                    <span style={{ fontSize: 13, fontWeight: isCurrent ? 600 : 400, color: isActive ? "#E2E8F0" : "#64748B" }}>{step}</span>
                  </div>
                  {i < 3 && <div style={{ flex: 1, height: 1, background: isActive ? "#10B98140" : "#1E293B", margin: "0 12px" }} />}
                </div>
              );
            })}
          </div>

          {uploadStep === "upload" && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Upload Vaccination Records</h2>
              <p style={{ color: "#94A3B8", fontSize: 14, marginBottom: 24 }}>Upload an Excel file (.xlsx) with vaccination data to submit to AIR.</p>
              <div className="upload-zone" onClick={() => setUploadStep("validate")}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#E2E8F0", marginBottom: 4 }}>Drop Excel file here or click to browse</div>
                <div style={{ fontSize: 13, color: "#64748B" }}>Accepts .xlsx files up to 10MB • Max 150 records per batch</div>
              </div>
            </div>
          )}

          {uploadStep === "validate" && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Validation Results</h2>
              <div style={{ background: "#10B98115", border: "1px solid #10B98130", borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <span style={{ fontWeight: 600, color: "#6EE7B7" }}>✅ 6 of 8 records passed validation</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-secondary" onClick={() => setUploadStep("upload")}>← Re-upload</button>
                <button className="btn-primary" onClick={() => setUploadStep("submit")}>Continue to Submit →</button>
              </div>
            </div>
          )}

          {uploadStep === "submit" && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Review & Submit</h2>
              <div style={{ background: "#111827", borderRadius: 12, padding: 20, border: "1px solid #1E293B" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
                  <div><div style={{ fontSize: 11, color: "#64748B", textTransform: "uppercase" }}>Records</div><div style={{ fontSize: 24, fontWeight: 700, color: "#10B981" }}>6</div></div>
                  <div><div style={{ fontSize: 11, color: "#64748B", textTransform: "uppercase" }}>Encounters</div><div style={{ fontSize: 24, fontWeight: 700 }}>5</div></div>
                  <div><div style={{ fontSize: 11, color: "#64748B", textTransform: "uppercase" }}>API Batches</div><div style={{ fontSize: 24, fontWeight: 700 }}>1</div></div>
                  <div><div style={{ fontSize: 11, color: "#64748B", textTransform: "uppercase" }}>Provider</div><div style={{ fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>1234567A</div></div>
                </div>
                {submitting ? (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>Submitting to AIR...</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#10B981" }}>{submitProgress}%</span>
                    </div>
                    <div className="progress-bar" style={{ height: 8 }}><div className="progress-fill" style={{ width: `${submitProgress}%` }} /></div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 12 }}>
                    <button className="btn-secondary" onClick={() => setUploadStep("validate")}>← Back</button>
                    <button className="btn-primary" onClick={runSubmit}>🚀 Submit to AIR</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {uploadStep === "results" && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Submission Results</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                <div style={{ background: "#10B98115", borderRadius: 10, padding: 16, border: "1px solid #10B98130" }}>
                  <div style={{ fontSize: 11, color: "#94A3B8" }}>✅ Recorded</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#10B981" }}>4</div>
                </div>
                <div style={{ background: "#F59E0B15", borderRadius: 10, padding: 16, border: "1px solid #F59E0B30" }}>
                  <div style={{ fontSize: 11, color: "#94A3B8" }}>⚠️ Pending</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#F59E0B" }}>1</div>
                </div>
                <div style={{ background: "#EF444415", borderRadius: 10, padding: 16, border: "1px solid #EF444430" }}>
                  <div style={{ fontSize: 11, color: "#94A3B8" }}>❌ Failed</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#EF4444" }}>1</div>
                </div>
              </div>
              <button className="btn-secondary" onClick={() => setUploadStep("upload")}>Upload Another Batch</button>
            </div>
          )}
        </div>
      )}

      {/* ─── History Page ─── */}
      {currentPage === "history" && (
        <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Submission History</h2>
          <div style={{ background: "#111827", borderRadius: 12, border: "1px solid #1E293B", overflow: "hidden" }}>
            {[
              { date: "11 Feb 2026, 9:15 AM", file: "vaccination_records_feb2026.xlsx", records: 6, success: 4, warn: 1, fail: 1 },
              { date: "05 Feb 2026, 10:15 AM", file: "flu_batch_feb.xlsx", records: 45, success: 43, warn: 2, fail: 0 },
              { date: "28 Jan 2026, 3:22 PM", file: "covid_boosters_jan.xlsx", records: 32, success: 30, warn: 1, fail: 1 },
            ].map((h, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid #1E293B", gap: 16 }} className="card-hover">
                <div style={{ fontSize: 22 }}>📄</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{h.file}</div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>{h.date}</div>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
                  <span style={{ color: "#10B981" }}>✅ {h.success}</span>
                  <span style={{ color: "#F59E0B" }}>⚠️ {h.warn}</span>
                  <span style={{ color: "#EF4444" }}>❌ {h.fail}</span>
                </div>
                <span style={{ color: "#64748B" }}>›</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Settings Page ─── */}
      {currentPage === "settings" && (
        <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Settings</h2>
          {[
            { title: "PRODA Configuration", icon: "🔐", fields: [{ label: "Organisation ID", value: "2330016739" }, { label: "Device Name", value: "DavidTestLaptop2" }] },
            { title: "API Environment", icon: "🌐", fields: [{ label: "Environment", value: "Vendor (Test)" }, { label: "Base URL", value: "test.healthclaiming.api.humanservices.gov.au" }] },
            { title: "Provider Details", icon: "🏥", fields: [{ label: "Provider Number", value: "1234567A" }, { label: "Product ID", value: "AIRBulkVax 1.1" }] },
          ].map((section, i) => (
            <div key={i} style={{ background: "#111827", borderRadius: 12, padding: 20, border: "1px solid #1E293B", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 20 }}>{section.icon}</span>
                <div style={{ fontWeight: 600 }}>{section.title}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {section.fields.map((f, j) => (
                  <div key={j}>
                    <label style={{ fontSize: 12, color: "#64748B", display: "block", marginBottom: 4 }}>{f.label}</label>
                    <input type="text" value={f.value} readOnly style={{ width: "100%", background: "#0D1117", border: "1px solid #1E293B", color: "#94A3B8", padding: "8px 12px", borderRadius: 6, fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ─── PATIENT DETAIL DRAWER ─── */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {selectedPatient && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedPatient(null)} />
          <div className="drawer">
            <div style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 700 }}>{selectedPatient.firstName} {selectedPatient.lastName}</h2>
                  <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>
                    DOB: {selectedPatient.dob} • Age: {getAge(selectedPatient.dob)} • {selectedPatient.gender === "F" ? "Female" : "Male"} • Postcode: {selectedPatient.postcode}
                  </div>
                  <div style={{ fontSize: 13, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                    Medicare: {selectedPatient.medicare}-{selectedPatient.irn}
                  </div>
                </div>
                <button onClick={() => setSelectedPatient(null)} style={{ background: "#1E293B", border: "none", color: "#94A3B8", width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>

              {/* Error state */}
              {selectedPatient.error && (
                <div style={{ background: "#EF444415", border: "1px solid #EF444430", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                  <div style={{ fontWeight: 600, color: "#FCA5A5", marginBottom: 4 }}>{selectedPatient.error.code}</div>
                  <div style={{ fontSize: 13, color: "#F87171" }}>{selectedPatient.error.message}</div>
                  <button className="btn-primary" style={{ marginTop: 12, fontSize: 12 }}>Confirm & Accept</button>
                </div>
              )}

              {/* Status badges */}
              {!selectedPatient.error && (() => {
                const elig = getPatientEligibility(selectedPatient);
                return (
                  <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                    {elig.upToDate && <span style={{ padding: "6px 14px", borderRadius: 20, background: "#10B98120", color: "#10B981", fontSize: 13, fontWeight: 600 }}>✅ Up to Date</span>}
                    {elig.fluDue.length > 0 && <span style={{ padding: "6px 14px", borderRadius: 20, background: "#3B82F620", color: "#3B82F6", fontSize: 13, fontWeight: 600 }}>💉 Flu Due</span>}
                    {elig.covidDue.length > 0 && <span style={{ padding: "6px 14px", borderRadius: 20, background: "#8B5CF620", color: "#8B5CF6", fontSize: 13, fontWeight: 600 }}>🦠 COVID Due</span>}
                    {elig.nipDue.length > 0 && <span style={{ padding: "6px 14px", borderRadius: 20, background: "#F59E0B20", color: "#F59E0B", fontSize: 13, fontWeight: 600 }}>🛡️ NIP Due</span>}
                    {elig.overdue.length > 0 && <span style={{ padding: "6px 14px", borderRadius: 20, background: "#EF444420", color: "#EF4444", fontSize: 13, fontWeight: 600 }}>⚠️ {elig.overdue.length} Overdue</span>}
                  </div>
                );
              })()}

              {/* Clinic mode context - show why this patient matches */}
              {clinicMode && activeClinic && (
                <div style={{ background: `${activeClinic.color}10`, border: `1px solid ${activeClinic.color}25`, borderRadius: 10, padding: 14, marginBottom: 20 }}>
                  <div style={{ fontWeight: 600, color: activeClinic.color, fontSize: 13, marginBottom: 6 }}>
                    {activeClinic.icon} {activeClinic.label} — Matches filter
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
                    {activeClinic.extraColumns.map((col, i) => {
                      const val = col.key(selectedPatient);
                      return (
                        <div key={i}>
                          <span style={{ color: "#64748B" }}>{col.header}: </span>
                          <span style={{ color: val.color, fontWeight: 600 }}>{val.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Due vaccines */}
              {selectedPatient.dueList?.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>📋 Vaccines Due</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {selectedPatient.dueList.map((d, i) => {
                      const isOverdue = parseDueDate(d.dueDate) < TODAY;
                      const label = ANTIGEN_LABELS[d.disease] || d.disease;
                      const isF = isFlu(d.disease), isC = isCovid(d.disease);
                      const color = isF ? "#3B82F6" : isC ? "#8B5CF6" : "#F59E0B";
                      return (
                        <div key={i} style={{ background: `${color}10`, border: `1px solid ${color}30`, borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 600, color: "#E2E8F0" }}>{isF ? "💉" : isC ? "🦠" : "🛡️"} {label}</div>
                            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>Dose {d.vaccineDose} • Due: {formatDueDate(d.dueDate)}</div>
                          </div>
                          <span style={{ padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: isOverdue ? "#EF444430" : `${color}20`, color: isOverdue ? "#FCA5A5" : color }}>
                            {isOverdue ? "OVERDUE" : "DUE"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedPatient.dueList?.length === 0 && !selectedPatient.error && (
                <div style={{ background: "#10B98110", border: "1px solid #10B98130", borderRadius: 10, padding: 16, marginBottom: 24, textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "#6EE7B7" }}>No vaccinations due for this individual</div>
                </div>
              )}

              {/* Vaccination history */}
              {selectedPatient.history?.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>📜 Vaccination History ({selectedPatient.history.length} records)</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[...selectedPatient.history].sort((a,b) => {
                      const [ad,am,ay] = a.date.split("/"); const [bd,bm,by] = b.date.split("/");
                      return new Date(by,bm-1,bd) - new Date(ay,am-1,ad);
                    }).map((h, i) => {
                      const cat = VACCINE_DB[h.vaccine]?.category;
                      const catColor = cat === "FLU" ? "#3B82F6" : cat === "COV19" ? "#8B5CF6" : "#F59E0B";
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", padding: "10px 14px", background: "#0D1117", borderRadius: 8, gap: 14 }}>
                          <div style={{ width: 82, fontSize: 12, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{h.date}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{h.name || h.vaccine}</div>
                            <div style={{ fontSize: 12, color: "#94A3B8" }}>{h.antigen} • Dose {h.dose}</div>
                          </div>
                          <span style={{ padding: "3px 8px", borderRadius: 8, fontSize: 10, fontWeight: 600, background: `${catColor}15`, color: catColor, textTransform: "uppercase" }}>
                            {cat === "FLU" ? "Flu" : cat === "COV19" ? "COVID" : "NIP"}
                          </span>
                          <span style={{ color: "#10B981", fontSize: 12, fontWeight: 600 }}>✅</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedPatient.history?.length === 0 && !selectedPatient.error && (
                <div style={{ background: "#1A1F2E", borderRadius: 10, padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "#94A3B8" }}>No immunisation history recorded</div>
                </div>
              )}

              <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
                <button className="btn-primary" style={{ flex: 1 }}>Record Vaccination</button>
                <button className="btn-secondary" style={{ flex: 1 }}>Print IHS (PDF)</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
