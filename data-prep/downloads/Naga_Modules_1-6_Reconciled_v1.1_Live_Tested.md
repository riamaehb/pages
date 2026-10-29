# Naga City LGU Training: Modules 1–6
## Reconciled learner guide, version 1.1 | 29 October 2026 (live Google Sheets tested)

**Day 1, Sessions 3–4:** From raw data to analysis-ready data; data organization using Google Sheets.  
**Practice case:** A city planning office consolidates fictional employment assistance records for a management report. All applicant data are synthetic.  
**Core learning outcome:** Produce a verified 100-applicant, 17-field consolidated dataset from separate Excel, Word, and CSV sources.  
**Optional extension:** Process a monthly update to produce 105 unique applicants.  
**Day 2:** Use a *separate* 850-record synthetic dataset for dashboard practice. Do not append it to the 100-record dataset.

### How to use this guide
- **Live:** Essential facilitator-led activities for the 215-minute workshop.
- **Optional:** Self-paced extensions on the training website.
- **Check your work:** A result to verify before continuing.
- **Privacy:** Use only the provided synthetic data with public AI services. Do not upload real LGU personal information without authorization and applicable safeguards.

## Module 1. Understanding and Organizing Government Data
**Suggested live time: 20 minutes.**

### The reporting problem
The mayor asks: How many residents registered for employment assistance? How many were placed? Which barangays have applicants still waiting? The answers are spread across a registration workbook, a Word placement report, and a CSV of pending/withdrawn cases. Finding and reconciling the information can take longer than presenting it.

### Documents and structured tables
A narrative report explains activities and context. A structured table makes it possible to filter, count, join, and compare records. In a registration table, one row represents one applicant registration and columns represent attributes such as `Applicant_ID`, `Date_Registered`, `Barangay`, and `Sector`. The identifier must be stable and unique within this one-row-per-applicant exercise.

**Try it:** A fictional narrative states that in September 2026, 125 people registered, 48 were placed, 62 were pending, and 15 withdrew. Identify the four numbers and create a two-column table with indicator and value. These illustrative figures are **not** calculated from the practice files.

### What makes the table useful?
Consistent fields, accepted categories, appropriate data types, a clear definition of what each row represents, and a stable identifier allow us to combine data safely. A repeated identifier may be a duplicate or an update; we must investigate before deleting anything. Missing status is not equivalent to Pending.

### Where AI fits
Use existing tools for defined operations: `TRIM` for spaces, `COUNTIF` for repeated IDs, and `XLOOKUP` for reference matching. Gemini can help interpret narrative documents or explain unfamiliar formulas. Verify its outputs against the original source. Use the simplest reliable tool for the task.

**Apply to your office:** Identify one recurring report, its source files, the entity or event represented by each row, and a possible common identifier.

**Check your work:** You can explain the difference between a narrative report, a structured table, an identifier, and the grain of a dataset.

## Module 2. From Documents to Structured Tables
**Suggested live time: 30 minutes.**

### Download and inspect
1. `01_Applicant_Registrations_MESSY.xlsx`: 101 registration rows, eight columns, 100 unique applicant IDs.
2. `02_Placement_Report_WORD.docx`: Word document containing a table with 82 placement rows and three columns.
3. `03_Pending_Withdrawn_Status.csv`: 18 rows, three columns.
4. `04_Barangay_Reference.xlsx`: 27 accepted barangay names and their reference coordinates.

Create a Google Sheets workbook named **Naga Employment Data Exercise**. Import the files into worksheets named exactly:

| Worksheet | Columns | Data rows |
|---|---|---:|
| `Registrations_Raw` | Applicant_ID, Date_Registered, Barangay, Sector, Age_Group, City, Province, Region | 101 |
| `Placements_Raw` | Applicant_ID, Date_Placed, Employer_Industry | 82 |
| `Status_Raw` | Applicant_ID, Status, Days_Pending | 18 |
| `Barangay_Reference` | Barangay_Standard, Latitude, Longitude | 27 |

**Practice in Google Sheets:** Import the Excel registration and reference workbooks. Import the CSV into its own sheet. Open the Word file, select only its existing placement table (including the header), and paste into `Placements_Raw`; verify that the three fields occupy separate columns. If pasted into one column, use **Data → Split text to columns** with an appropriate delimiter. Freeze the header row and enable filters.

**Preserve the source:** Do not correct spelling, delete duplicates, or replace missing cells in these raw worksheets. Dates in the Excel source are ISO-formatted strings; Google Sheets may import them as text or as date values depending on locale and import behavior. Verify before using date calculations.

### Narrative extraction with AI (optional)
A separate fictional accomplishment narrative may be extracted with Gemini: ask for a table of indicator, value, period, and exact supporting text. Check every number against the narrative. Do not mix narrative-only sample figures with the applicant practice dataset.

### Join or append?
**Join** adds attributes from another table about the same applicant using `Applicant_ID`. **Append** adds new applicant rows when the incoming table has the same schema. A placement table is joined to registrations, not appended below them.

**Check your work:** Four named source worksheets exist, with 101, 82, 18, and 27 data rows respectively. Applicant IDs remain unchanged.

## Module 3. Cleaning and Validating Data
**Suggested live time: 30 minutes.**

### Investigate before correcting
Inspect `Registrations_Raw` using filters, sorts, and counts. Consider completeness, validity, consistency, uniqueness, accuracy, and timeliness. Distinguish a known error from a suspicious value that requires verification.

**Practice:** Identify the actual anomalies in the file:

| Finding | Expected observation | Proposed treatment |
|---|---|---|
| Repeated ID | `APP-0013` appears twice; both rows are identical | Flag both, verify, retain one and exclude the other |
| Extra spaces | One `  Bagumbayan Sur  ` and one `  San Felipe  ` | Remove unnecessary spaces |
| Abbreviation | One `Concep. Grande` | Approved correction to `Concepcion Grande` |
| Capitalization | Two `YOUTH (18–30)` entries | Standardize to `Youth (18–30)` |
| Missing values in original eight fields | None | Still establish required-field rules |
| Reference values | 27 accepted barangays | Validate against reference list |

**Three decisions:** (1) Automatically normalize unambiguous formatting; (2) apply agreed mappings for known aliases; (3) send ambiguous, conflicting, or unsupported records for human review. Never assume a missing status means Pending. Never treat a duplicate identifier as proof that the first row is authoritative.

Create `Cleaning_Log` with columns **Date, Worksheet, Applicant_ID, Issue, Decision, Basis/Reviewer**. Document the APP-0013 decision after comparing both complete records.

**Optional:** Discuss whether `Placed` without a placement date, or `Pending` with a placement date, should be investigated. These are cross-field rules for the later consolidated dataset, not anomalies established in the original registration workbook.

**Check your work:** You can explain why APP-0013 may be excluded *after verification*, while an unrecognized barangay must remain visible for review.

## Module 4. Automating Data Preparation with Google Sheets
**Suggested live time: 65 minutes total across Sessions 3 and 4.**

### Start again from the original
In Module 3 we diagnosed the problems. Now duplicate `Registrations_Raw` to `Registrations_Auto` to apply repeatable rules. Keep original columns A–H unchanged. Add columns I–P:

| Column | Heading |
|---|---|
| I | Barangay_Trimmed |
| J | Barangay_Clean |
| K | Sector_Clean |
| L | ID_Count |
| M | Duplicate_Review |
| N | Barangay_Check |
| O | Record_Check |
| P | Review_Decision |

Enter each formula in row 2 and fill through **row 102**. The formulas assume the source columns A–H retain their original positions.

| Cell | Google Sheets formula | Expected behavior |
|---|---|---|
| I2 | `=IF(A2="","",TRIM(C2))` | Remove ordinary extra spaces |
| J2 | `=IF(A2="","",IF(I2="Concep. Grande","Concepcion Grande",I2))` | Correct approved abbreviation |
| K2 | `=IF(A2="","",IF(UPPER(TRIM(D2))="YOUTH (18–30)","Youth (18–30)",TRIM(D2)))` | Standardize two uppercase youth labels |
| L2 | `=IF(A2="","",COUNTIF($A$2:$A,A2))` | Both APP-0013 rows return 2 |
| M2 | `=IF(A2="","Missing ID",IF(L2>1,"Review duplicate","Unique"))` | Flag **both** repeated IDs |
| N2 | `=IF(A2="","",IF(J2="","Missing",IF(COUNTIF(Barangay_Reference!$A$2:$A,J2)>0,"Valid","Review")))` | Validate accepted barangay |
| O2 | `=IF(A2="","",IF(M2="Review duplicate","Review duplicate",IF(N2<>"Valid","Review barangay","Ready")))` | Surface review requirements |

**Check your work before review:** 99 rows are `Ready`, two APP-0013 rows are `Review duplicate`, and all 101 nonblank rows have a valid standardized barangay.

### Make the review decision
Compare the two complete APP-0013 rows. They are identical in this synthetic dataset. In column P, enter `Retain` for one occurrence and `Exclude` for the other. Leave P blank for the 99 automatically ready records. Document the decision in `Cleaning_Log`.

### Validated output
Create `Registrations_Validated`, then enter in A1:

```gs
={"Applicant_ID","Date_Registered","Barangay","Sector","Age_Group","City","Province","Region";
 FILTER({Registrations_Auto!A2:B,Registrations_Auto!J2:K,Registrations_Auto!E2:H},
  (Registrations_Auto!O2:O="Ready")+(Registrations_Auto!P2:P="Retain"))}
```

**Check:** Exactly 100 data rows; unique IDs; cleaned barangay and sector values. Do not label a record `Retain` unless its review has been completed. The output is an *approved* dataset, not an automatic deletion of every flagged record.

Create `Registrations_For_Review`. In A1, enter the **live-tested** formula below. Put `IFNA` inside the outer array literal so that an empty review queue does not cause an `ARRAY_LITERAL` error:

```gs
={
 "Applicant_ID","Issue","Decision";
 IFNA(
  FILTER(
   {Registrations_Auto!A2:A,Registrations_Auto!O2:O,Registrations_Auto!P2:P},
   Registrations_Auto!O2:O<>"Ready",
   Registrations_Auto!A2:A<>"",
   Registrations_Auto!P2:P=""
  ),
  {"No unresolved records","",""}
 )
}
```

**Check:** Before decisions, the two APP-0013 rows appear. After one is marked `Retain` and the other `Exclude`, the sheet shows **No unresolved records**. This text is a placeholder, not an applicant record. The live test verified 100 records and 100 unique IDs in `Registrations_Validated`.

### Data types: tested conversion
`Registrations_Raw!B2` was imported as ISO text (`=ISNUMBER(B2)` returned `FALSE`). A conversion test with `=DATE(VALUE(LEFT(B2,4)),VALUE(MID(B2,6,2)),VALUE(RIGHT(B2,2)))` returned a numeric date (`ISNUMBER` was `TRUE`). Keep the raw column unchanged. In Module 5, convert registration dates in `Employment_Consolidated!B2` before reporting. Display dates consistently as `yyyy-mm-dd` for CSV export if possible.

### Optional self-paced demonstrations
- Conditional formatting: highlight cells containing `Review`.
- Data validation: dropdown of accepted barangays from `Barangay_Reference!A2:A28`.
- `XLOOKUP` and mapping tables for many approved aliases, instead of a long nested `IF`.
- `ARRAYFORMULA` for new rows, after explaining that source imports, review decisions, and quality checks still require oversight.
- Gemini: ask it to explain `COUNTIF` or troubleshoot a formula using fictional examples. Verify the result in Sheets.

**Check your work:** 101 raw rows → 99 ready + 2 reviewed → 100 validated + 1 excluded verified duplicate; zero unresolved rows.

## Module 5. Combining and Updating Datasets
**Suggested live time: 55 minutes. Monthly updates are optional.**

### Standardize the status source
In `Status_Raw`, add column D `Status_Clean`. In D2, fill down to D19:

```gs
=IF(A2="","",PROPER(TRIM(B2)))
```

**Check:** `=COUNTIF(D2:D19,"Pending")` returns **11** and `=COUNTIF(D2:D19,"Withdrawn")` returns **7** (live-tested).

### Convert placement dates before joining (live-tested)
The Word table's `Date_Placed` was imported as text: `=ISNUMBER(Placements_Raw!B2)` returned `FALSE`. Preserve the source columns A–C. In `Placements_Raw` add:

| Cell | Entry |
|---|---|
| D1 | `Date_Placed_Clean` |
| D2 | `=IF(B2="","",DATE(VALUE(LEFT(B2,4)),VALUE(MID(B2,6,2)),VALUE(RIGHT(B2,2))))` |
| E1 | `Date_Check` |
| E2 | `=ISNUMBER(D2)` |

Fill D2:E2 through row 83 and format column D as a date. Verify `=COUNT(D2:D83)` returns **82** and `=COUNTIF(E2:E83,FALSE)` returns **0**. Both were confirmed in the live exercise.

### Reconcile *before* joining (live-tested)
Use the following cells so that the date-conversion helpers above are not overwritten:

| Worksheet and cell | Heading or formula | Fill / expected |
|---|---|---|
| `Placements_Raw!F1` | `Registration_Match` | |
| `Placements_Raw!F2` | `=IF(A2="","",IF(COUNTIF(Registrations_Validated!$A$2:$A,A2)=0,"Unmatched","Matched"))` | Through F83 |
| `Placements_Raw!H1` | `Unmatched Placements` | |
| `Placements_Raw!H2` | `=COUNTIF(F2:F83,"Unmatched")` | **0** |
| `Status_Raw!E1` | `Registration_Match` | |
| `Status_Raw!E2` | `=IF(A2="","",IF(COUNTIF(Registrations_Validated!$A$2:$A,A2)=0,"Unmatched","Matched"))` | Through E19 |
| `Status_Raw!G1` | `Unmatched Status Records` | |
| `Status_Raw!G2` | `=COUNTIF(E2:E19,"Unmatched")` | **0** |
| `Placements_Raw!G1` | `Status_Conflict` | |
| `Placements_Raw!G2` | `=IF(A2="","",IF(COUNTIF(Status_Raw!$A$2:$A,A2)>0,"Conflict","OK"))` | Through G83 |
| `Placements_Raw!I1` | `Conflicting Records` | |
| `Placements_Raw!I2` | `=COUNTIF(G2:G83,"Conflict")` | **0** |
| `Placements_Raw!J1` | `Duplicate IDs` | |
| `Placements_Raw!J2` | `=COUNTA(A2:A83)-COUNTUNIQUE(A2:A83)` | **0** |
| `Status_Raw!H1` | `Duplicate IDs` | |
| `Status_Raw!H2` | `=COUNTA(A2:A19)-COUNTUNIQUE(A2:A19)` | **0** |

**Check:** All five reconciliation results were **0** in the live test. If any are nonzero in real data, investigate before joining.

### Build the consolidated worksheet
Create `Employment_Consolidated`. Enter these **17 headings in this exact order**:

| Column | Field | Column | Field | Column | Field |
|---|---|---|---|---|---|
| A | Applicant_ID | G | Date_Placed | M | Province |
| B | Date_Registered | H | Employer_Industry | N | Region |
| C | Barangay | I | Registered | O | Latitude |
| D | Sector | J | Placed | P | Longitude |
| E | Age_Group | K | Days_Pending | Q | Lat_Long |
| F | Status | L | City | | |

Bring the validated records into the consolidated sheet using these **live-tested cell references**, filling each through row 101:

| Cell | Formula |
|---|---|
| A2 | `=Registrations_Validated!A2` |
| B2 | `=IF(Registrations_Validated!B2="","",DATE(VALUE(LEFT(Registrations_Validated!B2,4)),VALUE(MID(Registrations_Validated!B2,6,2)),VALUE(RIGHT(Registrations_Validated!B2,2))))` |
| C2 | `=Registrations_Validated!C2` |
| D2 | `=Registrations_Validated!D2` |
| E2 | `=Registrations_Validated!E2` |
| L2 | `=Registrations_Validated!F2` |
| M2 | `=Registrations_Validated!G2` |
| N2 | `=Registrations_Validated!H2` |

Format column B as a date. This explicit conversion is necessary because the registration dates arrived as text in the live test.

Enter these formulas in row 2 and fill through row 101:

| Cell | Formula |
|---|---|
| F2 | `=IF(A2="","",IF(COUNTIF(Placements_Raw!$A$2:$A,A2)>0,"Placed",IFNA(XLOOKUP(A2,Status_Raw!$A$2:$A,Status_Raw!$D$2:$D),"Review missing status")))` |
| G2 | `=IF(A2="","",IFNA(XLOOKUP(A2,Placements_Raw!$A$2:$A,Placements_Raw!$D$2:$D),""))` |
| H2 | `=IF(A2="","",IFNA(XLOOKUP(A2,Placements_Raw!$A$2:$A,Placements_Raw!$C$2:$C),""))` |
| I2 | `=IF(A2="","",1)` |
| J2 | `=IF(A2="","",IF(F2="Placed",1,0))` |
| K2 | `=IF(A2="","",IF(F2<>"Pending","",IFNA(XLOOKUP(A2,Status_Raw!$A$2:$A,Status_Raw!$C$2:$C),"")))` |
| O2 | `=IF(A2="","",IFNA(XLOOKUP(C2,Barangay_Reference!$A$2:$A,Barangay_Reference!$B$2:$B),"Not found"))` |
| P2 | `=IF(A2="","",IFNA(XLOOKUP(C2,Barangay_Reference!$A$2:$A,Barangay_Reference!$C$2:$C),"Not found"))` |
| Q2 | `=IF(OR(O2="",P2="",O2="Not found",P2="Not found"),"",O2&", "&P2)` |

**Date handling:** Format consolidated column G as a date. The `G2` lookup uses the converted numeric dates in `Placements_Raw!D2:D`, **not** the text dates in column B. In the live test, all 82 placement dates and all 100 registration dates were recognized as numeric dates. Keep the raw source columns unchanged.

### Verify the output (live-tested)
In `Employment_Consolidated`, keep data in **A1:Q101** and put checks in **S:T** so they do not mix with the 17-field dataset. Enter labels in S and the following formulas in T:

| Cell | Check | Formula | Expected |
|---|---|---|---:|
| T2 | Total applicants | `=COUNTA(A2:A101)` | 100 |
| T3 | Unique applicants | `=COUNTUNIQUE(A2:A101)` | 100 |
| T4 | Placed | `=COUNTIF(F2:F101,"Placed")` | 82 |
| T5 | Pending | `=COUNTIF(F2:F101,"Pending")` | 11 |
| T6 | Withdrawn | `=COUNTIF(F2:F101,"Withdrawn")` | 7 |
| T7 | Numeric registration dates | `=COUNT(B2:B101)` | 100 |
| T8 | Numeric placement dates | `=COUNT(G2:G101)` | 82 |
| T9 | Failed latitude lookups | `=COUNTIF(O2:O101,"Not found")` | 0 |
| T11 | Placed without placement date | `=COUNTIFS(F2:F101,"Placed",G2:G101,"")` | 0 |
| T12 | Non-placed with placement date | `=COUNTIFS(F2:F101,"<>Placed",G2:G101,"<>")` | 0 |
| T13 | Pending with duration value | `=COUNTIFS(F2:F101,"Pending",K2:K101,">=0")` | 11 |
| T14 | Non-pending with duration value | `=COUNTIFS(F2:F101,"<>Pending",K2:K101,"<>")` | 0 |
| T15 | Missing latitude | `=COUNTBLANK(O2:O101)` | 0 |
| T16 | Missing longitude | `=COUNTBLANK(P2:P101)` | 0 |
| T17 | Missing coordinate string | `=COUNTBLANK(Q2:Q101)` | 0 |
| T18 | Placement earlier than registration | `=SUMPRODUCT((F2:F101="Placed")*(G2:G101<B2:B101))` | 0 |

All eight initial checks and all eight final checks matched the expected results in the live test. Also confirm `=SUM(I2:I101)` is **100**, `=SUM(J2:J101)` is **82**, and the placement rate `=SUM(J2:J101)/SUM(I2:I101)` is **82%**.

**Export without verification columns:** Create a new worksheet `Employment_Export`; copy **only A1:Q101** from `Employment_Consolidated` and use **Paste special → Values only**. Download the **active `Employment_Export` sheet** as CSV and name it `Employment_Consolidated_100.csv`. This prevents the verification columns S:T and working formulas from entering the CSV. Compare the 17 fields against `06_EXPECTED_Clean_100_Records.csv`, allowing equivalent date/number formatting. The barangay coordinates represent reference locations, **not** applicants' home addresses.

### Optional: Monthly update challenge
Use `07_Monthly_Update_Practice.xlsx` as a **separate** exercise after the 100-record output is correct. It contains:
- Six new-registration submissions: five unique new applicants (APP-0101–APP-0105) and one exact duplicate of APP-0103.
- One `Concep. Grande` value to standardize.
- Two status updates for **existing** applicants APP-0063 and APP-0066, both Pending → Placed. These updates do **not** create new applicants.

Classify each submission as new, duplicate, or update. Apply the same cleaning and verification rules. Do not stack the two status updates as applicant registrations. Compare your decisions with `09_Monthly_Update_Decisions.csv` and the final records with `08_EXPECTED_After_Monthly_Update_105_Records.csv`.

| Indicator | Baseline | Updated |
|---|---:|---:|
| Unique applicants | 100 | 105 |
| Placed | 82 | 86 |
| Pending | 11 | 11 |
| Withdrawn | 7 | 8 |
| Placement rate | 82.00% | 81.90% |

The updated rate decreases slightly even though placements increase. Compare absolute counts and rates carefully.

**Check your work:** A verified 17-column, 100-row CSV is ready for reporting; optional update yields 105 unique applicants.

## Module 6. From Data to Decisions
**Suggested live time: 15 minutes; longer indicator planning is optional.**

### What question does the indicator answer?
The synthetic 100-applicant exercise yields 100 registered, 82 placed, 11 pending, and seven withdrawn. The **placement rate** is `(82/100)×100 = 82%`. This measures the share of applicants classified as placed in the practice dataset. It does **not** measure overall city employment or jobs created.

### Compare meaningful measures
A barangay with 20 pending cases out of 200 applicants has a 10% pending rate; one with 10 pending out of 40 has a 25% rate. Counts indicate workload; rates help compare proportions. Both need a stated denominator and reporting period. These numbers are illustrative, not computed from the practice data.

### Choose a visualization
- Scorecard: total registrations or placements.
- Bar chart: status, sector, industry, or barangay comparison.
- Line chart: registrations or placements over time, once dates are validated.
- Geographic chart: distribution by barangay, using reference coordinates and clear labeling.

**Try it:** The mayor asks which barangays have the most pending applicants. Identify the relevant fields (`Barangay`, `Status`, `Applicant_ID`), the measure (pending applicant count, optionally pending rate), and a suitable chart (sorted bar chart). Explain why a map marker is not a home address.

### Connect carefully to Naga 2028
The Naga 2028 Finish Lines include **1.1.4, Number of jobs generated in priority investment industries or areas**, under the vision of a thriving and inclusive economy. The workshop's applicant placements are **not equivalent** to jobs generated. For official monitoring, first define the indicator, eligible industries/areas, period, authoritative sources, calculation rules, update responsibilities, and validation checks.

### Keep reports current
A useful dashboard requires an agreed update cycle: source offices submit records; a custodian checks completeness; responsible offices resolve exceptions; the reporting team verifies indicators; authorized users publish the results. A more integrated information system can reduce repeated file transfers, but shared definitions, access controls, and accountability are still necessary.

### Day 2 handoff
Download the **separate synthetic 850-applicant dataset** (`07_Session6_Full_Clean_850_Records.csv`, if included in the final training package). It uses the same 17-field structure but has different totals: **850 registered, 510 placed, 259 pending, 81 withdrawn**. Do **not** combine it with the 100-applicant practice dataset. Everyone can participate in the dashboard exercises regardless of whether they completed the optional monthly update.

**Apply to your office (optional):** For one official indicator, record its definition, numerator/denominator if relevant, reporting period, source office, update frequency, validation rules, intended audience, and decisions it could support.

---

## Facilitator schedule (215 minutes)
| Time | Activity | Module |
|---|---|---|
| 1:00–1:20 | Reporting problem, grain, identifiers | 1 |
| 1:20–1:50 | Import and inspect four source tables | 2 |
| 1:50–2:20 | Diagnose actual data-quality problems | 3 |
| 2:20–3:00 | Begin formula-based cleaning, duplicate review | 4 |
| 3:00–3:15 | Break | |
| 3:15–3:40 | Complete validation and produce 100 clean registrations | 4 |
| 3:40–4:20 | Reconcile and join sources; add indicators | 5 |
| 4:20–4:35 | Verify output, export CSV | 5 |
| 4:35–4:50 | Interpret indicators and prepare for Day 2 | 6 |

**Self-paced:** Narrative extraction with Gemini; reference-mapping extensions; data validation dropdowns; array formulas; monthly update challenge; indicator planning worksheet.

## Source-of-truth checklist for website implementation
1. The four raw worksheets are immutable and have the expected row counts.
2. The only required review decision is the verified identical APP-0013 duplicate.
3. The main validated registration output has 100 rows and no unresolved exceptions.
4. The final consolidated columns exactly match the 17-field expected CSV; date fields are converted from text to numeric dates before export.
5. Placement and status source IDs reconcile against validated registrations, with no conflicts.
6. Final totals are 100 / 82 / 11 / 7; optional update 105 / 86 / 11 / 8.
7. Day 2's 850-row dataset is independent and downloadable.
8. All worksheet names, helper-column placements, formula references, and exercise files are consistent with the live-tested guide.
9. AI activities use fictional data and require human verification.
10. Website interactions illustrate concepts; participants perform the main exercise in Google Sheets.

### Implementation status and caveat
Google Sheets formulas here use the English-language comma argument separator and the standard US-style array-literal separators. Locale settings can require separator adjustments. The core Modules 4–5 formulas and reconciliation checks **were executed successfully in a live Google Sheets exercise** on 29 October 2026. The optional monthly update challenge and the final website interactions have **not** yet undergone the same live test. Google Sheets locale differences may still require adaptation.
