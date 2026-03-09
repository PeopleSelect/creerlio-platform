export function normalizeUsername(input: string): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-') // replace invalid chars with hyphen
    .replace(/-+/g, '-') // collapse
    .replace(/^-|-$/g, '') // trim hyphens
}

export function isReservedUsername(u: string): boolean {
  const reserved = new Set([
    'api',
    'admin',
    'dashboard',
    'login',
    'logout',
    'portfolio',
    'resume',
    'search',
    'talent',
    'business',
    'jobs',
    'terms',
    '_next',
    'share',
    'about',
    'analytics',
    'verify',
    'peopleselect',
    'test-register',
    'test-storage',
    'talent-map',
    'business-map',
    'business-map-embedded',
  ])
  return reserved.has(u)
}

export function validateUsername(input: string): { ok: boolean; value: string; error?: string } {
  const value = normalizeUsername(input)
  if (!value) return { ok: false, value, error: 'Username is required.' }
  if (value.length < 3) return { ok: false, value, error: 'Username must be at least 3 characters.' }
  if (value.length > 40) return { ok: false, value, error: 'Username must be 40 characters or less.' }
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(value)) {
    return { ok: false, value, error: 'Use letters, numbers, and hyphens only.' }
  }
  if (isReservedUsername(value)) return { ok: false, value, error: 'That username is reserved.' }
  return { ok: true, value }
}

