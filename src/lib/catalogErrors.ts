export type CatalogFailureKind = 'permission' | 'schema' | 'network' | 'unknown'

type ErrorLike = {
  code?: unknown
  message?: unknown
  name?: unknown
}

export function catalogErrorDetails(error: unknown): { code?: string; message: string; name?: string } {
  const value = (error && typeof error === 'object' ? error : {}) as ErrorLike
  return {
    ...(typeof value.code === 'string' ? { code: value.code } : {}),
    message: typeof value.message === 'string' ? value.message : 'Unknown catalog request error',
    ...(typeof value.name === 'string' ? { name: value.name } : {}),
  }
}

export function classifyCatalogFailure(error: unknown): CatalogFailureKind {
  const { code, message } = catalogErrorDetails(error)
  const normalized = message.toLowerCase()
  if (code === '42501' || normalized.includes('permission denied')) return 'permission'
  if (['42703', '42P01', 'PGRST200', 'PGRST204', 'PGRST205'].includes(code ?? '')
    || normalized.includes('schema cache') || normalized.includes('does not exist')) return 'schema'
  if (normalized.includes('failed to fetch') || normalized.includes('network')
    || normalized.includes('timeout') || normalized.includes('load failed')) return 'network'
  return 'unknown'
}

export function catalogFailureMessage(error: unknown, section: 'institutions' | 'programs' | 'departments'): string {
  const item = section === 'institutions' ? 'institution list' : section === 'programs' ? 'program list' : 'department list'
  switch (classifyCatalogFailure(error)) {
    case 'permission':
      return `Supabase was reached, but catalog read access is not configured for the ${item}. Ask the project administrator to check the catalog SELECT grants and RLS policies.`
    case 'schema':
      return `The catalog schema in this Supabase project does not match the app. Review and apply the required catalog migrations, then refresh the schema cache if they were just applied.`
    case 'network':
      return `Supabase could not be reached while loading the ${item}. Check the project URL and public key in .env.local, then restart the Vite server.`
    default:
      return `We could not load the ${item}. Retry the request; if it continues, ask the project administrator to check the Supabase catalog.`
  }
}
