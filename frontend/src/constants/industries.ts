// Layer 1 taxonomy industries — must stay in sync with supabase industries table
export const INDUSTRY_OPTIONS = [
  'Accounting & Finance',
  'Legal',
  'Technology & Software',
  'Engineering',
  'Construction & Infrastructure',
  'Real Estate & Property',
  'Healthcare & Medical',
  'Education & Training',
  'Government & Public Sector',
  'Marketing & Advertising',
  'Media & Entertainment',
  'Creative & Design',
  'Retail & E-Commerce',
  'Hospitality & Tourism',
  'Agriculture & Farming',
  'Mining & Resources',
  'Energy & Utilities',
  'Transport & Logistics',
  'Manufacturing & Industrial',
  'Automotive',
  'Telecommunications',
  'Human Resources & Recruitment',
  'Consulting & Professional Services',
  'Non-Profit & Social Services',
  'Sports & Fitness',
  'Beauty & Personal Care',
  'Security & Defence',
  'Environmental & Sustainability',
  'Research & Science',
] as const

export type IndustryOption = typeof INDUSTRY_OPTIONS[number]

export const INDUSTRY_SET = new Set<string>(INDUSTRY_OPTIONS)

export const isValidIndustry = (value: string | null | undefined) => {
  if (!value) return false
  return INDUSTRY_SET.has(value)
}
