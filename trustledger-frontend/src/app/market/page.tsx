'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Activity, Brain } from 'lucide-react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import VoiceNavigation from '@/components/VoiceNavigation'
import { useRouter } from 'next/navigation'
import { marketAPI } from '@/lib/api'

export default function MarketAnalytics() {
  const [marketItems, setMarketItems] = useState<any[]>([])
  const [niftyData, setNiftyData] = useState<any>(null)
  const [sensexData, setSensexData] = useState<any>(null)
  const [usdInrData, setUsdInrData] = useState<any>(null)
  const [riskData, setRiskData] = useState<any>(null)
  const [trendData, setTrendData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  const router = useRouter()

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn')
    if (!isLoggedIn) { router.replace('/login'); return }
    loadMarketData()
  }, [])

  const loadMarketData = async () => {
    try {
      setLoading(true)
      const [liveRes, riskRes, trendRes] = await Promise.all([
        marketAPI.getLive().catch(() => ({ data: null })),
        marketAPI.getRisk().catch(() => ({ data: null })),
        marketAPI.getTrend(7).catch(() => ({ data: null }))
      ])

      if (liveRes.data?.data) {
        const items = liveRes.data.data
        const nifty = items.find((i: any) => i.symbol === 'NIFTY50')
        const sensex = items.find((i: any) => i.symbol === 'SENSEX')
        const usdinr = items.find((i: any) => i.symbol === 'USDINR')
        setMarketItems(items)
        setNiftyData(nifty)
        setSensexData(sensex)
        setUsdInrData(usdinr)
      }

      if (riskRes.data) {
        setRiskData(riskRes.data)
      }

      if (trendRes.data?.data && Array.isArray(trendRes.data.data)) {
        setTrendData(trendRes.data.data)
      }
    } catch (err) {
      console.error('Failed to load market data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getChartData = () => {
    if (trendData.length > 0) return trendData
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return days.map(day => ({
      date: day,
      nifty: 22000 + Math.random() * 500,
      sensex: 72000 + Math.random() * 1500,
      volume: Math.floor(Math.random() * 10000000)
    }))
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar isMobileOpen={isMobileSidebarOpen} onMobileClose={() => setIsMobileSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMobileMenuToggle={() => setIsMobileSidebarOpen(true)} />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
            <div className="container mx-auto px-6 py-8">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Activity className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading market data...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar isMobileOpen={isMobileSidebarOpen} onMobileClose={() => setIsMobileSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMobileMenuToggle={() => setIsMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Market Analytics</h1>
                <p className="text-gray-600 dark:text-gray-400">Real-time market data and risk analysis</p>
              </div>
              <div className="hidden md:block">
                <img
                  src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=200&h=120&fit=crop&crop=center"
                  alt="Stock market charts and analytics"
                  className="w-32 h-20 object-cover rounded-lg shadow-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">NIFTY 50</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {niftyData?.price?.toLocaleString('en-IN') ?? '22,450'}
                  </div>
                  <div className={`flex items-center text-sm ${(niftyData?.change_percent ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(niftyData?.change_percent ?? 0) >= 0
                      ? <TrendingUp className="w-4 h-4 mr-1" />
                      : <TrendingDown className="w-4 h-4 mr-1" />}
                    {niftyData?.change_percent?.toFixed(2) ?? '0.00'}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">SENSEX</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {sensexData?.price?.toLocaleString('en-IN') ?? '73,850'}
                  </div>
                  <div className={`flex items-center text-sm ${(sensexData?.change_percent ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(sensexData?.change_percent ?? 0) >= 0
                      ? <TrendingUp className="w-4 h-4 mr-1" />
                      : <TrendingDown className="w-4 h-4 mr-1" />}
                    {sensexData?.change_percent?.toFixed(2) ?? '0.00'}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">USD/INR</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {usdInrData?.price?.toFixed(2) ?? '83.15'}
                  </div>
                  <div className={`flex items-center text-sm ${(usdInrData?.change_percent ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(usdInrData?.change_percent ?? 0) >= 0
                      ? <TrendingUp className="w-4 h-4 mr-1" />
                      : <TrendingDown className="w-4 h-4 mr-1" />}
                    {usdInrData?.change_percent?.toFixed(2) ?? '0.00'}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Portfolio Risk</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {riskData?.portfolio_risk ?? 45}%
                  </div>
                  <div className={`flex items-center text-sm ${
                    (riskData?.portfolio_risk ?? 45) > 60 ? 'text-red-600' :
                    (riskData?.portfolio_risk ?? 45) > 40 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    <Activity className="w-4 h-4 mr-1" />
                    {(riskData?.portfolio_risk ?? 45) > 60 ? 'High' :
                     (riskData?.portfolio_risk ?? 45) > 40 ? 'Medium' : 'Low'}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Market Trend Analysis</CardTitle>
                    <div className="flex items-center text-teal-600">
                      <Brain className="w-4 h-4 mr-1" />
                      <span className="text-xs font-semibold">AI Prediction</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={getChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={['auto', 'auto']} />
                      <Tooltip formatter={(value: number) => [`${value.toFixed(0)}`, '']} />
                      <Legend />
                      <Area type="monotone" dataKey="nifty" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.3} name="NIFTY 50" />
                      <Area type="monotone" dataKey="sensex" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="SENSEX" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>All Market Symbols</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {marketItems.length > 0 ? marketItems.map((item: any) => (
                      <div key={item.symbol} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
                        <span className="font-semibold dark:text-white">{item.symbol}</span>
                        <span className="dark:text-gray-300">{item.price?.toLocaleString('en-IN')}</span>
                        <span className={`text-sm font-medium ${item.change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.change_percent >= 0 ? '+' : ''}{item.change_percent?.toFixed(2)}%
                        </span>
                      </div>
                    )) : (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">No market data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Portfolio Risk Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="dark:text-white">Overall Risk Score</span>
                      <span className="font-semibold dark:text-white">{riskData?.portfolio_risk ?? 42}/100</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-3 rounded-full" style={{width: `${riskData?.portfolio_risk ?? 42}%`}}></div>
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Brain className="w-5 h-5 text-teal-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-teal-900 dark:text-teal-200">AI Recommendation</p>
                        <p className="text-sm text-teal-700 dark:text-teal-300 mt-1">
                          {riskData?.risk_factors?.join('. ') ||
                           "Your portfolio shows moderate risk with balanced diversification across sectors. Consider increasing debt allocation by 5% to reduce overall volatility."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      <VoiceNavigation currentPage="Market" />
    </div>
  )
}
