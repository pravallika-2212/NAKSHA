export type ImportCategory = 'academic' | 'attendance' | 'lms_activity' | 'engagement' | 'skills' | 'placement' | 'feedback'
export type CsvRow = Record<string, string>
export type ImportField = { name: string; required: boolean }
export const importFields: Record<ImportCategory, ImportField[]> = {
  academic: ['roll_number','admission_year','academic_year','term_code','term_name','term_start','term_end','subject_name','subject_code','marks_obtained','max_marks','grade','gpa','cgpa','recorded_on'].map((name, i) => ({ name, required: [0,1,2,3,4,5,6,7,9,10,14].includes(i) })),
  attendance: ['roll_number','admission_year','period_start','period_end','classes_attended','classes_held','source_name'].map(name => ({ name, required: ['roll_number','admission_year','period_start','period_end','classes_attended','classes_held'].includes(name) })),
  lms_activity: ['roll_number','admission_year','course_label','period_start','period_end','sessions_count','minutes_active','assignments_completed','assignments_total','source_name'].map(name => ({ name, required: ['roll_number','admission_year','course_label','period_start','period_end'].includes(name) })),
  engagement: ['roll_number','admission_year','metric_name','metric_value','unit','source_name','period_start','period_end'].map(name => ({ name, required: !['source_name'].includes(name) })),
  skills: ['roll_number','admission_year','skill_name','skill_category','proficiency','assessed_at','assessment_name','assessment_score','assessment_max_score'].map(name => ({ name, required: ['roll_number','admission_year','skill_name','proficiency','assessed_at'].includes(name) })),
  placement: ['roll_number','admission_year','source_reference','record_type','status','event_date','score','detail'].map(name => ({ name, required: ['roll_number','admission_year','source_reference','record_type','status','event_date'].includes(name) })),
  feedback: ['roll_number','admission_year','feedback_type','author_role','feedback_text','rating','submitted_at','source_name'].map(name => ({ name, required: ['roll_number','admission_year','feedback_type','author_role','feedback_text','submitted_at'].includes(name) })),
}
export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const input = text.replace(/^\uFEFF/, '')
  const grid: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false
  for (let i = 0; i < input.length; i++) {
    const c = input[i]
    if (quoted) { if (c === '"' && input[i + 1] === '"') { cell += '"'; i++ } else if (c === '"') quoted = false; else cell += c }
    else if (c === '"') { if (cell) throw new Error('A quote must begin at the start of a CSV field.'); quoted = true }
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && input[i + 1] === '\n') i++; row.push(cell); grid.push(row); row = []; cell = '' }
    else cell += c
  }
  if (quoted) throw new Error('This CSV has an unclosed quoted field.')
  if (cell || row.length) { row.push(cell); grid.push(row) }
  while (grid.length && grid[grid.length - 1].every(value => !value.trim())) grid.pop()
  if (!grid.length) throw new Error('The CSV file is empty.')
  const headers = grid.shift()!.map(value => value.trim())
  if (headers.some(value => !value) || new Set(headers.map(value => value.toLowerCase())).size !== headers.length) throw new Error('Column names must be non-empty and unique.')
  if (grid.length > 500) throw new Error('Import up to 500 data rows at a time.')
  const rows = grid.map((cells, index) => {
    if (cells.length !== headers.length) throw new Error(`Row ${index + 2} has ${cells.length} values; expected ${headers.length}.`)
    return Object.fromEntries(headers.map((header, i) => [header, cells[i].trim()]))
  })
  if (!rows.length) throw new Error('Add at least one data row below the headers.')
  return { headers, rows }
}
const dateLike = /^(\d{4}-\d{2}-\d{2})/
export function validateImportRow(category: ImportCategory, row: CsvRow): string[] {
  const issues: string[] = []
  for (const field of importFields[category]) if (field.required && !row[field.name]?.trim()) issues.push(`${field.name} is required`)
  if (row.roll_number?.trim() && row.roll_number.trim().length > 100) issues.push('roll_number must be 100 characters or fewer')
  if (row.admission_year?.trim() && (!/^\d{4}$/.test(row.admission_year.trim()) || Number(row.admission_year) < 1950 || Number(row.admission_year) > new Date().getFullYear())) issues.push('admission_year must be a valid year no later than the current year')
  for (const key of ['period_start','period_end','term_start','term_end','recorded_on','assessed_at','event_date']) {
    if (row[key] && (!dateLike.test(row[key]) || Number.isNaN(Date.parse(row[key])))) issues.push(`${key} must use YYYY-MM-DD`)
  }
  for (const key of ['marks_obtained','max_marks','gpa','cgpa','classes_attended','classes_held','sessions_count','minutes_active','assignments_completed','assignments_total','metric_value','proficiency','score','rating','assessment_score','assessment_max_score']) {
    if (row[key]?.trim() && !Number.isFinite(Number(row[key]))) issues.push(`${key} must be a number`)
  }
  const bounded: Record<string, [number, number]> = { gpa:[0,10], cgpa:[0,10], proficiency:[0,100], score:[0,100], rating:[1,5] }
  for (const [key,[min,max]] of Object.entries(bounded)) if (row[key]?.trim() && (Number(row[key]) < min || Number(row[key]) > max)) issues.push(`${key} must be between ${min} and ${max}`)
  for (const key of ['marks_obtained','max_marks','classes_attended','classes_held','sessions_count','minutes_active','assignments_completed','assignments_total','assessment_score','assessment_max_score']) if (row[key]?.trim() && Number(row[key]) < 0) issues.push(`${key} must be zero or greater`)
  for (const key of ['max_marks','classes_held','assessment_max_score']) if (row[key]?.trim() && Number(row[key]) <= 0) issues.push(`${key} must be greater than zero`)
  for (const [a,b] of [['term_start','term_end'],['period_start','period_end']]) if (row[a] && row[b] && row[a] > row[b]) issues.push(`${b} must not be before ${a}`)
  if (row.marks_obtained && row.max_marks && Number(row.marks_obtained) > Number(row.max_marks)) issues.push('marks_obtained cannot exceed max_marks')
  if (row.assessment_score && row.assessment_max_score && Number(row.assessment_score) > Number(row.assessment_max_score)) issues.push('assessment_score cannot exceed assessment_max_score')
  if (category==='skills'&&([row.assessment_name,row.assessment_score,row.assessment_max_score].some(Boolean))&&![row.assessment_name,row.assessment_score,row.assessment_max_score].every(Boolean)) issues.push('assessment_name, assessment_score, and assessment_max_score must be supplied together')
  if (row.classes_attended && row.classes_held && Number(row.classes_attended) > Number(row.classes_held)) issues.push('classes_attended cannot exceed classes_held')
  if (row.assignments_completed && row.assignments_total && Number(row.assignments_completed) > Number(row.assignments_total)) issues.push('assignments_completed cannot exceed assignments_total')
  if (category==='placement' && row.record_type && !['eligibility','assessment','interview','offer','outcome'].includes(row.record_type)) issues.push('record_type must be eligibility, assessment, interview, offer, or outcome')
  if (category==='feedback' && row.feedback_type && !['student','mentor','instructor','other'].includes(row.feedback_type)) issues.push('feedback_type must be student, mentor, instructor, or other')
  if (category==='feedback' && row.author_role && !['student','faculty','placement_officer','admin','imported'].includes(row.author_role)) issues.push('author_role is not supported')
  return issues
}
