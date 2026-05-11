import './globals.css'
import type { Metadata } from 'next'
import AccessibilityProvider from '@/components/AccessibilityProvider'
import PageTransition from '@/components/PageTransition'

export const metadata: Metadata = {
  title: 'TRUSTLEDGER - Real-Time Financial Intelligence',
  description: 'AI-Powered Financial Security & Banking Platform',
  keywords: 'financial security, fraud detection, banking, AI, real-time',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="http://localhost:8000" />
        <link rel="dns-prefetch" href="http://localhost:8000" />
      </head>
      <body className="page-bg antialiased" suppressHydrationWarning>
        <PageTransition />
        <AccessibilityProvider />
        {children}
      </body>
    </html>
  )
}
