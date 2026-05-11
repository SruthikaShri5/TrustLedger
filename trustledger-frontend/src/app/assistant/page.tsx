'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Volume2, VolumeX, Mic, MicOff, Bot, Loader2 } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { aiAPI } from '@/lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: `Hi there! 👋 I'm your financial assistant here at TRUSTLEDGER.

I can help you with:
• Understanding your transactions and spending
• Questions about fraud protection and security
• Market insights and investment information
• KYC, compliance, and account details
• Budgeting tips and financial advice

Just type your question below and I'll help you out!`,
      timestamp: new Date()
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [voiceMode, setVoiceMode] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [listening, setListening] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    setIsClient(true)
    setVoiceMode(localStorage.getItem('voiceMode') === 'true')
    
    // Check if user is logged in - be more flexible with auth check
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
    const token = localStorage.getItem('token')
    const authToken = localStorage.getItem('authToken')
    
    console.log('Auth check:', { isLoggedIn, hasToken: !!token, hasAuthToken: !!authToken })
    
    if (!isLoggedIn && !token && !authToken) {
      // Add a message explaining login requirement for real data
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ To get personalized financial insights based on your actual transaction data, please make sure you\'re logged in. I can provide general financial advice, but for specific account analysis, authentication is required.',
        timestamp: new Date()
      }])
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const speak = (text: string) => {
    if (!voiceMode || !('speechSynthesis' in window)) return
    
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 1
    
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    
    window.speechSynthesis.speak(utterance)
  }

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser.')
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
    }

    recognition.start()
    recognitionRef.current = recognition
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setListening(false)
    }
  }

  // Enhanced response function that uses real API data
  const generateEnhancedResponse = async (userInput: string): Promise<string> => {
    const input = userInput.toLowerCase()
    const userName = localStorage.getItem('userName') || 'User'

    try {
      const { transactionAPI } = await import('@/lib/api')

      if (input.includes('balance') || input.includes('money') || input.includes('spending') || input.includes('spent') || input.includes('transaction') || input.includes('category') || input.includes('breakdown')) {
        const [statsRes, txnRes] = await Promise.all([
          transactionAPI.getStats(30).catch(() => ({ data: null })),
          transactionAPI.getAll({ limit: 10 }).catch(() => ({ data: [] })),
        ])

        const stats = statsRes.data
        const txns: any[] = Array.isArray(txnRes.data) ? txnRes.data : []

        if (!stats && txns.length === 0) {
          return `Hi ${userName}! You don't have any transactions yet. Head to the Transactions page to add your first one and I'll be able to give you personalized insights!`
        }

        if (input.includes('balance') || input.includes('money')) {
          return `💰 **${userName}'s Account Summary (Last 30 Days):**\n\nNet Balance: ₹${Math.abs(stats?.net_balance ?? 0).toLocaleString('en-IN')}\nTotal Income: ₹${(stats?.total_income ?? 0).toLocaleString('en-IN')}\nTotal Expenses: ₹${(stats?.total_expenses ?? 0).toLocaleString('en-IN')}\nTransactions: ${stats?.total_transactions ?? txns.length}\n\n${(stats?.net_balance ?? 0) >= 0 ? '🎉 Great! You have a positive balance.' : '💡 Consider reviewing your expenses.'}`
        }

        if (input.includes('spending') || input.includes('spent') || input.includes('expense')) {
          const cats = stats?.categories ?? {}
          const topCat = Object.entries(cats).sort(([, a], [, b]) => (b as number) - (a as number))[0]
          const catLines = Object.entries(cats).map(([cat, amt]) => `• ${cat}: ₹${Math.round(amt as number).toLocaleString('en-IN')}`).join('\n')
          return `📊 **${userName}'s Spending Analysis (Last 30 Days):**\n\nTotal Spent: ₹${(stats?.total_expenses ?? 0).toLocaleString('en-IN')}\nTransactions: ${stats?.total_transactions ?? 0}\n${topCat ? `Top Category: ${topCat[0]} (₹${Math.round(topCat[1] as number).toLocaleString('en-IN')})` : ''}\n\n**Category Breakdown:**\n${catLines || 'No category data yet.'}\n\n💡 **Tip:** ${topCat ? `Your highest spending is in ${topCat[0]}. Consider setting a budget for this category.` : 'Add more transactions to get spending insights.'}`
        }

        if (input.includes('transaction')) {
          const recent = txns.slice(0, 5).map(t => `• ${t.merchant}: ${t.amount > 0 ? '+' : ''}₹${Math.abs(t.amount).toLocaleString('en-IN')} (${t.category})`).join('\n')
          return `💳 **${userName}'s Recent Transactions:**\n\n${recent || 'No transactions yet.'}\n\nTotal this month: ${stats?.total_transactions ?? 0} transactions\n\nGo to the Transactions page to add or manage your transactions.`
        }

        if (input.includes('category') || input.includes('breakdown')) {
          const cats = stats?.categories ?? {}
          const lines = Object.entries(cats).map(([cat, amt]) => `**${cat}**: ₹${Math.round(amt as number).toLocaleString('en-IN')}`).join('\n')
          return `📊 **${userName}'s Category Breakdown (Last 30 Days):**\n\n${lines || 'No category data yet. Add transactions to see your breakdown.'}`
        }
      }
    } catch (e) {
      // fall through to generic response
    }

    return generateChatGPTResponse(userInput)
  }

  // More natural, conversational responses like ChatGPT
  const generateChatGPTResponse = (userInput: string): string => {
    const input = userInput.toLowerCase()
    
    // Spending questions
    if (input.includes('spending') || input.includes('spent') || input.includes('expense')) {
      return `📊 **Spending Analysis:**

I can help you understand your spending patterns! Here's what I can show you:

💳 **Transaction breakdown by category**
📈 **Monthly spending trends** 
🎯 **Budget recommendations**
💡 **Money-saving tips**

To see your actual spending data, go to the Transactions page where you can view detailed analytics and add new transactions for tracking.`
    }
    
    // Banking questions
    if (input.includes('banking') || input.includes('bank')) {
      return `🏦 **Banking Services:**

I can help with various banking topics:

💰 **Account Management** - Balance, statements, transfers
🔒 **Security Features** - Fraud protection, account freezing
📋 **Compliance** - KYC verification, regulatory requirements
💳 **Transaction Services** - Payments, deposits, withdrawals
🛡️ **Fraud Protection** - Real-time monitoring and alerts
📊 **Financial Analytics** - Spending insights and budgeting

What specific banking topic would you like to know more about?`
    }
    
    // Greetings
    if (input.includes('hello') || input.includes('hi') || input.includes('hey')) {
      return `Hello! 😊 How can I help you today?`
    }
    
    // How are you
    if (input.includes('how are you')) {
      return `I'm doing great, thanks for asking! 😊 I'm here to help you with anything related to your TRUSTLEDGER account - transactions, security, market info, or anything else you need.`
    }
    
    // Balance questions
    if (input.includes('balance') || input.includes('money') || input.includes('account balance')) {
      return `💰 **Account Balance:**

You can check your complete account balance on the Dashboard page. It shows:

📊 Your net balance and total funds
📈 Income vs expenses breakdown
💳 Recent transaction summary
📉 Spending trends and analytics

Just head to Dashboard from the menu to see all the details!`
    }
    
    // Transaction questions
    if (input.includes('transaction')) {
      return `💳 **Transactions:**

I can help you with transaction management:

📝 **Add new transactions** - Record income and expenses
🔍 **Search & filter** - Find specific transactions
📊 **Category analysis** - See spending by category
🚨 **Fraud monitoring** - Real-time security checks

Visit the Transactions page to manage all your financial activity!`
    }
    
    // Default response
    return `I understand you're asking about "${userInput}". I'd be happy to help!

I can assist with:
• 💰 Account balance and transaction analysis
• 🔒 Fraud protection and security features
• 📊 Spending insights and budgeting advice
• 📈 Market data and investment information
• 📋 KYC compliance and account verification

What specific topic would you like to explore?`
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const userInput = input.trim()
    const newUserMessage: Message = {
      role: 'user',
      content: userInput,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newUserMessage])
    setInput('')
    setIsTyping(true)

    try {
      const response = await aiAPI.chat(userInput)
      const aiResponse = response.data.response

      const newAiMessage: Message = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, newAiMessage])

      if (voiceMode) {
        setTimeout(() => speak(aiResponse), 500)
      }
    } catch (error: any) {
      console.error('AI API Error:', error)
      // Fallback to local response when API is unavailable
      const aiResponse = await generateEnhancedResponse(userInput)
      const newAiMessage: Message = {
        role: 'assistant',
        content: aiResponse + '\n\n⚠️ *Note: Using offline mode. For real-time data analysis, please ensure you\'re connected.*',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, newAiMessage])

      if (voiceMode) {
        setTimeout(() => speak(aiResponse), 500)
      }
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar 
        isMobileOpen={isMobileSidebarOpen} 
        onMobileClose={() => setIsMobileSidebarOpen(false)} 
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMobileMenuToggle={() => setIsMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-6 py-8 h-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Financial Assistant</h1>
                <p className="text-gray-600 dark:text-gray-300">Your personal financial helper</p>
              </div>
              <div className="flex items-center space-x-3">
                {voiceMode && (
                  <>
                    <Button
                      variant={isSpeaking ? "destructive" : "outline"}
                      size="sm"
                      onClick={isSpeaking ? stopSpeaking : () => messages.length > 0 && speak(messages[messages.length - 1].content)}
                    >
                      {isSpeaking ? <VolumeX className="w-4 h-4 mr-2" /> : <Volume2 className="w-4 h-4 mr-2" />}
                      {isSpeaking ? 'Stop' : 'Speak'}
                    </Button>
                    <Button
                      variant={listening ? "destructive" : "outline"}
                      size="sm"
                      onClick={listening ? stopListening : startListening}
                    >
                      {listening ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                      {listening ? 'Stop' : 'Voice'}
                    </Button>
                  </>
                )}
              </div>
            </div>

            <Card className="h-[calc(100vh-250px)] flex flex-col shadow-lg border-gray-200 dark:border-gray-700 dark:bg-gray-800">
              <CardContent className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 dark:bg-gray-900">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                    <div className={`max-w-[80%] p-4 rounded-lg shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-teal-600 text-white' 
                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
                    }`}>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center mb-2">
                          <Bot className="w-4 h-4 mr-2 text-teal-600" />
                          <span className="text-xs font-semibold text-teal-600">Assistant</span>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      {isClient && (
                        <div className={`text-xs mt-2 ${
                          msg.role === 'user' ? 'text-teal-200' : 'text-gray-400'
                        }`}>
                          {msg.timestamp.toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-2">
                        <Bot className="w-4 h-4 text-teal-600" />
                        <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                        <span className="text-sm text-gray-500">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </CardContent>
              
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Type your message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    disabled={isTyping}
                  />
                  <Button 
                    onClick={handleSend} 
                    disabled={!input.trim() || isTyping}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
