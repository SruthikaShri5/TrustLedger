'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Shield, Eye, EyeOff, Volume2, Type, Contrast } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authAPI } from '@/lib/api'

export default function Login() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [largeText, setLargeText] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [voiceMode, setVoiceMode] = useState(false)
  const [loading, setLoading] = useState(false)

  const speak = (text: string) => {
    if ('speechSynthesis' in window && voiceMode) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.8
      speechSynthesis.speak(utterance)
    }
  }

  const handleLogin = async () => {
    if (!username || !password) {
      speak('Please enter username and password')
      alert('Please enter both username and password')
      return
    }

    setLoading(true)

    try {
      const response = await authAPI.login(username, password)
      const { access_token, user } = response.data

      localStorage.setItem('token', access_token)
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('userName', user.full_name || user.username)
      localStorage.setItem('userEmail', user.email)
      localStorage.setItem('userId', String(user.id))
      localStorage.setItem('userType', user.is_admin ? 'admin' : 'user')
      localStorage.setItem('isAdmin', String(user.is_admin))

      speak('Login successful')
      if (user.is_admin) {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
    } catch (error: any) {
      setLoading(false)
      const msg = error.response?.data?.detail || 'Invalid credentials'
      speak('Login failed')
      alert(msg)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      highContrast ? 'bg-black' : 'bg-gradient-to-br from-teal-50 to-emerald-100'
    } ${largeText ? 'large-text' : ''}`}>

      {/* Accessibility Controls */}
      <div className="fixed top-4 right-4 flex flex-col space-y-2 z-10">
        <Button
          size="sm"
          variant={largeText ? "default" : "outline"}
          onClick={() => setLargeText(!largeText)}
          className={largeText ? "bg-teal-600" : ""}
          aria-label="Toggle large text"
        >
          <Type className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant={highContrast ? "default" : "outline"}
          onClick={() => setHighContrast(!highContrast)}
          className={highContrast ? "bg-teal-600" : ""}
          aria-label="Toggle high contrast"
        >
          <Contrast className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant={voiceMode ? "default" : "outline"}
          onClick={() => {
            setVoiceMode(!voiceMode)
            speak(voiceMode ? 'Voice mode disabled' : 'Voice mode enabled')
          }}
          className={voiceMode ? "bg-teal-600" : ""}
          aria-label="Toggle voice mode"
        >
          <Volume2 className="w-4 h-4" />
        </Button>
      </div>

      <Card className={`w-full max-w-md shadow-xl ${highContrast ? 'bg-gray-900 text-white border-white' : ''}`}>
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-14 h-14 bg-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">TRUSTLEDGER</CardTitle>
          <p className={highContrast ? 'text-gray-300' : 'text-gray-500'}>
            Sign in to your account
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-2">
                Username
              </label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => speak('Enter your username')}
                className={`${largeText ? 'text-lg p-4' : ''} ${
                  highContrast ? 'bg-gray-800 border-white text-white' : ''
                }`}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => speak('Enter your password')}
                  className={`${largeText ? 'text-lg p-4' : ''} ${
                    highContrast ? 'bg-gray-800 border-white text-white' : ''
                  }`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className={`w-full bg-teal-600 hover:bg-teal-700 ${largeText ? 'text-lg p-4' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : 'Sign In'}
            </Button>
          </form>

          <div className="text-center">
            <p className={`text-sm ${highContrast ? 'text-gray-300' : 'text-gray-600'}`}>
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-teal-600 hover:underline font-semibold">
                Sign Up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
