'use client'

import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Volume2, VolumeX, HelpCircle, X, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

const VOICE_COMMANDS = [
  { command: 'dashboard',    action: '/dashboard',    label: 'Dashboard' },
  { command: 'transactions', action: '/transactions', label: 'Transactions' },
  { command: 'fraud',        action: '/fraud',        label: 'Fraud Detection' },
  { command: 'market',       action: '/market',       label: 'Market Analytics' },
  { command: 'assistant',    action: '/assistant',    label: 'AI Assistant' },
  { command: 'compliance',   action: '/compliance',   label: 'Compliance' },
  { command: 'reports',      action: '/reports',      label: 'Reports' },
  { command: 'settings',     action: '/settings',     label: 'Settings' },
  { command: 'green',        action: '/green',        label: 'Green Finance' },
  { command: 'help',         action: '/help',         label: 'Help' },
]

export default function VoiceNavigation({ currentPage = '' }: { currentPage?: string }) {
  const [isListening, setIsListening]   = useState(false)
  const [isSupported, setIsSupported]   = useState(false)
  const [transcript, setTranscript]     = useState('')
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [showHelp, setShowHelp]         = useState(false)
  const [feedback, setFeedback]         = useState('')
  const [isClient, setIsClient]         = useState(false)
  const recognitionRef = useRef<any>(null)
  const router = useRouter()

  useEffect(() => {
    setIsClient(true)
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setIsSupported(!!SR)
    // Read voice mode from localStorage (set by accessibility profile or settings)
    setVoiceEnabled(localStorage.getItem('voiceMode') === 'true')
  }, [])

  useEffect(() => {
    if (!isClient) return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR || !voiceEnabled) return

    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      const cmd = event.results[0][0].transcript.toLowerCase().trim()
      setTranscript(cmd)
      handleVoiceCommand(cmd)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend   = () => setIsListening(false)
    recognitionRef.current = recognition

    return () => { try { recognition.stop() } catch {} }
  }, [voiceEnabled, isClient])

  const speak = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.9
    window.speechSynthesis.speak(u)
  }

  const showFeedback = (msg: string) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(''), 2500)
  }

  const handleVoiceCommand = (command: string) => {
    const match = VOICE_COMMANDS.find(c => command.includes(c.command))
    if (match) {
      showFeedback(`✓ Going to ${match.label}`)
      speak(`Opening ${match.label}`)
      setTimeout(() => router.push(match.action), 300)
    } else {
      showFeedback('Not recognized. Say a page name like "dashboard"')
      speak('Command not recognized. Say a page name.')
    }
  }

  const startListening = () => {
    if (!recognitionRef.current || isListening) return
    setIsListening(true)
    setTranscript('')
    setFeedback('')
    try { recognitionRef.current.start() } catch {}
    speak('Listening')
  }

  const stopListening = () => {
    try { recognitionRef.current?.stop() } catch {}
    setIsListening(false)
  }

  const toggleVoice = () => {
    const next = !voiceEnabled
    setVoiceEnabled(next)
    localStorage.setItem('voiceMode', String(next))
    if (next) speak('Voice navigation enabled. Click the microphone and say a page name.')
    else { window.speechSynthesis?.cancel(); setShowHelp(false) }
  }

  // Always render the toggle button — only show mic when voice is enabled
  if (!isSupported || !isClient) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">

      {/* Help panel */}
      {showHelp && voiceEnabled && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 w-72 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">🎤 Voice Commands</h3>
            <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Click 🎤 then say one of these:
          </p>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {VOICE_COMMANDS.map(c => (
              <div key={c.action} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <ChevronRight className="w-3 h-3 text-teal-500 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">&quot;{c.command}&quot;</p>
                  <p className="text-xs text-slate-400">{c.label}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
            <p className="text-xs text-teal-700 dark:text-teal-300 font-medium">
              💡 Just say the page name clearly after clicking 🎤
            </p>
          </div>
        </div>
      )}

      {/* Feedback toast */}
      {feedback && (
        <div className="bg-slate-900 text-white text-xs font-medium px-3 py-2 rounded-xl shadow-lg animate-fade-in max-w-xs text-center">
          {feedback}
        </div>
      )}

      {/* Transcript */}
      {transcript && voiceEnabled && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl shadow-lg text-xs max-w-xs">
          <span className="text-slate-400">Heard: </span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">{transcript}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Help button — only when voice enabled */}
        {voiceEnabled && (
          <button
            onClick={() => setShowHelp(s => !s)}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all border ${
              showHelp
                ? 'bg-teal-500 border-teal-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400'
            }`}
            title="Show voice commands"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}

        {/* Mic button — only when voice enabled */}
        {voiceEnabled && (
          <button
            onClick={isListening ? stopListening : startListening}
            className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all ${
              isListening
                ? 'bg-red-500 hover:bg-red-600 scale-110'
                : 'bg-gradient-to-br from-teal-400 to-teal-600 hover:from-teal-300 hover:to-teal-500'
            }`}
            title={isListening ? 'Stop listening' : 'Start voice command'}
          >
            {isListening && (
              <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />
            )}
            {isListening
              ? <MicOff className="w-6 h-6 text-white relative z-10" />
              : <Mic className="w-6 h-6 text-white relative z-10" />
            }
          </button>
        )}

        {/* Voice toggle — always visible */}
        <button
          onClick={toggleVoice}
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all border ${
            voiceEnabled
              ? 'bg-teal-500 border-teal-500 text-white'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-400 hover:border-teal-400'
          }`}
          title={voiceEnabled ? 'Disable voice navigation' : 'Enable voice navigation'}
        >
          {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
