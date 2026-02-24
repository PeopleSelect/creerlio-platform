'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function BusinessConnectionsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/talent?tab=connections&mode=business')
  }, [router])

  return null
}
