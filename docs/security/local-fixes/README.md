# Related-flow corrections — 2026-11-24

## Delivery boundary

Approved scope: correct future behavior without changing settled records, permissions, or settings. No publishing, shared database mutations, grant/policy changes, new scans, or settled-record repairs were performed. Existing production definitions were inspected read-only.

`related-flows.sql` is an **unapplied local candidate**, not an applied migration. It replaces five existing functions without changing signatures, security modes, or access grants. Apply it through the migration tool only when shared-backend deployment is authorized. Do not edit historic migrations or mark security findings resolved before deployed verification.

The existing restoration endpoint's source is corrected but has not been deployed. It remains a legacy endpoint; this request introduces no new endpoint.

## Corrections

- Sponsor review rejects empty, mixed forbidden, malformed, and renewal payloads before status changes or notifications. Missing sponsors fail instead of producing false approval. Renewal requests remain pending and must use the existing billing workflow; no payment, subscription, or expiry change is inferred.
- Review and cancellation lock the same pending request. Identity apply/dismiss lock the suggestion; application also locks the profile. Settled requests and suggestions are not rewritten.
- Identity changes use the actual audit columns. Application and dismissal write audit records. Failed audit insertion rolls back the change instead of silently succeeding.
- Rodada 2B: application audit stores only the normalized field and suggestion identifier, with author, target, action and timestamp in the audit row; old/new identity values and untrusted source text are omitted. Targeted synthetic privacy checks cover four fields and two aliases.
- Detailed audit qualifies catalog columns and surfaces missing-sample query failures. It remains security-invoker and admin-gated.
- The review page blocks unsupported approvals and distinguishes read failures from an empty queue. This browser check is not a substitute for the pending database correction.
- Suggestion reads show loading/error/retry states. Unknown or unavailable action responses no longer remove the item as if successful. Concurrent local action buttons are disabled.
- Audit reload clears previous completion status. Detailed export is disabled unless every summary table has detail. The mobile heading no longer squeezes beside action buttons.
- Restoration requires a verified audit, even in non-strict mode. Audit requests retain the caller's identity; smoke checks include detailed audit. Coverage settings remain unchanged.
- Dashboard health persistence checks returned errors and advances throttling only after a successful insertion. Health wording describes structural presence, not successful business actions. Health-history read errors are surfaced.

## Verification

1. `bash tests/security/run-related-flows.sh`: PASS against fresh disposable PostgreSQL with synthetic schema/data, removed on exit. Covers ten allowed sponsor fields, protected data preservation, invalid payloads, notifications, admin denial, identity fields/aliases, ownership, dismissal audit, settled-status preservation, rollback on failed audit insertion, and detailed counts/index/sample/admin restriction.
2. Wider sweep: result-integrity, sponsor submission/cancellation, offline report evidence, and existing sponsor self-service suites: 26 tests PASS. Earlier service-creation and admin-photo/click suites: 5 additional tests PASS.
3. Signed-in Playwright at 1440×1000 and 390×844: sponsor review, identity suggestions, and portability opened as the requester without page exceptions or document-wide horizontal overflow. Audit reload returned the existing shared-backend detailed-query error; it was visible and export stayed disabled before/after reload. Screenshots confirmed the mobile heading was readable.
4. Preview compilation reported `build OK`; whitespace checks passed.

## Not certified

- Populated approval/application UI: shared queues remain empty. No real sponsor/profile records were created or changed. Synthetic function tests omit production triggers, actual roles, row policies, and authentication integration; they cannot certify these.
- Concurrent review versus cancellation under actual production triggers/policies was not exercised. Row locking is implemented locally; sequential settled-status regressions passed.
- External notification delivery, restoration deployment, and the corrected shared-backend detailed report remain unverified.
- No finding was marked fixed or ignored. Local tests do not establish deployed remediation.

Next gate: authorize applying the local candidate and deploying source corrections, then exercise populated flows against a complete disposable application backend before claiming full homologation.

## Wider sweep inventory

Rule: a supported change must persist and be audited before it is reported as applied; unavailable or incomplete evidence must not be reported as success. Settled records remain untouched.

| Place actually read or run | Compliance after local correction | Evidence / remaining limit |
| --- | --- | --- |
| Admin sponsor review screen and before/after diff | Read failures surfaced; invalid/renewal approvals blocked. Diff is text-only and makes no mutation claim. | Both files read; review screen opened at desktop/mobile. Populated review not available. |
| Sponsor edit-campaign page, request form, renewal button, history and cancellation controls | History loading/failure no longer becomes an empty queue with an enabled form. Submission requires a returned receipt. Thrown cancellation errors no longer escape handling or report success. | All source read; receipt/cancellation regressions run. Actual sponsor account flow not run. |
| `sponsor_submit_change_request` | Existing owner/allowlist/quota/audit rules preserved; local candidate rejects null changes and missing sponsor before inserting a receipt. | Current definition read and candidate tested locally. Real notifications/triggers/row policies unverified. |
| `admin_review_sponsor_change_request`, its audit insertion and contact-notification loop | Local candidate atomically rejects unsupported approval, updates allowed fields, audits, and inserts notifications. | Local regressions pass; deployed definition remains unchanged. Delivery not tested. |
| `sponsor_cancel_change_request` | Local candidate locks the same pending row as review, preserving settled status and audit atomicity. | Code read and sequential local regression run; concurrent integration not certified. |
| Identity suggestion page and dashboard section registry | Both use the corrected shared widget. Read failures visible; unknown action results cannot remove the item as success. | Page, registry and widget read; page opened desktop/mobile. Populated application unavailable. |
| `resolve_identity_suggestion` apply/dismiss and audit | Local candidate locks rows and uses real audit columns; failure rolls back; settled suggestions unchanged. | Field/alias/ownership/audit/dismiss/rollback local regressions pass. Actual authentication/triggers/policies unverified. |
| Audit tab, reload and detailed export | Incomplete detail is visible and export remains disabled. Mobile heading readable. | Code read; signed-in read/reload verified on desktop/mobile; live detailed query still fails pending local candidate deployment. |
| `audit_user_ref_health` and `audit_user_ref_full_detailed` | Summary remains admin-gated/invoker and unchanged. Detailed local candidate qualifies catalog names and stops suppressing sample errors. | Definitions read; live summary succeeds; detailed candidate locally tested. |
| Restoration tab individual checks, run-all and final summary | Requires explicit success and verified audit evidence. Skipped manifest is failure, old results are discarded, overlapping runs disabled, automatic checks do not claim manual steps complete. | Code read and pure response regressions run; actual restoration UI actions not run. |
| Restoration endpoint schema-integrity and audit smoke checks | Requires caller-scoped verified audits; no success on missing coverage. | Code read; pure helper regressions pass; legacy endpoint source not deployed or executed. |
| Restoration endpoint storage inventory and manifest comparison | Listing failures propagate; directories paginated; partial/unhashed inventories cannot succeed; empty/unsupported/unverifiable manifests rejected. | Code read and helper tests run; real storage actions not executed. Existing sampling/settings unchanged. |
| Dashboard layout, periodic health widget, `validate_db_health`, health details/history | Structural presence is not business-action certification. Persistence errors checked before throttling; history read errors shown. | Layout/widget/details and current function read. Periodic timing unchanged; persistence/history failure integration not executed. |
| Offline restore-bundle utility | Its dry-run flag remains explicit; it is not accepted as completed restoration by the consolidated report. | Code read only; uploads not run, no target credentials available. |
| Offline validate-restore utility | Incomplete media reads/empty manifest cannot certify full validation. | Code read and changed; target-dependent execution not available. |
| Offline migration-report utility | Requires successful non-dry-run restoration and successful validation with matching counts. Missing or failed reports cannot be inferred successful. | Actual utility run with synthetic ZIP/reports: 4 regression cases pass. |
| Scheduled database jobs | No direct matching consumers found for these functions/tables. | Current read-only cron query returned zero matches; indirectly invoked jobs remain unverified. |

Further sweep corrections are source-only. No paid, sent, closed or other settled records, settings, permissions, production credentials, or live example data were modified. A browser recheck initially timed out opening mobile review; a fresh run completed all six page/viewport checks without exceptions. This does not certify the unavailable populated flows.