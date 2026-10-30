# Module 9 facilitator checks (fictional data)

- Registrations source: 21 rows, 20 distinct beneficiary IDs. BEN-005 appears twice.
- Outcomes source: 22 rows, 21 distinct IDs. BEN-007 appears twice, and BEN-999 is unmatched.
- Standardization: BEN-007 `Concep. Grande` -> `Concepcion Grande`; BEN-011 ` pacol ` -> `Pacol` (trim and case normalization).
- BEN-010 `Unknown Zone` is not in the five-item reference. It must be flagged for verification, **not silently guessed or changed**. The answer key uses `[REVIEW REQUIRED]` for this field.
- Reconcile on distinct Beneficiary_ID after excluding duplicate records and unmatched BEN-999: 20 matched IDs.
- Status totals: 16 Completed, 3 Ongoing, 1 Withdrawn. Completion share = 16/20 = 80% of registered practice beneficiaries.
- Hours sum = 16×20 + 3×8 = 344 recorded hours. This is a synthetic field, not a measure of service effectiveness.
- The answer key is a *conditional* result: status reconciliation is complete, but barangay quality is unresolved for BEN-010. Report that limitation.
