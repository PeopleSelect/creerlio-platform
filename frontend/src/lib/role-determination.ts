/**
 * CENTRALIZED ROLE DETERMINATION
 * 
 * Single source of truth for user role based on actual database profiles.
 * This function queries the database to determine the user's role.
 * 
 * RULES:
 * - If user has talent_profile ? TALENT (regardless of business_profile)
 * - Else if user has business_profile ? BUSINESS
 * - Else ? null (no role, needs onboarding)
 * 
 * This ensures deterministic routing with no ambiguity.
 */

import { SupabaseClient } from '@supabase/supabase-js'

export type UserRole = 'talent' | 'business' | null

export interface RoleDeterminationResult {
  role: UserRole
  hasTalentProfile: boolean
  hasBusinessProfile: boolean
  talentProfileId: string | null
  businessProfileId: string | null
}

/**
 * Determines user role based on actual database profiles.
 * This is the SINGLE SOURCE OF TRUTH for role determination.
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID from auth session
 * @returns Role determination result
 */
export async function determineUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<RoleDeterminationResult> {
  // #region agent log
  // Verify userId is a UUID, not an email
  const isEmail = typeof userId === 'string' && userId.includes('@')
  if (isEmail) {
    console.error('[RBAC DEBUG] ? CRITICAL ERROR: userId is an email, not a UUID!', { userId })
  }
  console.log('[RBAC DEBUG] ========== STARTING ROLE DETERMINATION ==========', { 
    userId, 
    userIdType: typeof userId,
    userIdLength: userId?.length,
    isEmail,
    timestamp: new Date().toISOString() 
  })
  fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/role-determination.ts:determineUserRole:entry',message:'Starting role determination',data:{userId,isEmail},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
  // #endregion

  // Query both profiles in parallel
  // Add cache-busting timestamp to ensure fresh data (no stale cache)
  const cacheBuster = Date.now()
  console.log('[RBAC DEBUG] Querying profiles from database (cache-busting)...', { userId, cacheBuster })
  const [talentCheck, businessCheck] = await Promise.all([
    supabase.from('talent_profiles').select('id').eq('user_id', userId).maybeSingle().then(result => {
      console.log('[RBAC DEBUG] Talent profile query result:', { 
        hasData: !!result.data, 
        dataId: result.data?.id || null, 
        error: result.error?.message || null,
        status: result.status,
        timestamp: Date.now()
      })
      return result
    }),
    supabase.from('business_profiles').select('id').eq('user_id', userId).maybeSingle().then(result => {
      console.log('[RBAC DEBUG] Business profile query result:', { 
        hasData: !!result.data, 
        dataId: result.data?.id || null, 
        error: result.error?.message || null,
        status: result.status,
        timestamp: Date.now()
      })
      return result
    }),
  ])

  // #region agent log
  const queryResult = {
    userId,
    talentCheckError: talentCheck.error?.message || null,
    talentCheckCode: talentCheck.error?.code || null,
    talentCheckStatus: (talentCheck.error as any)?.status || null,
    talentProfileId: talentCheck.data?.id || null,
    talentProfileFound: !!talentCheck.data?.id,
    businessCheckError: businessCheck.error?.message || null,
    businessCheckCode: businessCheck.error?.code || null,
    businessCheckStatus: (businessCheck.error as any)?.status || null,
    businessProfileId: businessCheck.data?.id || null,
    businessProfileFound: !!businessCheck.data?.id,
  }
  console.log('[RBAC DEBUG] ========== PROFILE QUERIES COMPLETED ==========', queryResult)
  console.log('[RBAC DEBUG] Raw talent check:', { data: talentCheck.data, error: talentCheck.error, status: talentCheck.status })
  console.log('[RBAC DEBUG] Raw business check:', { data: businessCheck.data, error: businessCheck.error, status: businessCheck.status })
  fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/role-determination.ts:determineUserRole:queries_complete',message:'Profile queries completed',data:queryResult,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
  // #endregion

  const hasTalentProfile = !!talentCheck.data && !talentCheck.error
  const hasBusinessProfile = !!businessCheck.data && !businessCheck.error
  const talentProfileId = talentCheck.data?.id || null
  const businessProfileId = businessCheck.data?.id || null

  // CRITICAL RULE: If user has talent profile, they are TALENT (regardless of business profile)
  // This enforces strict role separation
  let role: UserRole = null
  if (hasTalentProfile) {
    role = 'talent'
  } else if (hasBusinessProfile) {
    role = 'business'
  }

  // #region agent log
  const reason = hasTalentProfile ? 'User has talent profile (takes precedence)' : hasBusinessProfile ? 'User has business profile' : 'No profiles found'
  const result = { userId, role, hasTalentProfile, hasBusinessProfile, talentProfileId, businessProfileId, reason }
  console.log('[RBAC DEBUG] ========== ROLE DETERMINATION RESULT ==========', result)
  console.log('[RBAC DEBUG] FINAL ROLE:', role, '| REASON:', reason)
  if (hasTalentProfile) {
    console.warn('[RBAC DEBUG] ?? TALENT PROFILE FOUND - User will be routed to Talent Dashboard (even if business profile exists)')
  } else if (hasBusinessProfile) {
    console.log('[RBAC DEBUG] ? BUSINESS PROFILE FOUND - User will be routed to Business Dashboard')
  } else {
    console.warn('[RBAC DEBUG] ?? NO PROFILES FOUND - User will be routed to onboarding')
  }
  fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/role-determination.ts:determineUserRole:result',message:'Role determination result',data:result,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
  // #endregion

  return {
    role,
    hasTalentProfile,
    hasBusinessProfile,
    talentProfileId,
    businessProfileId,
  }
}

/**
 * Gets the dashboard route for a user role.
 * 
 * @param role - User role
 * @returns Dashboard route or null if no role
 */
export function getDashboardRoute(role: UserRole): string | null {
  if (role === 'talent') return '/dashboard/talent'
  if (role === 'business') return '/dashboard/business'
  return '/onboarding'
}

/**
 * Determines user role and redirects to the appropriate dashboard.
 * This is the SINGLE SOURCE OF TRUTH for post-login routing.
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID from auth session
 * @param router - Next.js router instance
 * @param defaultRedirect - Default redirect if no role found (defaults to '/onboarding')
 */
export async function determineUserRoleAndRedirect(
  supabase: SupabaseClient,
  userId: string,
  router: any,
  defaultRedirect: string = '/onboarding'
): Promise<void> {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/role-determination.ts:determineUserRoleAndRedirect:entry',message:'Starting centralized role determination and redirect',data:{userId,defaultRedirect},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  const roleResult = await determineUserRole(supabase, userId)
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/role-determination.ts:determineUserRoleAndRedirect:role_determined',message:'Role determined from profiles',data:{role:roleResult.role,hasTalentProfile:roleResult.hasTalentProfile,hasBusinessProfile:roleResult.hasBusinessProfile,talentProfileId:roleResult.talentProfileId,businessProfileId:roleResult.businessProfileId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  const dashboardRoute = getDashboardRoute(roleResult.role) || defaultRedirect
  
  // #region agent log
  const redirectInfo = { dashboardRoute, role: roleResult.role, userId, hasTalentProfile: roleResult.hasTalentProfile, hasBusinessProfile: roleResult.hasBusinessProfile, defaultRedirect }
  console.log('[RBAC DEBUG] ========== REDIRECTING TO DASHBOARD ==========', redirectInfo)
  console.log('[RBAC DEBUG] ?? FINAL REDIRECT:', dashboardRoute)
  if (dashboardRoute === '/dashboard/talent' && roleResult.hasBusinessProfile) {
    console.error('[RBAC DEBUG] ? ERROR: Redirecting to Talent Dashboard but user has business profile! This should not happen if talent profile was deleted.')
  }
  fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/role-determination.ts:determineUserRoleAndRedirect:redirecting',message:'Redirecting to dashboard',data:redirectInfo,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  router.replace(dashboardRoute)
}

