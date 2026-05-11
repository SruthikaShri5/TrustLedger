'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const ROUTES = [
  '/dashboard',
  '/transactions',
  '/fraud',
  '/market',
  '/compliance',
  '/assistant',
  '/reports',
  '/green',
  '/settings',
  '/help',
  '/admin',
]

/**
 * RouteWarmer — prefetches all routes immediately on app load
 * so Next.js pre-compiles them in the background.
 * This makes subsequent navigation instant.
 */
export default function RouteWarmer() {
  const router = useRouter()

  useEffect(() => {
    // Prefetch all routes with a small stagger to avoid overwhelming the compiler
    ROUTES.forEach((route, i) => {
      setTimeout(() => {
        router.prefetch(route)
      }, i * 100) // stagger by 100ms each
    })
  }, [router])

  return null
}
