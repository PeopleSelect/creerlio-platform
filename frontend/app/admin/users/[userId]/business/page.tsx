'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
export default function AdminBusinessProfileViewPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.userId as string
  
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkAdmin() {
      try {
        const { data: sessionRes } = await supabase.auth.getSession()
        const u = sessionRes.session?.user
        if (!u?.id) {
          router.replace('/login?redirect=/admin')
          return
        }

        const { data: { user: freshUser } } = await supabase.auth.getUser()
        const userMetadata = (freshUser || u).user_metadata || {}
        const email = u.email || ''
        
        const hasAdminFlag = userMetadata.is_admin === true || userMetadata.admin === true
        const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || []
        const isAdminEmail = adminEmails.includes(email.toLowerCase())
        
        if (hasAdminFlag || isAdminEmail) {
          setIsAdmin(true)
          loadBusinessProfile()
        } else {
          alert('Access denied. Admin privileges required.')
          router.replace('/')
        }
      } catch (error) {
        console.error('Error checking admin:', error)
        router.replace('/')
      } finally {
        setIsLoading(false)
      }
    }
    checkAdmin()
  }, [router, userId])

  async function loadBusinessProfile() {
    try {
      const { data: businessData, error: businessError } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (businessError) {
        setError(businessError.message)
        return
      }

      if (!businessData) {
        setError('Business profile not found')
        return
      }

      const businessId = businessData.id
      router.replace(`/dashboard/business/view?id=${encodeURIComponent(String(businessId))}&from=admin&admin_user_id=${encodeURIComponent(userId)}`)
    } catch (err: any) {
      setError(err.message || 'Failed to load business profile')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <header className="sticky top-0 z-40 backdrop-blur bg-slate-950/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <Link href={`/admin/users/${userId}`} className="text-slate-300 hover:text-blue-400">
            ← Back to User Details
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Admin View</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-10">
        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-100">
            {error}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-8">
            <h1 className="text-2xl font-bold">Opening Business Profile...</h1>
            <p className="text-slate-300 mt-2">
              Redirecting to the new business profile view.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

