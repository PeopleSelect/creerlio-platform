import fs from 'node:fs/promises'
import path from 'node:path'

export type NSWSchool = {
  code: string
  name: string
  suburb?: string
  postcode?: string
  address?: string
  level?: string
  lat: number
  lng: number
}

let cache: NSWSchool[] | null = null

function dataPath() {
  // In Next.js runtime, process.cwd() should be the `frontend/` folder.
  // This keeps the dataset deployable alongside the app bundle.
  return process.env.NSW_SCHOOLS_DATA_PATH || path.join(process.cwd(), 'data', 'nsw_schools.min.json')
}

export async function loadNSWSchools(): Promise<NSWSchool[]> {
  if (cache) return cache
  const raw = await fs.readFile(dataPath(), 'utf8')
  const parsed = JSON.parse(raw)
  const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.schools) ? parsed.schools : []

  cache = rows
    .map((r: any) => ({
      code: String(r.code ?? r.school_code ?? r.School_code ?? ''),
      name: String(r.name ?? r.school_name ?? r.School_name ?? ''),
      suburb: (r.suburb ?? r.town_suburb ?? r.Town_suburb) ? String(r.suburb ?? r.town_suburb ?? r.Town_suburb) : undefined,
      postcode: (r.postcode ?? r.Postcode) ? String(r.postcode ?? r.Postcode) : undefined,
      address: (r.address ?? r.street ?? r.Street) ? String(r.address ?? r.street ?? r.Street) : undefined,
      level: (r.level ?? r.Level_of_schooling) ? String(r.level ?? r.Level_of_schooling) : undefined,
      lat: typeof r.lat === 'number' ? r.lat : typeof r.latitude === 'number' ? r.latitude : Number(r.Latitude),
      lng: typeof r.lng === 'number' ? r.lng : typeof r.longitude === 'number' ? r.longitude : Number(r.Longitude),
    }))
    .filter((s: NSWSchool) => s.code && s.name && Number.isFinite(s.lat) && Number.isFinite(s.lng))

  return cache ?? []
}

export function normalizeQuery(q: string) {
  return q
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}


