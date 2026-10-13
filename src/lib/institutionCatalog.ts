import { supabase } from './supabase'
import { CATALOG_QUERY_CONTRACT, resolveCatalogRows } from './catalogContract'
export { CATALOG_QUERY_CONTRACT, hasOnlyDemoInstitutions, resolveCatalogRows } from './catalogContract'

export type Institution = { id: string; name: string; is_demo: boolean; verification_status: 'unverified' | 'verified' | 'demo'; academic_year_start_month: number }
export type InstitutionCourse = { id: string; institution_id: string; name: string; degree: string | null; duration_years: number }
export type InstitutionDepartment = { id: string; institution_id: string; course_id: string; name: string }

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export async function getActiveInstitutions(): Promise<Institution[]> {
  const contract = CATALOG_QUERY_CONTRACT.institutions
  const { data, error } = await client().from(contract.table)
    .select(contract.columns.join(','))
    .eq(contract.statusColumn, contract.status)
    .in(contract.verificationStatusColumn, [...contract.verificationStatuses])
    .order('name')
  return resolveCatalogRows(data as Institution[] | null, error)
}

export async function getCoursesByInstitution(institutionId: string): Promise<InstitutionCourse[]> {
  const contract = CATALOG_QUERY_CONTRACT.courses
  const { data, error } = await client().from(contract.table)
    .select(contract.columns.join(','))
    .eq(contract.institutionIdColumn, institutionId)
    .eq(contract.statusColumn, contract.status)
    .order('name')
  return resolveCatalogRows(data as InstitutionCourse[] | null, error)
}

export async function getDepartmentsByInstitution(institutionId: string, courseId: string): Promise<InstitutionDepartment[]> {
  const contract = CATALOG_QUERY_CONTRACT.departments
  const { data, error } = await client().from(contract.table)
    .select(contract.columns.join(','))
    .eq(contract.institutionIdColumn, institutionId)
    .eq(contract.courseIdColumn, courseId)
    .eq(contract.statusColumn, contract.status)
    .order('name')
  return resolveCatalogRows(data as InstitutionDepartment[] | null, error)
}

export { getPermittedStudyYears as getAcademicYears } from './registrationRules'
