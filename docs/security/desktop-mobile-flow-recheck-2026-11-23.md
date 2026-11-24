# Desktop/mobile security-flow recheck — 2026-11-23

## Outcome: NOT VERIFIED end-to-end

Tested the running app while signed in as Henrique, at desktop 1440×1000 and mobile 390×844. No publishing, real-account writes, security-policy changes, or new scans were performed.

| Flow | Desktop and mobile evidence | Result |
|---|---|---|
| Sponsor change approval | Pending and approved filters load successfully; both return zero requests. No real request was available to approve. | Page/filter checks PASS; integrated approval NOT VERIFIED. |
| Profile suggestions | Signed-in page opens; own pending-suggestions reads return zero rows. No confirmation control is available. | Page/read checks PASS; integrated application NOT VERIFIED. |
| Audit summary | Opening the audit tab and clicking Reload returns 15 rows, rendered in the table on both sizes. | PASS for authenticated summary read. |
| Detailed audit | Actual requests on initial tab load and Reload return HTTP 400: `column reference "table_name" is ambiguous`. | FAIL. |
| Audit download | Clicking Export detailed CSV downloads a file with 15 data rows and nine columns. A success toast appears despite the failed detailed request. | Download works, but detailed-report completeness is NOT VERIFIED; failure is silently hidden. |
| Mobile audit layout | No document-wide horizontal overflow, but the audit heading wraps into a narrow column beside the buttons and becomes difficult to read. | FAIL for readability. |

All six page/viewport combinations stayed on the requested authenticated path, without page exceptions or document-wide horizontal overflow. These observations do not certify populated approval forms or all access-control paths.

## Current-function checks with synthetic data

Fetched all four current function definitions through read-only inspection. Loaded them with `tests/security/round2-fixture.sql` into a disposable local PostgreSQL database and reran `tests/security/round2-isolated.sql`. The suite intentionally exited 3 because two criteria failed. Its transaction was aborted and the temporary server stopped.

- PASS: all ten permitted sponsor fields update; protected sponsor data stays unchanged; each allowed approval creates its audit entry.
- PASS: non-admin sponsor approval is denied in the focused fixture test.
- FAIL: a sponsor request containing only a forbidden field is marked approved rather than rejected, although the protected field does not change.
- PASS: four permitted identity fields and two aliases persist.
- PASS: forbidden identity fields are refused and remain pending; another owner's suggestion is inaccessible.
- FAIL: identity changes report success without the expected audit entry.

The focused fixture replaces identity/role checks and omits production triggers and policies. It is not integrated application, notification, trigger, or row-policy certification, and is not a substitute for an actual populated desktop/mobile UI flow against a complete disposable backend.

## Evidence and blockers

Temporary evidence is under `/tmp/browser/security-flow-recheck/` (screenshots, page results, and downloaded reports) and `/tmp/security-flow-recheck/function-tests.log`. These temporary paths are not durable deliverables.

Before certifying the fixes: resolve the detailed-audit query error, restore identity-change audit recording, reject forbidden sponsor payloads, make the mobile audit heading readable, and provide a complete disposable application backend with synthetic requests/suggestions for actual approval and application through both viewport sizes. No finding was marked fixed or ignored during this verification request.

## Related-flow sweep — read-only

Rule: approval changes only permitted fields, records the change, and never reports an unverified result as success; settled requests stay unchanged.

| Place read or exercised | Assessment |
|---|---|
| Admin sponsor request screen and before/after diff | Errors from approval are shown, but the screen trusts successful function completion. Inherits the forbidden-only approval failure. Diff renders supplied keys as text. Empty queues prevented populated form testing. |
| Sponsor self-service form, history, submission function | Submission checks ownership, permitted keys, pending-request limits, and writes audit plus admin notifications. Form uses the same permitted-key catalog. Renewal is an intentionally allowed eleventh key at submission, but review applies only ten ordinary fields: approval can promise completion without any renewal processing. Read-only finding, not proof of completed billing. |
| Sponsor cancellation function and history | Checks requester/admin and pending status and writes audit. Unlike approval, it does not lock the request before reading/updating, so concurrent cancellation versus review warrants an isolated race test. Race not executed. |
| Sponsor notification loop in review | Notifications are transactionally inserted after request/audit updates, but their success wording inherits the false-approval result. Delivery not tested. |
| Identity suggestion page and dashboard summary | Both use the same widget/function. Reads hide errors as an empty widget; action handling removes an item even for an unhandled `not_found` response. Both inherit missing identity-change audit recording. Dashboard registry use was read. |
| Identity apply/dismiss function | Application has owner and field checks but suppresses audit errors. Dismissal updates status without an audit insertion. Settled status is checked, but no row lock is used: concurrency not certified. |
| Audit tab, reload, detailed download | Actual desktop/mobile read and download tests confirm basic success and detailed failure. Code silently ignores the detailed error and fills absent detail in exports while claiming a detailed success. Mobile heading readability fails. |
| Audit summary/detailed functions | Current definitions inspected. Summary succeeded with the signed-in user; detailed failed on both sizes. Neither writes records. |
| Portability restoration schema-integrity action | Source allows a missing/failed summary result to become `userRef=null`, then treats coverage as passing. It also calls the admin-only audit through a privileged client without the caller's identity. Deployed execution not tested. |
| Portability restoration smoke tests | Source reports audit call errors as failure, but does not exercise detailed audit, sponsor approval, or identity application. Deployed execution not tested. |
| Dashboard periodic health check and health-details screen | Both use `validate_db_health`, which checks function/column existence, not behavior; therefore healthy status does not certify these fixes. Periodic persistence ignores returned insert errors. Details screen ignores history-query errors. Source read, not run in this expanded sweep. |
| Scheduled consumers | Read-only query of `cron.job` found no commands referencing these approval/suggestion/audit functions or tables. Dashboard's periodic check is client-side. This query does not rule out indirectly invoked jobs. |

Repository searches found no additional direct consumers of the four target functions beyond these paths. No current public function referencing the suggestion table was returned except the resolver; suggestion-generation behavior remains unverified. Historic migration definitions were identified as deployment sources, not assumed to be additional live flows.

Because the user's request was testing, no behavior, settings, permissions, examples, or settled records were changed. Corrections across the related flows require a separate implementation request. Existing blockers for populated end-to-end desktop/mobile testing remain unchanged.