'use client'

import { useEffect } from 'react'

/**
 * AccessibilityProvider
 * - If no disability selected during signup → removes ALL accessibility classes
 * - If disability selected → applies ONLY that profile's features on every page
 * - Persists across all pages automatically
 */
export default function AccessibilityProvider() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const enabled = localStorage.getItem('accessibilityEnabled') === 'true'

    if (!enabled) {
      // No disability selected — remove ALL accessibility features
      document.body.classList.remove('large-text', 'high-contrast', 'simple-mode', 'large-buttons')
      // Don't touch dark mode — that's a user preference, not accessibility
      return
    }

    // Apply ONLY the saved profile settings
    const largeText    = localStorage.getItem('largeText')    === 'true'
    const highContrast = localStorage.getItem('highContrast') === 'true'
    const voiceMode    = localStorage.getItem('voiceMode')    === 'true'
    const simpleMode   = localStorage.getItem('simpleMode')   === 'true'
    const largeButtons = localStorage.getItem('largeButtons') === 'true'

    document.body.classList.toggle('large-text',    largeText)
    document.body.classList.toggle('high-contrast', highContrast)
    document.body.classList.toggle('simple-mode',   simpleMode)
    document.body.classList.toggle('large-buttons', largeButtons)

    if (highContrast) {
      document.documentElement.classList.add('dark')
    }

    // Voice announcement on page load
    if (voiceMode && 'speechSynthesis' in window) {
      const profile = localStorage.getItem('accessibilityProfile')
      const profileNames: Record<string, string> = {
        visualImpairment:    'Visual accessibility mode is active.',
        hearingImpairment:   'Hearing accessibility mode is active.',
        motorDisability:     'Motor accessibility mode is active.',
        cognitiveDisability: 'Cognitive accessibility mode is active.',
      }
      const msg = profile ? profileNames[profile] : null
      if (msg) {
        setTimeout(() => {
          window.speechSynthesis.cancel()
          const u = new SpeechSynthesisUtterance(msg)
          u.rate = 0.85
          window.speechSynthesis.speak(u)
        }, 800)
      }
    }
  }, [])

  return null
}
