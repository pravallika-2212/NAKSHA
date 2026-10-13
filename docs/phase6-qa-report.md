# Phase 6 QA report

Run date: 2026-10-12. Scope: local build/tests, safe public Supabase reads, source/migration inspection, and demo/deployment preparation. No users were created and no database writes or deployments were performed.

| Check | Status | Evidence / limitation |
|---|---|---|
| Local build and TypeScript | **Passed** | `npm run build` completed (`tsc -b` and Vite production build). Portal code is a separate lazy-loaded chunk; main JS is 489.22 kB (139.16 kB gzip). |
| Automated tests | **Passed** | `npm test` passed all 15 Node tests for CSV validation, score rules, and trusted role routing. The sandboxed first attempt failed because Node could not spawn worker processes (`EPERM`); the permitted retry succeeded. |
| Environment configuration | **Passed** | `.env.local` exists and both expected Vite variables are non-empty. Values were not printed. `.env.example` was changed to contain blank placeholders only. |
| Live Supabase connection | **Passed (read only)** | Public REST GET returned HTTP 200. One active institution was returned and it is labeled demo. No credentials were exposed. |
| Hosted Phase 4 schema | **Blocked — manual setup required** | Zero-row GET probe for `data_imports` returned HTTP 404 using the public key. Because the migration intentionally denies anonymous access to this private table, this response cannot distinguish an unapplied migration from the expected denial. Check Table Editor and SQL Editor in the dashboard. |
| Hosted Phase 5 schema | **Blocked — manual setup required** | Zero-row GET probe for `phase5_score_snapshots` returned HTTP 404 using the public key. The table is private, so the public probe is inconclusive. Check Table Editor and SQL Editor in the dashboard. |
| Hosted demo institution data | **Passed** | The safe catalog request found one active institution with `is_demo = true`. No course/department relationship or real institution claims were verified in this probe. |
| Registration catalog behavior | **Not tested end to end** | Source uses institution-scoped course/department queries and course duration for academic years; no browser automation package is installed and no registration was submitted. |
| Registration and verification | **Not tested** | No test account was created. Source inspection shows sign-up, confirmation callback, pending status, optional private document upload, and trusted reviewer RPC. Hosted workflow remains unverified. |
| Login/session/sign-out | **Not tested** | Auth client config enables persistent sessions and source subscribes to auth state; no account-based browser session was exercised. |
| Password recovery | **Not tested** | Source requests reset at `/reset-password` using the current origin; the production Supabase redirect allow-list and email flow were not verified. |
| RLS and private Storage | **Blocked — hosted verification required** | Source SQL defines RLS and private verification storage; static inspection is not a database security test. The public probes for private Phase 4/5 tables were intentionally inconclusive. No authorized/unauthorized account matrix or signed document access tests were run. |
| Secret-key frontend scan | **Passed (static scan)** | No `service_role`, `SUPABASE_SERVICE_ROLE`, or `sb_secret` strings were found in `src`, `public`, or `package.json`. |
| Lint | **Not configured** | `package.json` has no lint script. |
| Browser E2E / visual accessibility / network console | **Not configured / not tested** | No Playwright, Cypress, or React Testing Library dependency is installed. Keyboard, mobile, contrast, console, and network checks were not performed in a browser. |
| Deployment | **Not deployed** | No frontend host or production URL is configured. See `deployment.md`. |

## Implemented for Phase 6

- Added `docs/deployment.md` with build/output/env settings, migration and private Storage checklist, auth redirect steps, secret handling, rollback, and troubleshooting.
- Added `docs/demo-script.md` for the role-specific product walkthrough and responsible analytics explanation.
- Added synthetic CSV samples for all seven import categories under `public/demo-data/`; files and README label them synthetic and warn that placeholder IDs are only for isolated test fixtures.
- Removed project-specific values from `.env.example`; it now contains empty placeholders.
- Confirmed reduced-motion CSS is already present for the portal drawer and spinner. The import spinner still animates under reduced motion; this small UI limitation remains.

## Required hosted verification before real use

1. In the intended Supabase project, verify migrations 001, 002, and 003 before applying `202610120004_phase4_data_analytics.sql`, then apply `202610120005_explainable_intelligence.sql` in order. Do not reset the database.
2. Verify the new tables/RPCs in Table Editor/API and test the import and scoring paths in an isolated project with synthetic approved profiles.
3. Use separate student, assigned/unassigned faculty, reviewer, admin, and placement test accounts to test same-institution and cross-institution reads/writes, self-approval denial, role-grant denial, and sign-out route behavior.
4. Confirm the `student-verifications` bucket is private. Test owner upload/read and reviewer access, and confirm anonymous and unrelated accounts are denied.
5. Configure the production auth site URL and reset redirect allow-list only after choosing a host; test confirmation and password reset end to end.
6. Add a browser E2E toolchain and run the registration, review, import, analytics, intervention, and sign-out flows before calling Phase 6 fully verified.

These steps have not been performed by this workspace. Do not assume Phase 4/5 migrations are absent based on the public-key 404 probes: private-table access is deliberately restricted. First check the Dashboard Table Editor for `data_imports` and `phase5_score_snapshots`; apply a migration only if the dashboard confirms its objects are missing. Do not import real student data or treat this implementation as production-ready until hosted RLS, Storage, and end-to-end checks have passed.
