'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Shield, Eye, EyeOff, Users, CheckCircle,
  Volume2, Type, Contrast, Smartphone, Ear
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authAPI } from '@/lib/api'

// ─── Accessibility profile definitions ──────────────────────
const ACCESSIBILITY_PROFILES = {
  visualImpairment: {
    label: 'Visual Impairment',
    icon: Eye,
    color: 'blue',
    description: 'Blindness, low vision, or colour blindness',
    features: ['Large Text', 'High Contrast', 'Voice Navigation', 'Screen Reader'],
    activates: {
      largeText: true,
      highContrast: true,
      voiceMode: true,
      simpleMode: false,
      largeButtons: false,
      visualAlerts: false,
    },
  },
  hearingImpairment: {
    label: 'Hearing Impairment',
    icon: Ear,
    color: 'purple',
    description: 'Deafness or hard of hearing',
    features: ['Visual Alerts', 'Text Notifications', 'No Audio Dependency'],
    activates: {
      largeText: false,
      highContrast: false,
      voiceMode: false,
      simpleMode: false,
      largeButtons: false,
      visualAlerts: true,
    },
  },
  motorDisability: {
    label: 'Motor Disability',
    icon: Smartphone,
    color: 'green',
    description: 'Limited hand or arm movement',
    features: ['Large Buttons', 'Voice Input', 'Keyboard Navigation'],
    activates: {
      largeText: false,
      highContrast: false,
      voiceMode: true,
      simpleMode: false,
      largeButtons: true,
      visualAlerts: false,
    },
  },
  cognitiveDisability: {
    label: 'Cognitive Disability',
    icon: Type,
    color: 'orange',
    description: 'Dyslexia, ADHD, or learning differences',
    features: ['Simple Mode', 'Easy Language', 'Larger Text', 'Reduced Clutter'],
    activates: {
      largeText: true,
      highContrast: false,
      voiceMode: false,
      simpleMode: true,
      largeButtons: true,
      visualAlerts: false,
    },
  },
}

type ProfileKey = keyof typeof ACCESSIBILITY_PROFILES

export default function SignUp() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    guardianName: '',
    guardianContact: '',
  })
  const [needsAccessibility, setNeedsAccessibility] = useState<boolean | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<ProfileKey | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: '', color: 'gray' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // ── helpers ──────────────────────────────────────────────
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.rate = 0.85
      window.speechSynthesis.speak(u)
    }
  }

  const checkPasswordStrength = (password: string) => {
    let score = 0
    const missing: string[] = []
    if (password.length >= 8) score++; else missing.push('8+ chars')
    if (/[A-Z]/.test(password)) score++; else missing.push('uppercase')
    if (/[a-z]/.test(password)) score++; else missing.push('lowercase')
    if (/\d/.test(password)) score++; else missing.push('number')
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++; else missing.push('special char')
    const color = score >= 4 ? 'green' : score >= 3 ? 'blue' : score >= 2 ? 'yellow' : 'red'
    return {
      score,
      feedback: missing.length ? `Missing: ${missing.join(', ')}` : '✓ Strong password',
      color,
    }
  }

  const handleNext = () => {
    if (step === 1) {
      if (!formData.name || !formData.email || !formData.mobile) {
        setError('Please fill in all required fields.')
        return
      }
      if (formData.mobile.length !== 10) {
        setError('Enter a valid 10-digit mobile number.')
        return
      }
    }
    if (step === 2 && needsAccessibility === null) {
      setError('Please select an option.')
      return
    }
    if (step === 3 && needsAccessibility && !selectedProfile) {
      setError('Please select your accessibility need.')
      return
    }
    setError('')
    setStep(s => s + 1)
  }

  const applyAccessibilityProfile = (profile: ProfileKey) => {
    const settings = ACCESSIBILITY_PROFILES[profile].activates
    // Save ONLY the settings for this profile — nothing else
    localStorage.setItem('accessibilityProfile', profile)
    localStorage.setItem('largeText',    String(settings.largeText))
    localStorage.setItem('highContrast', String(settings.highContrast))
    localStorage.setItem('voiceMode',    String(settings.voiceMode))
    localStorage.setItem('simpleMode',   String(settings.simpleMode))
    localStorage.setItem('largeButtons', String(settings.largeButtons))
    localStorage.setItem('visualAlerts', String(settings.visualAlerts))

    // Apply to DOM immediately
    document.body.classList.toggle('large-text',    settings.largeText)
    document.body.classList.toggle('high-contrast', settings.highContrast)
    document.body.classList.toggle('simple-mode',   settings.simpleMode)
    document.body.classList.toggle('large-buttons', settings.largeButtons)
    if (settings.highContrast) document.documentElement.classList.add('dark')

    if (settings.voiceMode) {
      speak(`${ACCESSIBILITY_PROFILES[profile].label} mode activated. ${ACCESSIBILITY_PROFILES[profile].features.join(', ')} are now enabled.`)
    }
  }

  const handleSignUp = async () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (checkPasswordStrength(formData.password).score < 3) {
      setError('Password is too weak. Add uppercase, numbers and special characters.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const username = formData.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') || formData.name.toLowerCase().replace(/\s+/g, '')

      const response = await authAPI.register({
        username,
        email: formData.email,
        password: formData.password,
        full_name: formData.name,
        phone: formData.mobile,
      })

      const { access_token, user } = response.data

      localStorage.setItem('token',      access_token)
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('userName',   user.full_name || user.username)
      localStorage.setItem('userEmail',  user.email)
      localStorage.setItem('userId',     String(user.id))
      localStorage.setItem('userType',   'user')
      localStorage.setItem('isAdmin',    'false')
      localStorage.setItem('isNewUser',  'true')
      localStorage.setItem('accessibilityEnabled', needsAccessibility ? 'true' : 'false')

      // Apply ONLY the selected profile's features
      if (needsAccessibility && selectedProfile) {
        applyAccessibilityProfile(selectedProfile)
      } else {
        // No accessibility — clear all
        localStorage.setItem('largeText',    'false')
        localStorage.setItem('highContrast', 'false')
        localStorage.setItem('voiceMode',    'false')
        localStorage.setItem('simpleMode',   'false')
        localStorage.setItem('largeButtons', 'false')
        localStorage.setItem('visualAlerts', 'false')
      }

      speak('Account created successfully. Welcome to TrustLedger.')
      router.push('/dashboard')
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Registration failed. Please try again.'
      setError(msg)
      speak(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Step progress bar ────────────────────────────────────
  const totalSteps = needsAccessibility ? 5 : 4
  const progress = Math.round((step / totalSteps) * 100)

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl flex items-center justify-center shadow-xl shadow-teal-500/30 mx-auto mb-3">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="text-slate-500 text-sm mt-1">Step {step} of {totalSteps}</p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-200 rounded-full h-1.5 mb-6">
          <div
            className="bg-gradient-to-r from-teal-500 to-emerald-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6 space-y-5">

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* ── STEP 1: Basic Info ── */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-800">Personal Information</h2>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
                  <Input
                    placeholder="e.g. Rahul Sharma"
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="h-11"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address *</label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    className="h-11"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Mobile Number *</label>
                  <Input
                    type="tel"
                    placeholder="10-digit number"
                    value={formData.mobile}
                    maxLength={10}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, '')
                      if (v.length <= 10) setFormData(p => ({ ...p, mobile: v }))
                    }}
                    className={`h-11 ${formData.mobile.length === 10 ? 'border-green-500' : formData.mobile.length > 0 ? 'border-red-400' : ''}`}
                  />
                  {formData.mobile.length > 0 && (
                    <p className={`text-xs mt-1 ${formData.mobile.length === 10 ? 'text-green-600' : 'text-red-500'}`}>
                      {formData.mobile.length === 10 ? '✓ Valid' : `${formData.mobile.length}/10 digits`}
                    </p>
                  )}
                </div>

                <Button onClick={handleNext} className="w-full h-11 bg-teal-600 hover:bg-teal-700 font-semibold">
                  Continue →
                </Button>
              </div>
            )}

            {/* ── STEP 2: Accessibility Question ── */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-slate-800 mb-1">Accessibility Needs</h2>
                  <p className="text-sm text-slate-500">We'll personalise the app just for you</p>
                </div>

                <button
                  onClick={() => { setNeedsAccessibility(true); setError('') }}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    needsAccessibility === true
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-slate-200 hover:border-teal-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${needsAccessibility === true ? 'bg-teal-500' : 'bg-slate-100'}`}>
                      <Eye className={`w-5 h-5 ${needsAccessibility === true ? 'text-white' : 'text-slate-500'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">Yes, I have accessibility needs</p>
                      <p className="text-xs text-slate-500 mt-0.5">I'll select my specific need on the next screen</p>
                    </div>
                    {needsAccessibility === true && <CheckCircle className="w-5 h-5 text-teal-500 ml-auto" />}
                  </div>
                </button>

                <button
                  onClick={() => { setNeedsAccessibility(false); setSelectedProfile(null); setError('') }}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    needsAccessibility === false
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-slate-200 hover:border-teal-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${needsAccessibility === false ? 'bg-teal-500' : 'bg-slate-100'}`}>
                      <Shield className={`w-5 h-5 ${needsAccessibility === false ? 'text-white' : 'text-slate-500'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">No, use standard interface</p>
                      <p className="text-xs text-slate-500 mt-0.5">Regular app experience</p>
                    </div>
                    {needsAccessibility === false && <CheckCircle className="w-5 h-5 text-teal-500 ml-auto" />}
                  </div>
                </button>

                <div className="flex gap-3 pt-1">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-11">← Back</Button>
                  <Button
                    onClick={() => {
                      if (needsAccessibility === null) { setError('Please select an option.'); return }
                      setError('')
                      // Skip profile step if no accessibility needed
                      setStep(needsAccessibility ? 3 : 4)
                    }}
                    className="flex-1 h-11 bg-teal-600 hover:bg-teal-700 font-semibold"
                  >
                    Continue →
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Select ONE Accessibility Profile ── */}
            {step === 3 && needsAccessibility && (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-slate-800 mb-1">Select Your Need</h2>
                  <p className="text-sm text-slate-500">Choose the one that best describes you — only those features will be enabled</p>
                </div>

                <div className="space-y-3">
                  {(Object.entries(ACCESSIBILITY_PROFILES) as [ProfileKey, typeof ACCESSIBILITY_PROFILES[ProfileKey]][]).map(([key, profile]) => {
                    const Icon = profile.icon
                    const isSelected = selectedProfile === key
                    const colorMap: Record<string, string> = {
                      blue: 'border-blue-500 bg-blue-50',
                      purple: 'border-purple-500 bg-purple-50',
                      green: 'border-green-500 bg-green-50',
                      orange: 'border-orange-500 bg-orange-50',
                    }
                    const iconColorMap: Record<string, string> = {
                      blue: 'bg-blue-500',
                      purple: 'bg-purple-500',
                      green: 'bg-green-500',
                      orange: 'bg-orange-500',
                    }

                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setSelectedProfile(key)
                          setError('')
                          speak(`${profile.label} selected. Features: ${profile.features.join(', ')}`)
                        }}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                          isSelected ? colorMap[profile.color] : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? iconColorMap[profile.color] : 'bg-slate-100'}`}>
                            <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800">{profile.label}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{profile.description}</p>
                            {isSelected && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {profile.features.map(f => (
                                  <span key={f} className="text-xs px-2 py-0.5 bg-white/70 rounded-full border border-current font-medium">
                                    ✓ {f}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {isSelected && <CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />}
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div className="flex gap-3 pt-1">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-11">← Back</Button>
                  <Button
                    onClick={() => {
                      if (!selectedProfile) { setError('Please select your accessibility need.'); return }
                      setError('')
                      setStep(4)
                    }}
                    className="flex-1 h-11 bg-teal-600 hover:bg-teal-700 font-semibold"
                  >
                    Continue →
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 4: Password ── */}
            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-800">Create Password</h2>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Password *</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={e => {
                        setFormData(p => ({ ...p, password: e.target.value }))
                        setPasswordStrength(checkPasswordStrength(e.target.value))
                      }}
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formData.password && (
                    <div className="mt-2">
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            passwordStrength.color === 'green' ? 'bg-green-500' :
                            passwordStrength.color === 'blue' ? 'bg-blue-500' :
                            passwordStrength.color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                        />
                      </div>
                      <p className={`text-xs mt-1 ${
                        passwordStrength.color === 'green' ? 'text-green-600' :
                        passwordStrength.color === 'blue' ? 'text-blue-600' :
                        passwordStrength.color === 'yellow' ? 'text-yellow-600' : 'text-red-500'
                      }`}>{passwordStrength.feedback}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password *</label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Repeat your password"
                    value={formData.confirmPassword}
                    onChange={e => setFormData(p => ({ ...p, confirmPassword: e.target.value }))}
                    className={`h-11 ${
                      formData.confirmPassword
                        ? formData.password === formData.confirmPassword ? 'border-green-500' : 'border-red-400'
                        : ''
                    }`}
                  />
                  {formData.confirmPassword && (
                    <p className={`text-xs mt-1 ${formData.password === formData.confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                      {formData.password === formData.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  <Button variant="outline" onClick={() => setStep(needsAccessibility ? 3 : 2)} className="flex-1 h-11">← Back</Button>
                  <Button onClick={handleNext} className="flex-1 h-11 bg-teal-600 hover:bg-teal-700 font-semibold">
                    Continue →
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 5: Guardian (Optional) ── */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="text-center">
                  <Users className="w-12 h-12 text-teal-600 mx-auto mb-2" />
                  <h2 className="text-lg font-semibold text-slate-800">Guardian / Helper</h2>
                  <p className="text-sm text-slate-500">Optional — add a trusted person to help with your account</p>
                </div>

                {/* Show selected profile summary */}
                {needsAccessibility && selectedProfile && (
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
                    <p className="text-sm font-semibold text-teal-800 mb-1">
                      ✓ {ACCESSIBILITY_PROFILES[selectedProfile].label} features will be activated
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {ACCESSIBILITY_PROFILES[selectedProfile].features.map(f => (
                        <span key={f} className="text-xs px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full">{f}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Guardian Name</label>
                  <Input
                    placeholder="Guardian's full name"
                    value={formData.guardianName}
                    onChange={e => setFormData(p => ({ ...p, guardianName: e.target.value }))}
                    className="h-11"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Guardian Contact</label>
                  <Input
                    placeholder="Phone or email"
                    value={formData.guardianContact}
                    onChange={e => setFormData(p => ({ ...p, guardianContact: e.target.value }))}
                    className="h-11"
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <Button variant="outline" onClick={() => setStep(4)} className="flex-1 h-11">← Back</Button>
                  <Button
                    onClick={handleSignUp}
                    disabled={isSubmitting}
                    className="flex-1 h-11 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 font-semibold"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating...
                      </span>
                    ) : 'Create Account ✓'}
                  </Button>
                </div>
              </div>
            )}

            <div className="text-center pt-2">
              <p className="text-sm text-slate-500">
                Already have an account?{' '}
                <Link href="/login" className="text-teal-600 hover:underline font-semibold">Sign In</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
