import { supabase } from '@/lib/supabase'

export type BusinessProductTalentHook = {
  business_id: string
  product_id: number
  product_name: string
  lifecycle_stage: string | null
  primary_industries: string[] | null
  role_name: string | null
  skill_name: string | null
  team_name: string | null
  growth_area: string | null
}

export async function fetchBusinessProductTalentHooks(businessId: string) {
  if (!businessId) return []
  const { data, error } = await supabase
    .from('business_product_talent_hooks')
    .select(
      'business_id, product_id, product_name, lifecycle_stage, primary_industries, role_name, skill_name, team_name, growth_area'
    )
    .eq('business_id', businessId)

  if (error) {
    console.error('[TalentHooks] Failed to load business_product_talent_hooks', error)
    return []
  }
  return (data || []) as BusinessProductTalentHook[]
}
