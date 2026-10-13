# Ascendiq hackathon demo script

Use an isolated Supabase test project and accounts containing synthetic information only. The CSV examples in `public/demo-data/` use the placeholder `DEMO-ROLL-001`, admission cohort 2026, and are synthetic. The image `SYNTHETIC_TEST_ONLY_student_id_proof.png` says NOT AN ID and NOT OFFICIAL IDENTIFICATION; it is only for exercising the private upload flow. These files will not match a profile unless a trusted operator creates synthetic fixtures in that isolated test project. Never import them into production or use the image to verify a person.

1. **Purpose (30 sec):** Open the landing page and describe Ascendiq as a role-aware view of learning progress and support needs.
2. **Registration (45 sec):** Show the institution/program/department/admission-year dependencies with an active demo catalog. Demo signup must be rejected. In a separate isolated project with a trusted synthetic verified catalog, use a test mailbox and upload `SYNTHETIC_TEST_ONLY_student_id_proof.png`. It is visibly marked NOT AN ID / NOT OFFICIAL IDENTIFICATION and only tests file handling. Never use it for a real review.
3. **Verification (30 sec):** Show the verification-pending screen. In a separate trusted reviewer account, review a synthetic request and show pending/approved/rejected states if reviewer setup exists.
4. **Student portal (45 sec):** Show the student's own profile, status, empty analytics states, and transparent score components. Explain that missing inputs remain missing and scores are prototype indicators.
5. **Faculty portal (45 sec):** Show only an assigned synthetic student, and an intervention with supportive wording, evidence, due date, and follow-up. Do not imply faculty can browse unassigned students.
6. **Institution admin (60 sec):** Use the synthetic CSV templates, map and stage a file, inspect row validation, confirm the import, then filter the available charts and inspect import quality. Describe matching by institution, roll number, and admission year, duplicate detection, and no silent overwrites.
7. **Placement portal (30 sec):** Show only the available readiness bands; explain that no eligibility or employment outcome is inferred without configured evidence.
8. **Security and responsible use (30 sec):** Describe database RLS, private verification files, trusted staff memberships, and the non-predictive, support-oriented nature of indicators.

If an expected role, import, score, or chart is unavailable, show its honest setup/empty state and say which migration or trusted membership is needed. Do not fabricate activity or claim hosted security checks that were not executed.
