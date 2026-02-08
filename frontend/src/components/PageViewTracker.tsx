'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Generate a session ID for anonymous tracking
function getSessionId(): string {
  if (typeof window === 'undefined') return ''

  let sessionId = sessionStorage.getItem('creerlio_session_id')
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    sessionStorage.setItem('creerlio_session_id', sessionId)
  }
  return sessionId
}

export function PageViewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return

    // Don't track admin pages, API routes, or static assets
    if (pathname.startsWith('/admin') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/_next') ||
        pathname.includes('.')) {
      return
    }

    const trackPageView = async () => {
      try {
        const sessionId = getSessionId()
        const referrer = document.referrer || null
        const userAgent = navigator.userAgent

        // Get auth token if available
        const token = localStorage.getItem('supabase.auth.token')
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }

        if (token) {
          try {
            const parsed = JSON.parse(token)
            if (parsed?.currentSession?.access_token) {
              headers['Authorization'] = `Bearer ${parsed.currentSession.access_token}`
            }
          } catch {}
        }

        await fetch('/api/analytics/track', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            page_path: pathname,
            session_id: sessionId,
            referrer,
            user_agent: userAgent,
          }),
        })
      } catch (error) {
        // Silently fail - analytics shouldn't break the app
        console.debug('Failed to track page view:', error)
      }
    }

    // Small delay to avoid tracking rapid navigation
    const timeoutId = setTimeout(trackPageView, 500)
    return () => clearTimeout(timeoutId)
  }, [pathname])

  return null
}
