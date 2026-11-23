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