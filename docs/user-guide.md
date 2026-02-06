# AIR Bulk Vaccination Upload System - User Guide

## Table of Contents

1. [Overview](#overview)
2. [Excel Template Format](#excel-template-format)
3. [Upload Process](#upload-process)
4. [Understanding Validation Errors](#understanding-validation-errors)
5. [Confirmation Process](#confirmation-process)
6. [Frequently Asked Questions](#frequently-asked-questions)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The AIR Bulk Vaccination Upload System allows vaccination providers to submit multiple vaccination records to the Australian Immunisation Register (AIR) using a simple Excel file.

**Key Features:**
- Upload multiple vaccination records at once (up to 10 encounters per request)
- Automatic validation against AIR business rules
- Clear error messages and guidance for corrections
- Confirmation workflow for records requiring additional review
- Complete submission history and reporting

**What You Need:**
- Your PRODA credentials configured in the system
- A valid Provider Number registered with AIR
- Patient details including one form of identification (Medicare, IHI, or demographics)
- Vaccination details for each record

---

## Excel Template Format

The system accepts Excel files (.xlsx) with the following 19 columns. All columns must be present in the file, even if some are left empty for certain records.

### Column Reference

| Column | Header | Description | Required? | Format / Values |
|--------|---------|-------------|-----------|-----------------|
| A | **Medicare Card Number** | Patient's 10-digit Medicare number | Conditional* | 10 digits (e.g., 2123456789) |
| B | **Medicare IRN** | Individual Reference Number on the Medicare card | Conditional* | Single digit 1-9 |
| C | **IHI Number** | Individual Healthcare Identifier | Conditional* | 16 digits (e.g., 8003608833357361) |
| D | **First Name** | Patient's first name | Conditional* | Text, up to 40 characters |
| E | **Last Name** | Patient's last name | Conditional* | Text, up to 40 characters |
| F | **Date of Birth** | Patient's date of birth | **YES** | DD/MM/YYYY (e.g., 18/10/2005) |
| G | **Gender** | Patient's gender | **YES** | M, F, I, or U |
| H | **Postcode** | Patient's residential postcode | Conditional* | 4 digits (e.g., 2000) |
| I | **Date of Service** | Date vaccination was administered | **YES** | DD/MM/YYYY (e.g., 01/02/2026) |
| J | **Vaccine Code** | AIR vaccine code | **YES** | 1-6 characters (e.g., COMIRN, MMR) |
| K | **Vaccine Dose** | Dose number in the series | **YES** | Number 1-20 |
| L | **Vaccine Batch** | Manufacturer's batch/lot number | Conditional** | 1-15 characters |
| M | **Vaccine Type** | Type of vaccination program | Recommended | NIP, AEN, or OTH |
| N | **Route of Administration** | How the vaccine was administered | Recommended | IM, SC, ID, OR, IN, or NAS |
| O | **Administered Overseas** | Was the vaccine given overseas? | No | TRUE or FALSE |
| P | **Country Code** | Country where vaccine was administered | Conditional*** | 3-letter country code (e.g., AUS, NZL) |
| Q | **Immunising Provider Number** | Provider who administered the vaccine | **YES** | 6-8 characters |
| R | **School ID** | School identifier (if school-based) | No | As provided by AIR |
| S | **Antenatal Indicator** | Was this an antenatal vaccination? | No | TRUE or FALSE |

#### Notes on Required Fields:

**\* Patient Identification** - You must provide ONE of these combinations:
1. Medicare Card Number + Medicare IRN + Date of Birth + Gender
2. IHI Number + Date of Birth + Gender
3. First Name + Last Name + Date of Birth + Gender + Postcode

**\*\* Vaccine Batch** is mandatory for:
- All COVID-19 vaccines
- Influenza vaccines
- Yellow Fever vaccines

**\*\*\* Country Code** is required when Administered Overseas = TRUE

### Gender Values

Use one of these four values:
- **M** = Male
- **F** = Female
- **I** = Intersex or Indeterminate
- **U** = Unknown

You can enter the full word (Male, Female, Intersex, Unknown) and the system will convert it automatically.

### Vaccine Types

- **NIP** = National Immunisation Program (funded vaccines)
- **AEN** = Authorised Exemption Not Listed (special access)
- **OTH** = Other (private/non-NIP vaccines)

### Route of Administration

- **IM** = Intramuscular
- **SC** = Subcutaneous
- **ID** = Intradermal
- **OR** = Oral
- **IN** = Intranasal
- **NAS** = Nasal

### Date Format

All dates must be in DD/MM/YYYY format in the Excel file:
- Correct: 18/10/2005
- Incorrect: 10/18/2005 (US format)
- Incorrect: 2005-10-18 (ISO format)

The system will convert dates to the correct format for AIR submission.

---

## Upload Process

### Step 1: Download the Template

1. Click the "Download Template" button in the system
2. Open the template in Microsoft Excel or compatible software
3. Do not modify the column headers

### Step 2: Enter Your Data

1. Fill in one row per vaccine administration
2. If a patient receives multiple vaccines on the same day, use multiple rows with the same patient details and Date of Service
3. Leave optional fields blank if they don't apply
4. Save the file as .xlsx format (not .xls or .csv)

**Example:**
```
Medicare Card | Medicare IRN | IHI Number | First Name | Last Name | DOB | Gender | ...
2123456789    | 1           |            | Jane       | Smith     | 15/01/1990 | F | ...
2123456789    | 1           |            | Jane       | Smith     | 15/01/1990 | F | ...
```
(Two rows = same patient receiving two different vaccines)

### Step 3: Upload the File

1. Click "Upload File" in the system
2. Select your completed Excel file
3. Wait for the initial file check to complete

### Step 4: Review Validation Results

The system will check your file and show:
- **Green checkmarks**: Valid records ready to submit
- **Yellow warnings**: Records that may need confirmation
- **Red errors**: Records that need correction before submission

If there are errors, download the error report, correct the issues in your Excel file, and upload again.

### Step 5: Submit to AIR

1. Review the summary of records to be submitted
2. Click "Submit to AIR"
3. Monitor the submission progress
4. Review the results and handle any confirmations (see Confirmation Process below)

### Step 6: View Results

After submission, you can:
- View the submission history
- Download success/error reports
- Confirm any records that require additional review
- See which records were successfully registered on AIR

---

## Understanding Validation Errors

The system validates your data before submission to prevent errors. Here are common validation errors and how to fix them.

### Common Pre-Submission Errors

| Error Message | What It Means | How to Fix |
|---------------|---------------|------------|
| **Invalid date format** | Date is not in DD/MM/YYYY format | Change to DD/MM/YYYY format (e.g., 18/10/2005) |
| **Date of Birth cannot be in the future** | The DOB date hasn't occurred yet | Check for typos, use correct year |
| **Date of Birth more than 130 years ago** | Date is too old to be valid | Verify the correct date of birth |
| **Date of Service must be after Date of Birth** | Vaccination date is before patient was born | Check both dates for accuracy |
| **Date of Service cannot be in the future** | Vaccination date hasn't occurred yet | Use today's date or earlier |
| **Invalid gender value** | Gender is not M, F, I, or U | Use only M, F, I, or U |
| **Medicare check digit invalid** | The Medicare number has an error | Verify the Medicare number from the patient's card |
| **Medicare IRN required when Medicare Card Number provided** | IRN is missing | Enter the IRN (position number) from the card |
| **IHI Number must be 16 digits** | IHI is wrong length | Check the IHI number carefully |
| **Postcode must be 4 digits** | Invalid Australian postcode | Use 4-digit Australian postcode |
| **Vaccine code not recognized** | Code is not in AIR reference data | Check the vaccine code spelling, use valid AIR codes |
| **Vaccine Batch required for this vaccine** | Batch number is missing for COVID/Flu/Yellow Fever | Add the batch/lot number from the vial |
| **Vaccine Dose must be between 1 and 20** | Dose number is out of range | Use numbers 1-20 only |
| **Provider Number invalid format** | Provider number doesn't match AIR format | Verify the Provider Number with AIR |
| **Insufficient identification details** | Cannot identify patient with the details provided | Provide Medicare + IRN, or IHI, or Full demographics |
| **Country Code required when Administered Overseas is TRUE** | Missing country when overseas flag is set | Add 3-letter country code (e.g., NZL) |
| **Maximum 10 encounters per submission** | Too many patients/dates in one file | Split into smaller files (max 10 patients per file) |

### AIR Error Codes (From AIR System)

These errors come from the AIR system after submission:

| Error Code | Description | Action Required |
|------------|-------------|-----------------|
| **AIR-E-1005** | Validation errors in the request | Review the specific field errors displayed and correct them |
| **AIR-E-1013** | Too many encounters in request | Reduce the number of unique patients/dates (max 10) |
| **AIR-E-1014** | Episode numbering error | System should handle this automatically - contact support if you see it |
| **AIR-E-1015** | Date of Service before Date of Birth | Correct the dates - vaccine date must be after birth date |
| **AIR-E-1016** | Invalid field format | Check the specific field mentioned for format issues |
| **AIR-E-1017** | Invalid value in field | The value doesn't match AIR's permitted values |
| **AIR-E-1018** | Date is in the future | Change date to today or earlier |
| **AIR-E-1019** | Date more than 130 years ago | Verify the date is correct |
| **AIR-E-1020** | Medicare card number required when IRN provided | Add the Medicare card number |
| **AIR-E-1021** | Immunising Provider Number required | Add the provider number who gave the vaccine |
| **AIR-E-1022** | Date of Service is invalid | Check date format and validity |
| **AIR-E-1023** | Vaccine code is invalid | Use a valid AIR vaccine code |
| **AIR-E-1024** | Vaccine dose is invalid | Use dose number 1-20 |
| **AIR-E-1028** | Provider number doesn't exist or not current | Verify the provider is registered with AIR and registration is current |
| **AIR-E-1029** | Information provider number invalid | Check your organization's provider number configuration |
| **AIR-E-1046** | Encounters cannot be confirmed | Review the specific errors - records may need correction before resubmission |

---

## Confirmation Process

Some vaccination records require additional confirmation before being finalized on AIR. This is a normal part of the process.

### AIR-W-1004: Individual Not Found

**What it means:** AIR could not find the patient in its system using the details you provided.

**Why this happens:**
- Patient may not be registered on AIR yet
- Patient details might have changed since their last registration
- Minor differences in name spelling or date of birth

**What to do:**

1. **Review the patient details carefully**
   - Double-check Medicare number, IHI, or demographic details
   - Compare with the patient's ID documents
   - Look for typos or transcription errors

2. **If details are CORRECT:**
   - Click "Confirm" in the system
   - This tells AIR to register the patient with these details
   - The vaccination will be recorded under the confirmed details

3. **If you found an ERROR:**
   - Click "Correct and Resubmit"
   - Fix the details in your Excel file
   - Upload and submit again

**Important:** Only confirm if you are certain the patient details are correct. Confirming incorrect details can create duplicate or incorrect records on AIR.

### AIR-W-1008: Some Encounters Not Recorded

**What it means:** Some of the vaccinations in your submission were recorded successfully, but others have warnings or require confirmation.

**What to do:**

1. **Review the detailed results**
   - The system will show which records succeeded and which have warnings
   - Each record's status will be clearly marked

2. **Handle each warning individually**
   - Follow the specific guidance for each warning code
   - Some may need confirmation (like AIR-W-1004)
   - Others may need correction

3. **Confirm or correct as appropriate**
   - Use selective confirmation for records you've verified
   - Resubmit corrected records separately

### AIR-W-1001: Individual Not Uniquely Identified

**What it means:** The details you provided match multiple people in AIR's database.

**What to do:**

1. **Provide more specific identification**
   - Add Medicare number if you only provided demographics
   - Add IHI number for more precise identification
   - Verify all details are exactly as registered

2. **If using demographics only:**
   - Ensure First Name, Last Name, DOB, Gender, and Postcode are all correct
   - Consider obtaining Medicare or IHI for this patient

3. **Confirm if details verified**
   - If you're certain the details are correct and specific to your patient
   - Click "Confirm" to proceed with the submission

---

## Frequently Asked Questions

### 1. How many vaccination records can I submit at once?

You can include up to 10 patients with different dates of service in a single submission. However, for the same patient on the same date, you can record up to 5 vaccines (these are grouped as "episodes" within an "encounter").

**Example:**
- Acceptable: 10 different patients, each receiving 1-5 vaccines on their appointment date
- Not acceptable: 11 different patients in one file (split into two files)

### 2. What if I don't have a patient's Medicare number?

You can use one of three identification methods:
1. Medicare Card Number + IRN
2. IHI Number (16 digits)
3. Full demographics (First Name + Last Name + DOB + Gender + Postcode)

If you have an IHI number but not Medicare, that's sufficient for AIR identification.

### 3. Can I submit historical vaccination records?

Yes, you can submit past vaccinations as long as:
- The Date of Service is after the patient's Date of Birth
- The Date of Service is not more than 130 years ago
- Your provider number was active at the time of administration

However, check with AIR or your organization regarding any time limits for historical record submission.

### 4. What vaccine codes should I use?

Vaccine codes are defined by AIR. Common examples:
- COMIRN = Comirnaty (Pfizer COVID-19)
- COVAST = Vaxzevria (AstraZeneca COVID-19)
- SPIKEVAX = Spikevax (Moderna COVID-19)
- MMR = Measles-Mumps-Rubella
- IFLU4 = Influenza quadrivalent

The system validates codes against the current AIR reference data. If a code is rejected, verify it with the AIR vaccine code list or your clinical system.

### 5. What if I make a mistake after submitting?

Once a record is successfully submitted to AIR (status AIR-I-1007 or AIR-I-1000), it is registered on the AIR system. You cannot edit or delete it through this system.

For corrections to submitted records, you may need to:
- Contact AIR support for record amendments
- Use AIR's correction processes through PRODA
- Contact Services Australia on 1300 550 115

Always double-check records before final submission.

### 6. Why do I need a vaccine batch number?

Batch numbers are critical for tracking vaccine safety and managing recalls. AIR requires batch numbers for:
- All COVID-19 vaccines
- All Influenza vaccines
- Yellow Fever vaccines

The batch number appears on the vaccine vial or packaging. Without a valid batch number, these vaccines cannot be recorded on AIR.

---

## Troubleshooting

### Problem: Excel file won't upload

**Possible causes:**
- File is not in .xlsx format (must not be .xls or .csv)
- File is corrupted or password-protected
- File is too large (over system limits)
- Column headers have been modified

**Solutions:**
- Save as .xlsx format in Excel
- Remove password protection
- Split large files into smaller batches
- Re-download the template and transfer your data

### Problem: All records showing "Insufficient identification"

**Cause:** None of the three identification methods are complete in your records.

**Solution:** For each patient, ensure you have ONE complete set:
- Medicare Card Number + Medicare IRN + DOB + Gender, OR
- IHI Number + DOB + Gender, OR
- First Name + Last Name + DOB + Gender + Postcode

### Problem: Medicare numbers being rejected

**Causes:**
- Check digit validation failing (digit 9 is wrong)
- Extra spaces or characters in the number
- Number is not exactly 10 digits

**Solutions:**
- Carefully re-enter from the patient's Medicare card
- Ensure no spaces or hyphens
- Verify the number is exactly 10 digits
- Check that digit 10 (issue number) is not 0

### Problem: Dates being rejected

**Causes:**
- Using US format (MM/DD/YYYY) instead of Australian format (DD/MM/YYYY)
- Excel auto-formatting dates incorrectly
- Invalid dates (e.g., 31/02/2023)

**Solutions:**
- Format date columns as Text before entering data
- Use DD/MM/YYYY format consistently
- For dates before 1930, be especially careful with Excel's interpretation

### Problem: System says vaccine batch is required but I don't have it

**Cause:** COVID-19, Influenza, and Yellow Fever vaccines require batch numbers in AIR.

**Solutions:**
- Check the vaccine vial or packaging for the batch/lot number
- Check your vaccine storage records
- Contact your vaccine supplier if batch number is missing
- If truly unavailable, you may not be able to submit this record without it

### Problem: Provider number rejected

**Causes:**
- Provider number doesn't exist in AIR
- Provider registration has lapsed
- Wrong check digit in the provider number

**Solutions:**
- Verify the provider number with AIR or Medicare
- Check that the provider's registration is current
- Ensure you're using the provider who actually administered the vaccine
- Contact Services Australia if registration needs updating

### Problem: Submission timing out or failing

**Causes:**
- AIR system temporarily unavailable
- Network connectivity issues
- System maintenance periods

**Solutions:**
- Wait a few minutes and try again
- Check Services Australia's system status page
- Try during off-peak hours if persistent
- Contact technical support if the problem continues

### Problem: Getting AIR-E-1006 errors

**What it means:** AIR system error (not your data)

**Solution:**
- The system will automatically retry 3 times
- If it continues to fail, wait 10-15 minutes
- Try resubmitting the batch
- If persistent, contact Services Australia technical support at 1300 550 115

### Problem: Records stuck in "Pending Confirmation"

**Cause:** You received AIR-W-1004 or similar warnings requiring review

**Solution:**
1. Go to the Submission History
2. Find the batch with pending confirmations
3. Click "Review Confirmations"
4. For each record, either Confirm (if correct) or Correct and Resubmit
5. Records remain pending until you take action

---

## Getting Help

### Within the System
- Use the Help icon (?) next to fields for field-specific guidance
- Download error reports for detailed information about validation failures
- Check submission history for past results and patterns

### External Support

**Services Australia Developer Liaison:**
- Email: DeveloperLiaison@servicesaustralia.gov.au
- For registration questions, test data, production access

**Services Australia Technical Support:**
- Phone: 1300 550 115
- For technical issues with AIR integration, API problems

**System Administrator:**
- Contact your organization's system administrator for:
  - User account issues
  - PRODA configuration
  - Provider number setup
  - Permissions and access

---

**Document Version:** 1.0
**Last Updated:** February 2026
**System:** AIR Bulk Vaccination Upload System

For system updates and release notes, check with your system administrator.
