# ASCENDIQ --- Andhra Pradesh Catalog CSV Templates

These files are **blank import/staging templates**, not a verified
real-institution dataset. No institution, program, department, code, or
source URL has been fabricated.

## Files

1.  `01_institutions.csv` --- one row per institution.
2.  `02_academic_programs.csv` --- one row per program offering at an
    institution. This maps conceptually to the existing
    `public.institution_courses` table.
3.  `03_departments.csv` --- one row per department associated with an
    institution and program. This maps conceptually to
    `public.institution_departments`.
4.  `04_academic_year_rules.csv` --- optional staging/configuration
    template for admission-year and study-year rules. Do not import it
    into production until the academic policy and destination schema are
    reviewed.
5.  `05_data_dictionary.csv` --- column-by-column explanations and
    validation notes.

## Relationship keys

Use `institution_key`, `program_key`, and `department_key` as temporary
import keys. They are **not** Supabase UUIDs or official institution
identifiers.

-   `02_academic_programs.institution_key` must match
    `01_institutions.institution_key`.
-   `03_departments.institution_key` must match
    `01_institutions.institution_key`.
-   `03_departments.program_key` must match a
    `02_academic_programs.program_key`.
-   A department's institution must equal the institution associated
    with its referenced program.

The importer should resolve these keys to existing or newly created
Supabase UUIDs in a controlled transaction or staged process.

## Important existing-schema mapping

The current project context indicates these existing tables/columns: -
`public.institutions`: `id`, `name`, `code`, `institution_type`,
`state`, `district`, `status`, `is_demo`, `catalog_source_url`,
`catalog_verified_at` - `public.institution_courses`: `id`,
`institution_id`, `name`, `duration_years`, `status` -
`public.institution_departments`: `id`, `institution_id`, `course_id`,
`name`, `status`

The exact live schema must be inspected before importing. Fields like
`degree_level`, source name, source record ID, verification status, and
notes may be staging-only unless the schema has reviewed columns for
them. Do not directly upload all columns into production tables without
mapping.

## Source and verification rules

-   Use official/public sources such as AISHE, UGC, Andhra Pradesh
    affiliation portals, APSCHE, and official institution pages.
-   Record the exact source URL that supports each individual record.
-   An institution source does not automatically prove its programs or
    departments.
-   Do not invent codes, source IDs, URLs, offerings, departments,
    durations, or verification dates.
-   Use `verified` only after someone has reviewed the evidence.
    Otherwise use `pending_review` or `needs_review`.
-   Real records must use `is_demo=false`. Do not silently convert or
    overwrite the existing demo record.

## Student data is not catalog data

Do **not** put real student emails, roll numbers, ID card files,
passwords, or user records in these catalog CSVs. User accounts should
be managed through Supabase Auth, with profile rows linked to the
authenticated user ID. Student ID documents must use private storage and
restrictive RLS/storage policies. Roll numbers are student-provided
identity attributes and should be validated/deduplicated according to
institution policy; they are not a public catalog.

## Safe import order

1.  Review current migrations, table definitions, constraints, and RLS.
2.  Collect source records into these templates and preserve provenance.
3.  Validate required fields, source URLs, duplicates, allowed statuses,
    duration values, and relationships.
4.  Import into staging tables or a reviewed staging process first.
5.  Review conflicts and map import keys to Supabase UUIDs.
6.  Upsert approved rows using a stable source identifier or reviewed
    matching rule.
7.  Verify row counts, foreign keys, RLS, and registration dropdown
    behaviour.
8.  Keep backups and do not drop tables or reset production data.

These templates intentionally contain headers only. They do not claim to
provide a complete Andhra Pradesh dataset.
