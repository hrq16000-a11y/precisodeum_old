# Related-flow corrections — 2026-11-24

## Delivery boundary

Approved scope: correct future behavior without changing settled records, permissions, or settings. No publishing, shared database mutations, grant/policy changes, new scans, or settled-record repairs were performed. Existing production definitions were inspected read-only.

`related-flows.sql` is an **unapplied local candidate**, not an applied migration. It replaces four existing functions without changing signatures, security modes, or access grants. Apply it through the migration tool only when shared-backend deployment is authorized. Do not edit historic migrations or mark security findings resolved before deployed verification.

The existing restoration endpoint's source is corrected but has not been deployed. It remains a legacy endpoint; this request introduces no new endpoint.

## Corrections

- Sponsor review rejects empty, mixed forbidden, malformed, and renewal payloads before status changes or notifications. Missing sponsors fail instead of producing false approval. Renewal requests remain pending and must use the existing billing workflow; no payment, subscription, or expiry change is inferred.
- Review and cancellation lock the same pending request. Identity apply/dismiss lock the suggestion; application also locks the profile. Settled requests and suggestions are not rewritten.
- Identity changes use the actual audit columns. Application and dismissal write audit records. Failed audit insertion rolls back the change instead of silently succeeding.
- Detailed audit qualifies catalog columns and surfaces missing-sample query failures. It remains security-invoker and admin-gated.
- The review page blocks unsupported approvals and distinguishes read failures from an empty queue. This browser check is not a substitute for the pending database correction.
- Suggestion reads show loading/error/retry states. Unknown or unavailable action responses no longer remove the item as if successful. Concurrent local action buttons are disabled.
- Audit reload clears previous completion status. Detailed export is disabled unless every summary table has detail. The mobile heading no longer squeezes beside action buttons.
- Restoration requires a verified audit, even in non-strict mode. Audit requests retain the caller's identity; smoke checks include detailed audit. Coverage settings remain unchanged.
- Dashboard health persistence checks returned errors and advances throttling only after a successful insertion. Health wording describes structural presence, not successful business actions. Health-history read errors are surfaced.

## Verification

1. `bash tests/security/run-related-flows.sh`: PASS against fresh disposable PostgreSQL with synthetic schema/data, removed on exit. Covers ten allowed sponsor fields, protected data preservation, invalid payloads, notifications, admin denial, identity fields/aliases, ownership, dismissal audit, settled-status preservation, rollback on failed audit insertion, and detailed counts/index/sample/admin restriction.
2. `bunx vitest run src/test/related-flow-integrity.test.ts`: 5 PASS. Existing service-creation and admin-photo/click suites: 5 additional tests PASS.
3. Signed-in Playwright at 1440×1000 and 390×844: sponsor review, identity suggestions, and portability opened as the requester without page exceptions or document-wide horizontal overflow. Audit reload returned the existing shared-backend detailed-query error; it was visible and export stayed disabled before/after reload. Screenshots confirmed the mobile heading was readable.
4. Preview compilation reported `build OK`; whitespace checks passed.

## Not certified

- Populated approval/application UI: shared queues remain empty. No real sponsor/profile records were created or changed. Synthetic function tests omit production triggers, actual roles, row policies, and authentication integration; they cannot certify these.
- Concurrent review versus cancellation under actual production triggers/policies was not exercised. Row locking is implemented locally; sequential settled-status regressions passed.
- External notification delivery, restoration deployment, and the corrected shared-backend detailed report remain unverified.
- No finding was marked fixed or ignored. Local tests do not establish deployed remediation.

Next gate: authorize applying the local candidate and deploying source corrections, then exercise populated flows against a complete disposable application backend before claiming full homologation.