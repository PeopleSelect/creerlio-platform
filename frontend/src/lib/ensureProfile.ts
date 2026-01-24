/**
 * PROFILE INTEGRITY ENFORCEMENT
 * 
 * This module ensures profiles always exist. If a profile is missing,
 * it is automatically created. This eliminates "No profile found" errors.
 */

import { supabase } from '@/lib/supabase'

/**
 * Ensures a business profile exists for the current user.
 * Creates it if missing. Returns the profile.
 */
export async function ensureBusinessProfile(userId: string): Promise<any> {
  // Try to fetch existing profile
  const { data: existing, error: fetchError } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchError && !fetchError.message?.includes('column') && !fetchError.message?.includes('schema')) {
    throw new Error(`Failed to fetch business profile: ${fetchError.message}`)
  }

  // If profile exists, return it
  if (existing) {
    return existing
  }

  // Profile missing - create it
  const { data: created, error: createError } = await supabase
    .from('business_profiles')
    .insert({ user_id: userId })
    .select()
    .single()

  if (createError) {
    // If duplicate key error, profile was created by trigger - refetch
    if (createError.code === '23505' || createError.message?.includes('duplicate')) {
      const { data: refetched } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (refetched) return refetched
    }
    throw new Error(`Failed to create business profile: ${createError.message}`)
  }

  return created
}

/**
 * Ensures a talent profile exists for the current user.
 * Creates it if missing. Returns the profile.
 */
export async function ensureTalentProfile(userId: string): Promise<any> {
  // Try to fetch existing profile
  const { data: existing, error: fetchError } = await supabase
    .from('talent_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchError && !fetchError.message?.includes('column') && !fetchError.message?.includes('schema')) {
    throw new Error(`Failed to fetch talent profile: ${fetchError.message}`)
  }

  // If profile exists, return it
  if (existing) {
    return existing
  }

  // Profile missing - create it
  const { data: created, error: createError } = await supabase
    .from('talent_profiles')
    .insert({ user_id: userId })
    .select()
    .single()

  if (createError) {
    // If duplicate key error, profile was created by trigger - refetch
    if (createError.code === '23505' || createError.message?.includes('duplicate')) {
      const { data: refetched } = await supabase
        .from('talent_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (refetched) return refetched
    }
    throw new Error(`Failed to create talent profile: ${createError.message}`)
  }

  return created
}
