export const MAX_ID_PROOF_BYTES = 5 * 1024 * 1024
export const INSTITUTION_NAME_REQUIRED_MESSAGE = 'Please enter your institution name.'

export function normalizeInstitutionName(value: string): string {
  return value.trim()
}

export function institutionNameError(value: string): string | null {
  const name = normalizeInstitutionName(value)
  if (!name) return INSTITUTION_NAME_REQUIRED_MESSAGE
  if (name.length < 2 || name.length > 180) return 'Institution name must be between 2 and 180 characters.'
  return null
}

export function normalizeRollNumber(value: string): string {
  return value.trim()
}

export function isValidRollNumber(value: string): boolean {
  const normalized = normalizeRollNumber(value)
  return normalized.length >= 1 && normalized.length <= 100
}

export function cohortRollNumberKey(institutionId: string, admissionYear: number, rollNumber: string): string {
  return `${institutionId}|${admissionYear}|${normalizeRollNumber(rollNumber).toLocaleLowerCase('en-US')}`
}

export function getPermittedStudyYears(
  durationYears: number,
  admissionYear: number | null,
  academicYearStartMonth: number,
  today = new Date(),
): number[] {
  if (!Number.isInteger(durationYears) || durationYears < 1 || durationYears > 12) return []
  if (!Number.isInteger(academicYearStartMonth) || academicYearStartMonth < 1 || academicYearStartMonth > 12) return []
  if (admissionYear === null) return []
  const currentYear = today.getFullYear()
  if (!Number.isInteger(admissionYear) || admissionYear < 1950 || admissionYear > currentYear) return []
  const academicYearIndex = Math.max(1, currentYear - admissionYear + 1 - (today.getMonth() + 1 < academicYearStartMonth ? 1 : 0))
  const lastPermitted = Math.min(durationYears, academicYearIndex)
  return Array.from({ length: lastPermitted }, (_, index) => index + 1)
}
