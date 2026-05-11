'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Home, 
  Shield, 
  TrendingUp, 
  FileText, 
  MessageSquare, 
  Settings, 
  Users, 
  BarChart3,
  Leaf,
  Bell,
  CreditCard,
  Menu,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Transactions', href: '/transactions', icon: CreditCard },
  { name: 'Fraud Detection', href: '/fraud', icon: Shield },
  { name: 'Market Analytics', href: '/market', icon: TrendingUp },
  { name: 'Compliance', href: '/compliance', icon: FileText },
  { name: 'AI Assistant', href: '/assistant', icon: MessageSquare },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Green Finance', href: '/green', icon: Leaf },
  { name: 'Help & Support', href: '/help', icon: Bell },
  { name: 'Settings', href: '/settings', icon: Settings },
]

interface SidebarProps {
  isMobileOpen?: boolean
  onMobileClose?: () => void
}

export default function Sidebar({ isMobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Prefetch all pages for instant navigation
  useEffect(() => {
    navigation.forEach(item => {
      router.prefetch(item.href)
    })
  }, [router])

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // On mobile, just close the sidebar — the Link component handles navigation
    if (isMobile && onMobileClose) {
      onMobileClose()
    }
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden animate-fade-in"
          onClick={onMobileClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "sidebar-premium shadow-2xl transition-all duration-200 z-50",
        isMobile ? (
          cn(
            "fixed inset-y-0 left-0 transform md:relative md:translate-x-0",
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          )
        ) : (
          collapsed ? "w-16" : "w-64"
        ),
        isMobile ? "w-64" : ""
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/5">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-900/50">
              <Shield className="w-5 h-5 text-white" />
            </div>
            {(!collapsed || isMobile) && (
              <div>
                <span className="text-lg font-bold text-white tracking-tight">
                  TRUSTLEDGER
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                  <span className="text-xs text-teal-400 font-medium">Live</span>
                </div>
              </div>
            )}
          </div>
          {isMobile && (
            <button
              onClick={onMobileClose}
              className="p-2 rounded-lg text-white hover:bg-teal-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="mt-8">
          <div className="px-4 space-y-2">
            {navigation.map((item, index) => {
              const isActive = pathname === item.href
              // Pastel accent colors per section
              const activeColors: Record<string, string> = {
                '/dashboard':    'from-teal-400/90 to-cyan-400/90',
                '/transactions': 'from-blue-400/90 to-sky-400/90',
                '/fraud':        'from-pink-400/90 to-rose-400/90',
                '/market':       'from-violet-400/90 to-purple-400/90',
                '/compliance':   'from-orange-400/90 to-amber-400/90',
                '/assistant':    'from-indigo-400/90 to-blue-400/90',
                '/reports':      'from-emerald-400/90 to-green-400/90',
                '/green':        'from-lime-400/90 to-green-400/90',
                '/help':         'from-sky-400/90 to-cyan-400/90',
                '/settings':     'from-slate-400/90 to-gray-400/90',
              }
              const activeColor = activeColors[item.href] || 'from-teal-400/90 to-cyan-400/90'

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={true}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className={cn(
                    "flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-150",
                    isActive
                      ? `bg-gradient-to-r ${activeColor} text-white shadow-lg`
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <item.icon className={cn("flex-shrink-0", (collapsed && !isMobile) ? "w-5 h-5" : "w-5 h-5 mr-3")} />
                  {(!collapsed || isMobile) && (
                    <span className="truncate">{item.name}</span>
                  )}
                  {isActive && (!collapsed || isMobile) && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-90" />
                  )}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Collapse Toggle - Desktop Only */}
        {!isMobile && (
          <div className="absolute bottom-4 left-4">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 rounded-lg bg-teal-800 hover:bg-teal-700 transition-colors hover:scale-110"
            >
              <BarChart3 className="w-4 h-4 text-white" />
            </button>
          </div>
        )}
      </div>
    </>
  )
}