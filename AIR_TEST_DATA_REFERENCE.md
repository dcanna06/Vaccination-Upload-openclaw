# AIR Vendor Test Data — Warrandyte Healthcare Pty Ltd
# Issued: 1/08/2025 by Services Australia Developer Liaison Team
# Endpoint: https://test.healthclaiming.api.humanservices.gov.au/claiming/ext-vnd

## Credentials

| Field | Value |
|---|---|
| Minor ID (Location ID) | WRR00000 |
| PRODA Client ID | WRR00000 |
| X-IBM-Client-Id | Generated via Developer Portal → Your Applications → Create new app (API key) |
| PRODA Org ID | 2330016739 |
| PRODA Device | DavidTestLaptop2 |

## Providers (Immunising or Information Provider)

| Provider Number | Last Name | First Name |
|---|---|---|
| 2448141T | BOWLING | GRAHAM |
| 2448151L | BISHOP | FELICITY |

## AIR Provider Numbers (Other Vaccination Provider)

| AIR Provider Number | Name |
|---|---|
| N56725J | AMELIA PRACTITIONERS65 |
| T59433Y | DANIELLE PARTNERS16 |

## School IDs

| School ID |
|---|
| 40001 |
| 41000 |
| 43350 |

## HPIO / HPII

| Type | Number |
|---|---|
| HPIO | 8003623233370062 |
| HPII | 8003611566712356 |

## Section 5 — Single Medicare Cards (CAN update — use for Record Encounter)

| Medicare | IRN | Last Name | First Name | DOB | Sex | Address | Locality | State | Postcode |
|---|---|---|---|---|---|---|---|---|---|
| 3951333161 | 1 | SCRIVENER | Tandra | 19/01/1961 | F | 114 Freedom Ave | North Shore | VIC | 3214 |
| 3951333251 | 1 | MAHER | Lyndon | 27/09/1962 | M | 82 Freedom Qy | Hill End | VIC | 3825 |
| 5951138021 | 1 | MCBEAN | Arla | 09/03/1971 | F | 62 Short Lane | Carrieton | SA | 5432 |
| 4951650791 | 1 | SHEPPARD | Phoebe | 19/08/1999 | F | 21 Israel Tce | Ivory Creek | QLD | 4313 |

## Section 7 — Alternate Enrolment Types (CAN update — various edge cases)

| Scenario | Medicare | IRN | Last Name | First Name | DOB | Sex | Address | Locality | State | Postcode |
|---|---|---|---|---|---|---|---|---|---|---|
| Only Name | 2297460337 | 1 | Devo | Onlyname | 01/01/1980 | M | 45 Lameo St | Sydney | NSW | 2000 |
| Long Name | 3950921522 | 1 | Weatherby-Wilkinson | Harriett-Jane | 12/03/1992 | F | 18 Wadey St | Southbank | VIC | 3006 |
| RHCA | 2297582345 | 1 | Xpatriot | English | 15/09/1975 | M | 34 Continental Ave | Sydney | NSW | 2000 |
| Expired RHCA | 2297402205 | 1 | Forigner | French | 16/05/1980 | F | International St | Deakin | ACT | 2600 |
| Lost Card | 5500393925 | 1 | Boyes | Simon | 23/05/1980 | M | Dropball Ave | Nailsworth | SA | 5083 |
| Transferred Card | 6951393261 | 3 | Harris | Sam | 12/09/2000 | F | 4A Watkins St | Eden Hill | WA | 6054 |
| Deceased (30/06/2024) | 2296510128 | 4 | Jones | Sad | 15/09/1964 | M | 1 Happy Pl | Fadden | ACT | 2904 |
| Unknown on Medicare | 2398125261 | 1 | Doe | John | 13/09/1979 | M | 1 Lost Pl | Sydney | NSW | 2000 |
| Old Issue Number | 2298264833 | 1 | Watts | Gregory | 12/05/1970 | M | 25 Main Rd | Wanniassa | ACT | 2903 |
| Safety Net | 2295919746 | 1 | Davis | Eva | 02/05/1979 | F | 502 Lion Pl | Macquarie | ACT | 2614 |

## Section 8 — IHI Patients (READ ONLY — do NOT send updates)

| Scenario | IHI | Medicare | IRN | Last Name | First Name | Initial | DOB | Sex | Locality | State | Postcode |
|---|---|---|---|---|---|---|---|---|---|---|---|
| End Date=Ltd | 8003608666929120 | 4951405042 | 2 | Hicks | Minnie | T | 12/11/2016 | F | Wellers Hill | QLD | 4121 |
| End Date=All | 8003608000265017 | 6951624612 | 2 | Stenson | Jerico | C | 11/11/2018 | M | Balcatta | WA | 6021 |
| End Date=None | 8003608333600336 | 6951628322 | 2 | Allan | Grace | A | 23/01/2017 | F | South Hobart | TAS | 7004 |
| Auth Release | 8003608666929138 | 3951149822 | 1 | Hayes | Gwen | M | 12/08/1992 | F | Lara | VIC | 3212 |
| AIR History | 8003608000265033 | 2953701052 | 2 | Edwards | Koby | W | 17/04/2012 | M | Merrylands | NSW | 2160 |
| Indigenous Ind | 8003608666929807 | 3951152402 | 2 | Jenkins | Clarissa | M | 15/10/2015 | F | Doncaster East | VIC | 3109 |
| No History | 8003608333411106 | 2951214793 | 1 | Wilson | Peter | H | 19/02/1979 | M | Inverell | NSW | 2360 |
| COVID Complete | 8003608333607810 | 4951420142 | 1 | Stanley | Henry | A | 01/12/1970 | M | Berry Springs | NT | 0838 |
| COVID Incomplete | 8003608666937743 | 2953894862 | 1 | Markell | Ross | V | 27/05/1971 | M | Beverly Hills | NSW | 2209 |
| AIR Only Name | 8003608333617074 | 5951056491 | 1 | Monty | (none) | - | 12/05/2000 | M | Croydon | SA | 5008 |

## Support Contacts

| Team | Contact | Purpose |
|---|---|---|
| OTS Helpdesk | 1300 550 115 | Technical support during development |
| OTS Email | onlineclaiming@servicesaustralia.gov.au | Email support |
| Test Data Reset | itest@servicesaustralia.gov.au | Reset planned catch-up dates |
| NOI Booking | Health Systems Developer Portal → Certification tile | Book NOI testing |
