# Student registration and identity verification — review packet

**Review state: local files prepared only. No hosted migration has been applied and no production record has been changed.** Do not run migration 006 or the updated demo seed against a hosted project until the project/schema owner has reviewed this plan and the SQL.

## Existing schema reused

- `institutions` already has code/type/state/district, active status, demo flag, source URL, and verification timestamp (migration 002).
- `institution_courses` is the existing academic program table; `name` is the program name and `duration_years` is already used to constrain the study-year dropdown.
- `institution_departments` links department, institution, and course using composite foreign keys.
- `profiles` is Auth-user-linked. The existing `handle_new_student_signup` trigger creates profiles from Supabase Auth signup metadata and clears that metadata after use.
- `student_verifications` stores status, submitted time, reviewer ID/time, document path, and reviewer note. `verification_reviews` is the reviewer audit log. The existing review RPC prevents self-review.
- `student-verifications` is an existing private Storage bucket with owner-folder upload/read and authorized same-institution reviewer read policies.

## Proposed migration order

1. Confirm the hosted project already has migrations 001–005. Do not rerun or reset them as part of this change.
2. Run the read-only preflight SQL below. If normalized roll-number collisions appear, investigate with the institution before proceeding; do not auto-merge or delete accounts.
3. Review `supabase/migrations/202610120006_student_registration_identity.sql` and approve its policy/function/index changes.
4. Apply migration 006 once. It adds catalog verification designation and academic-year start month, program degree, cohort-aware roll number, signup/year checks, reviewer reasons, a restricted orphan-upload cleanup policy, and the updated Phase 4 import matcher.
5. Run `supabase/seed.sql` only if demo dropdown data is wanted. It now uses insert-only `ON CONFLICT DO NOTHING`; it does not modify an existing institution/program/department.
6. Add real catalog data only with institution-authorized sources. A trusted operator sets `verification_status = 'verified'` after verification, records source and timestamp, and activates the catalog entries.
7. Test on a separate Supabase project with synthetic accounts before using real student data.

### Read-only collision preflight

```sql
select institution_id,
       coalesce(admission_year, 0) as cohort_year,
       lower(btrim(student_id)) as normalized_roll_number,
       count(*) as profile_count,
       array_agg(id order by created_at) as profile_ids
from public.profiles
group by institution_id, coalesce(admission_year, 0), lower(btrim(student_id))
having count(*) > 1;
```

Migration 006 backfills `roll_number` from legacy `student_id`, then creates uniqueness on institution + admission year + trimmed case-insensitive roll number. The migration itself repeats the collision guard and aborts transactionally if it detects a collision. Existing profiles without admission year are grouped in an `unknown` cohort (`0`) for this check; an operator should review those records and establish valid admission years before imports that require cohort matching.

## Security-sensitive changes for review

- `verification_status` is trusted catalog metadata: `unverified`, `verified`, or `demo`. Signup requires active, non-demo, verified institution/program/department records. New real entries must be explicitly verified by a trusted operator; a source URL alone does not prove verification.
- The global institution/student_id uniqueness constraint is replaced by institution/cohort/normalized-roll uniqueness. Phase 4 imports are updated to require roll number + admission year and match approved profiles in the selected institution. This is necessary to safely support colleges that reuse roll numbers across cohorts.
- Admission year is required for new student profiles. Current study year is checked against program duration, elapsed academic years, and `institutions.academic_year_start_month` (default January; trusted operator configurable). Repeating a year is allowed; advancing beyond elapsed academic years is rejected.
- Public/authenticated catalog privileges are reset to narrow SELECT column grants; catalog mutation remains trusted-operator-only. Students cannot update roll numbers or privileged fields. Supabase Auth remains the account/email source of truth; signup metadata is cleared after profile creation.
- Identity documents remain in the private bucket, with PDF/JPEG/PNG allow-list and 5 MiB maximum. A new security-definer RPC links only an already uploaded object in the caller's private folder and only for a pending/needs-information profile; browser insert/update/delete on verification rows is revoked. Student and reviewer UI use 60-second signed links, never public URLs. The additional delete policy allows a student to remove only an unlinked object in their own folder, to clean up after a failed verification submission. It cannot delete any object referenced by a verification record.
- Reject and needs-more-information decisions require a reason. The existing reviewer RPC still blocks self-review and writes reviewer ID, timestamp, decision, and note to the audit table.
- No role or faculty membership is assigned by this migration or public registration. Existing trusted membership/assignment workflows remain unchanged.

## Local validation and known limits

The registration helper unit tests cover trimming/flexible roll-number length, institution/cohort uniqueness scope, and configured academic-year calculations. CSV tests cover the new cohort fields; all seven demo CSV samples validate against the new templates. Local validation completed: `npm run build` passed, and `npm test` passed 21 tests. The Windows sandbox required an approved retry for child-process operations. No lint script or local PostgreSQL/Supabase executable is installed.

This workspace has no local PostgreSQL/Supabase stack. SQL syntax, Storage RLS, Auth trigger behavior, database uniqueness, and cross-institution authorization cannot be proven by the frontend unit tests. Hosted account creation, migrations, and production data are intentionally untouched.
