'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const publicRoutes = ['/', '/login', '/signup']
    if (publicRoutes.includes(pathname)) return

    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
    if (!isLoggedIn) {
      router.replace('/login')
    }
  }, [pathname, router])

  // Render immediately — no blank flash while checking auth
  return <>{children}</>
}
