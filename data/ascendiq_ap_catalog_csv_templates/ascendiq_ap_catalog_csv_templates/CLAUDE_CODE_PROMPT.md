# Claude Code Prompt --- ASCENDIQ Andhra Pradesh Catalog Import

Work in the existing project at `C:\ascendiq`. The CSV templates are in
`ascendiq_ap_catalog_csv_templates`.

## Goal

Build a safe, source-traceable pipeline to collect official/public
Andhra Pradesh institution, program, and department data and import
approved records into the existing Supabase schema.

## First: inspect, do not mutate

Inspect the existing migrations, `supabase/seed.sql`, README, database
access code, and actual table definitions. Pay special attention to: -
`public.institutions` - `public.institution_courses` -
`public.institution_departments` - Phase 3 portal access migration and
RLS Do not run migrations, modify hosted data, or import CSVs until you
present the plan.

## CSVs

Use: - `01_institutions.csv` - `02_academic_programs.csv` -
`03_departments.csv` - `04_academic_year_rules.csv`
(staging/configuration only until policy is approved) -
`05_data_dictionary.csv`

Read `README.md` for the field definitions. Do not add personal student
records to these catalog files.

## Source collection

Use official/public sources, prioritizing AISHE, UGC, Andhra Pradesh
affiliation portals, APSCHE, and official institution pages. For each
institution, program, and department, capture the exact source URL and
source name that supports that specific row. Do not invent codes, source
IDs, URLs, affiliations, programs, departments, durations, or
verification dates. Mark records `pending_review` unless evidence is
actually checked. Never claim the dataset is complete unless
completeness has been measured against a defined source/list.

If web access or source access is unavailable, generate a source
collection checklist and leave unknown values blank; do not fabricate
data to fill rows.

## Import design

1.  Validate headers, required fields, allowed values, duplicate keys,
    source URLs, state, duration, and foreign-key relationships.
2.  Treat `institution_key` and `program_key` as temporary import keys,
    not database IDs.
3.  Resolve keys to Supabase UUIDs using safe, deterministic matching.
    Do not match by fuzzy institution name alone without a review
    report.
4.  Prefer staging tables or a local validation/import script. Do not
    assume all staging columns exist in production tables.
5.  Produce a dry-run report listing inserts, updates, duplicates,
    unresolved relationships, missing sources, and conflicts before any
    write.
6.  Require explicit approval before applying writes to hosted Supabase.
7.  Use non-destructive upserts. Never delete existing rows, reset the
    database, or silently overwrite demo records.
8.  Keep real catalog records separate from synthetic demo records.
9.  Do not bypass RLS or put service-role keys in frontend code, CSVs,
    logs, or committed files.

## Academic and user identity rules

Admission year, study year, roll number, authenticated email, and ID
proof are student/profile/verification data, not institution catalog
data. Use Supabase Auth as the email/account source of truth. Keep ID
proof in private storage with strict RLS/storage policies. Do not create
staff memberships, faculty assignments, or user accounts from catalog
imports.

## Deliverables

-   Completed CSVs only where official evidence supports each record.
-   Source/verification report.
-   CSV validation script and tests.
-   Dry-run import report.
-   Proposed database mapping and any required additive migration.
-   Step-by-step operator instructions.
-   Tests for relationships, duplicates, and RLS-sensitive access.
-   Final status separating implemented, tested, and unverified items.

Stop before any hosted database write. Show me the dry-run report and
proposed migration/import steps for review first.
