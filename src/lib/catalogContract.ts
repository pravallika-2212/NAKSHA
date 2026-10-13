// Public browser catalog columns and filters. Keep this allowlist aligned with
// the column-level SELECT grants in migration 006.
export const CATALOG_QUERY_CONTRACT = {
  institutions: {
    table: 'institutions',
    columns: ['id', 'name', 'is_demo', 'verification_status', 'academic_year_start_month'],
    statusColumn: 'status',
    verificationStatusColumn: 'verification_status',
    status: 'active',
    verificationStatuses: ['verified', 'demo'],
  },
  courses: {
    table: 'institution_courses',
    columns: ['id', 'institution_id', 'name', 'degree', 'duration_years'],
    institutionIdColumn: 'institution_id',
    statusColumn: 'status',
    status: 'active',
  },
  departments: {
    table: 'institution_departments',
    columns: ['id', 'institution_id', 'course_id', 'name'],
    institutionIdColumn: 'institution_id',
    courseIdColumn: 'course_id',
    statusColumn: 'status',
    status: 'active',
  },
} as const

export function resolveCatalogRows<T>(data: T[] | null, error: unknown): T[] {
  if (error) throw error
  return data ?? []
}

export function hasOnlyDemoInstitutions(institutions: { is_demo: boolean }[]): boolean {
  return institutions.length > 0 && institutions.every(institution => institution.is_demo)
}
