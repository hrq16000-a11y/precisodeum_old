# Related-flow corrections — 2026-11-24

## Delivery boundary

Approved scope: correct future behavior without changing settled records, permissions, or settings. No publishing, shared database mutations, grant/policy changes, new scans, or settled-record repairs were performed. Existing production definitions were inspected read-only.

`related-flows.sql` is an **unapplied local candidate**, not an applied migration. It replaces five existing functions without changing signatures, security modes, or access grants. Apply it through the migration tool only when shared-backend deployment is authorized. Do not edit historic migrations or mark security findings resolved before deployed verification.

The existing restoration endpoint's source is corrected but has not been deployed. It remains a legacy endpoint; this request introduces no new endpoint.

## Corrections

- Sponsor review rejects empty, mixed forbidden, malformed, and renewal payloads before status changes or notifications. Missing sponsors fail instead of producing false approval. Renewal requests remain pending and must use the existing billing workflow; no payment, subscription, or expiry change is inferred.
- Review and cancellation lock the same pending request. Identity apply/dismiss lock the suggestion; application also locks the profile. Settled requests and suggestions are not rewritten.
- Identity changes use the actual audit columns. Application and dismissal write audit records. Failed audit insertion rolls back the change instead of silently succeeding.
- Rodada 2B: application audit stores only the normalized field and suggestion identifier, with author, target, action and timestamp in the audit row; old/new identity values and untrusted source text are omitted. Authorized follow-up also removes source text from dismissal audit, preserving the original field identifier and atomicity. Targeted synthetic privacy checks cover four fields, two aliases, and dismissal without modifying identity or settled suggestions.
- Detailed audit qualifies catalog columns and surfaces missing-sample query failures. It remains security-invoker and admin-gated.
- The review page blocks unsupported approvals and distinguishes read failures from an empty queue. This browser check is not a substitute for the pending database correction.
- Suggestion reads show loading/error/retry states. Unknown or unavailable action responses no longer remove the item as if successful. Concurrent local action buttons are disabled.
- Audit reload clears previous completion status. Detailed export is disabled unless every summary table has detail. The mobile heading no longer squeezes beside action buttons.
- Restoration requires a verified audit, even in non-strict mode. Audit requests retain the caller's identity; smoke checks include detailed audit. Coverage settings remain unchanged.
- Dashboard health awaits history persistence before emitting success or recovery; failed persistence remains visible and retryable without advancing confirmed state or throttling. The first check requires its own confirmed history write instead of trusting a previous widget's cache. Health wording describes structural presence, not successful business actions. The history details page discards stale data and hides success/zero-failure/empty-history claims while loading or after any read failure.

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

## Authorized follow-up: dismissal privacy and health evidence (2026-11-24)

- Disposable SQL runner now includes the six apply privacy cases and dismissal provenance/privacy/identity-preservation/settled-state assertions; all pass. No shared SQL was applied.
- Six widget regressions cover write failure, missing read, missing author, awaiting recovery insertion, retry after failed recovery, and current-run evidence despite cached timestamp. Two history-page regressions cover failed initial read and clearing earlier success after failed reload.
- Signed-in browser verification at 1440×1000 and 390×844 used intercepted synthetic health/history responses and blocked application writes. Confirmed failed history read, successful empty history, failed reload clearing prior success, and visible dashboard write failure with retry; no page exceptions or mobile document overflow. This verifies presentation and response handling, not deployed database integration.
- No publication, settled-record repair, permission/configuration change or scanner action. Complete integration and NO-GO status remain unchanged.

Next gate: authorize applying the local candidate and deploying source corrections, then exercise populated flows against a complete disposable application backend before claiming full homologation.

## Follow-up flow sweep — code read on 2026-11-24

Rules: declining a suggestion must audit author/target/action/date/field without copying identity values or free-form source text; health history read/write failures must not certify absence of failures or confirmed recovery. Only these two authorized local flows may be changed.

| Place read in this sweep | Conclusion |
| --- | --- |
| `IdentitySuggestionsWidget`, full suggestion page and provider section registry | The page and dashboard summary share one action caller. Errors and unresolved responses do not remove suggestions as success. Source and suggested value are displayed to the owner, not written by the UI to audit. |
| Local `resolve_identity_suggestion`, apply and dismiss | Both audit inserts keep author/target/action/time plus field and suggestion ID; neither copies source or old/new identity values. Settled suggestions return without mutation. Disposable tests passed in the preceding verification. |
| `DashboardLayout` and `DashboardHealthCheck`, mount/interval/retry | Every layout consumer uses the same corrected widget. Recovery waits for history persistence; read/write failures surface and do not confirm success. The background interval is client-side, not a newly introduced server job. |
| `AdminPortabilityDetailsPage`, load/reload/history | Current read must complete before health cards and empty-history claims appear. Old evidence is discarded before reload. Intercepted desktop/mobile checks and local regressions passed in the preceding verification. |
| Historical `validate_db_health` migration | Checks function/column existence only. It cannot certify business actions or recovery persistence; unchanged. Current deployed definition was not fetched in this sweep. |
| Historical `health_check_history_autoclean` and AFTER INSERT trigger | Deletes old history probabilistically; does not announce recovery or write suggestions. Historical source read only; retention/settings and existing records unchanged. No matching cron registration found by repository search; actual deployed schedules were not queried in this sweep. |
| Historic identity migrations | Not edited; local candidate is still unapplied. Historical source is not proof of current deployed remediation. |
| `AdminLayout` → `runPostDeployAudit` | Independent diagnostic: ignores returned errors and converts missing reads to empty arrays, potentially emitting system-integrity success. Outside authorized history flow; left unchanged pending authorization. |
| `AdminSystemHealthPage` | Independent system/performance diagnostic has healthy defaults without data and performance query fallback to an empty array. Needs separate review/correction; outside scope. |
| `AdminAuthHealthPage` | Read error banner exists, but distribution still uses empty data to show health OK. Outside scope; unchanged. |
| `AuthHealthPanel`, including its periodic queries | Throws query errors but does not render their state; default arrays can show no error-page access. Outside scope; unchanged. |
| `AdminTrackingHealthPage` | Summary table reports errors; summary KPI defaults and recent-error list can still show zero/no errors on failed reads. Outside scope; unchanged. |
| `AdminUploadStressTestPage` | Main result read ignores returned error, defaults to an empty array, and can show no failures. Outside scope; unchanged. |
| `AdminErrorReportsPage` | List read has a toast but leaves empty/stale rows; KPI reads default missing counts to zero. Outside scope; unchanged. |
| `AdminGscSubmissionsPage`, history read and persistent alert evaluation | Failed history read emits a toast then clears rows; persistent-alert evaluation can report no threshold reached. Outside scope; settings, alert sends and functions untouched. |

These independent diagnostics were inspected in source, not exercised end-to-end or certified. Their database functions and external integrations have not been revalidated. No further app code changes were made during this sweep. Deployment, complete disposable-backend integration, concurrency, external notification delivery, restoration, exact historical finding pairs and public commit correspondence remain unverified; NO-GO remains.

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