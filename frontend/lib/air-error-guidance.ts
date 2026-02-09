/**
 * AIR error code guidance map.
 *
 * Maps AIR status codes to user-friendly guidance tips and recommended actions.
 * Per TECH.SIS.AIR.02 §5.2.2 — the raw AIR message is always shown verbatim;
 * these tips are supplementary guidance shown alongside.
 */

export interface AirGuidance {
  tip: string;
  action: 'confirm' | 'edit' | 'retry' | 'none';
}

export const AIR_ERROR_GUIDANCE: Record<string, AirGuidance> = {
  'AIR-W-1004': {
    tip: "The patient may not be registered on AIR, or their details don't match. Verify name, DOB, and Medicare number against their card. If correct, confirm to create a new AIR record.",
    action: 'confirm',
  },
  'AIR-W-1001': {
    tip: "The encounter didn't pass assessment rules. Review the episode details below. You can accept the pended status or correct the data.",
    action: 'confirm',
  },
  'AIR-W-1008': {
    tip: 'One or more encounters have warnings. Review each encounter and either confirm or correct.',
    action: 'confirm',
  },
  'AIR-W-0044': {
    tip: 'The vaccine may not be approved for use on the date of service. Check that the vaccine brand and date are correct.',
    action: 'edit',
  },
  'AIR-E-1005': {
    tip: 'One or more fields failed validation. Review each error below and correct the data.',
    action: 'edit',
  },
  'AIR-E-1006': {
    tip: 'A system error occurred on the AIR side. This will be retried automatically. If it persists, contact AIR.INTERNET.HELPDESK@servicesaustralia.gov.au',
    action: 'retry',
  },
  'AIR-E-1015': {
    tip: "The vaccination date is before the patient's date of birth. Check both dates for typos.",
    action: 'edit',
  },
  'AIR-E-1017': {
    tip: "A value failed validation or check digit. For Medicare numbers, verify all 10 digits match the patient's card exactly.",
    action: 'edit',
  },
  'AIR-E-1018': {
    tip: 'A date is in the future. Check that the date of service is today or earlier.',
    action: 'edit',
  },
  'AIR-E-1023': {
    tip: "The vaccine code doesn't exist in AIR reference data. Use the dropdown to select a valid code.",
    action: 'edit',
  },
  'AIR-E-1041': {
    tip: 'Encounter ID numbering issue. This is usually handled automatically. If it persists, try resubmitting.',
    action: 'retry',
  },
  'AIR-E-1058': {
    tip: "This individual's AIR record has restrictions. Contact Services Australia directly — this cannot be resolved through the system.",
    action: 'none',
  },
};

/**
 * Get guidance for an AIR status code, or undefined if not mapped.
 */
export function getAirGuidance(code: string): AirGuidance | undefined {
  return AIR_ERROR_GUIDANCE[code];
}
