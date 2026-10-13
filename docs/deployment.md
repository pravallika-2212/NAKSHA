# Ascendiq deployment preparation

Deployment has not been performed. The frontend host has not been selected or configured. This checklist is provider-neutral; use the equivalent settings in your selected static frontend host.

## Frontend settings

- Build command: `npm ci` followed by `npm run build`.
- Publish directory: `dist`.
- SPA fallback: route all paths to `/index.html` so `/student`, `/faculty`, `/admin`, `/placement`, and authentication routes load on refresh.
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as frontend build environment variables. The publishable/legacy anon key is public; never set a service-role or secret key in a `VITE_` variable.
- Rebuild after changing frontend environment values. Do not commit `.env.local`.

## Supabase release checklist

1. Confirm the target Supabase project and take a database backup/export according to the project's plan.
2. Apply migrations `202610120001_phase2_identity.sql` through `202610120005_explainable_intelligence.sql` in numeric order. Then review `docs/student-registration-review.md` and migration `202610120006_student_registration_identity.sql` before applying it. Apply `supabase/seed.sql` only after migration 006 and only if demo catalog rows are wanted. These local files are not proof that the hosted project has them.
3. In Table Editor, confirm the expected tables, policies, functions, and indexes. Test with separate least-privilege accounts before using real student records.
4. Confirm the private verification document bucket and its policies from migration 001. Keep it private; test a signed-in authorized download and an unauthorized denial. Never make student documents public.
5. In Supabase Authentication URL Configuration, set the production site URL and allow-list only the production auth callback/reset URLs. `AuthPages.tsx` uses the current origin for recovery redirects; verify this URL against the deployed route before enabling recovery.
6. Confirm email confirmation, password, SMTP, and session settings for the production environment. Keep a trusted reviewer account and membership provisioning process outside public registration.
7. In a staging environment, test registration, verification review, password recovery, role routing, imports, scoring, and cross-institution denials using dedicated synthetic accounts.

## Rollback and troubleshooting

- Keep the previous frontend release available for instant host-level rollback.
- Before each database migration, retain a recoverable database backup. Prefer a reviewed forward-fix for schema changes; do not run a destructive reset as rollback.
- If a migration fails, stop the sequence, retain the full SQL error, inspect which statements committed, and resolve on a staging copy before retrying.
- If an SPA route returns 404 on refresh, configure the host's `/index.html` fallback.
- If Supabase reports missing configuration, check the two variable names and redeploy/rebuild. Never paste keys into logs or support messages.
- If a role page or query is denied, check membership, assignment, migration status, and RLS. Do not disable RLS to make the UI work.

No frontend host, production URL, hosted migration state, Storage policy test, or production auth configuration has been verified in this workspace.
