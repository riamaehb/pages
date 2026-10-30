# Version 17: Module 8 + progress safeguards

Deploy the contents of this ZIP to the SAME GitHub Pages origin/path as Version 16. Existing browser localStorage keys remain unchanged:
- naga-data-lab-progress-v1
- data-preparation-module5-checklist-v1

New features: Module 8 pivot tables and recurring reports; optional Module 9 preview; separate core and optional progress; local JSON export/import backup; clarified reset behavior; storage failure notices. No analytics added.

**Important:** Participant progress is local to each browser and origin. Updating files on the same origin does not erase it. Browser clearing, private sessions, or domain changes may lose access; use Export Progress first.

Module 8 answer check file: downloads/11_Module_8_Barangay_Summary_Check.csv.

Module 9 is not yet released; its preview is intentionally not counted toward optional completion.


## Version 18: Module 9
Added independent data preparation challenge, fictional source CSVs, cleaning-log template, expected reconciliation and facilitator checks. Optional progress is now 7–9. Original localStorage keys and import/export schema are unchanged; existing browser progress is preserved on the same origin.

## Version 19: privacy-conscious site analytics

GoatCounter tracking is enabled using the supplied site endpoint. Initial page visits are counted by the GoatCounter script; subsequent in-site module navigation is counted as anonymous navigation events with paths ending in `#module-N`. No exercise responses, checklist contents, progress data, or personal information are intentionally sent. Browser-based progress storage keys and backup formats are unchanged. Tracking can be blocked by privacy tools or browser settings.

## Regression checks

With Node.js, Playwright, and its Chromium browser installed, run:

```sh
node tests/review-regressions.cjs
```

To use an installed Google Chrome instead, set `PLAYWRIGHT_CHANNEL=chrome`.
The checks serve the local files through browser request interception and block
external requests. They cover quiz explanations, download targets, mobile
navigation and progress controls, and successful/failed progress imports.


## Version 20: Module 10 practical LGU reporting reference

Added Module 10 (internal route #module-11 to preserve the existing Downloads & Resources #module-10 route), with cross-links to Modules 1–9, recurring-report workflow, repeat-vs-update guidance, practical workbook, printable checklist, and reporting improvement plan. Completion is saved under module key 10 in the existing progress key; Modules 7–10 are now counted as four additional modules. Original progress keys and backup schema remain unchanged. The downloadable workbook contains fictional application-level data and is a starter requiring adaptation.


## Version 21: AI declaration and contact
Added an AI Declaration crediting co-development with ChatGPT 6 (brainstorming, planning, instructional content, and website coding) and Codex code review/fixes. Added a visible contact address with spaces to discourage basic harvesting; no mailto link. No changes to JavaScript, localStorage keys, progress import/export, navigation, or analytics.


## Version 22: Contact wording
Changed display name to Ria Borromeo in AI Declaration and Contact, and invited comments, suggestions, and questions. Email remains spaced and non-clickable. No changes to progress storage or application logic.


## Version 23: Display name
Updated AI Declaration and Contact display name to Ria Borromeo. No changes to website behavior or progress storage.
