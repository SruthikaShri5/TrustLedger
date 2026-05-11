'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

/**
 * Shows a thin progress bar at the top during navigation
 * Makes navigation feel instant even when Next.js is compiling
 */
export default function PageTransition() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // When pathname changes, navigation completed — hide bar
    setLoading(false)
    setProgress(100)
    const t = setTimeout(() => setProgress(0), 300)
    return () => clearTimeout(t)
  }, [pathname])

  // Intercept link clicks to show progress bar immediately
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a')
      if (!target) return
      const href = target.getAttribute('href')
      if (!href || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('#')) return
      if (href === pathname) return
      setLoading(true)
      setProgress(30)
      // Animate progress
      const t1 = setTimeout(() => setProgress(60), 100)
      const t2 = setTimeout(() => setProgress(80), 300)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [pathname])

  if (!loading && progress === 0) return null

  return (
    <div
      className="fixed top-0 left-0 z-[9999] h-0.5 bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 transition-all duration-200 ease-out"
      style={{ width: `${progress}%`, opacity: progress === 100 ? 0 : 1 }}
    />
  )
}
