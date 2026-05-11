'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Users, AlertTriangle, Activity, Shield, LogOut, BarChart3,
  Loader2, RefreshCw, UserCheck, Search, Ban,
  TrendingUp, Bell
} from 'lucide-react'
import { adminAPI } from '@/lib/api'
import VoiceNavigation from '@/components/VoiceNavigation'

export default function AdminPanel() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [fraudCases, setFraudCases] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'fraud' | 'logs'>('overview')
  const [searchUser, setSearchUser] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [broadcastTitle, setBroadcastTitle] = useState('')

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn')
    const isAdmin = localStorage.getItem('isAdmin')
    const userType = localStorage.getItem('userType')
    if (!isLoggedIn || (isAdmin !== 'true' && userType !== 'admin')) {
      router.push('/login')
      return
    }
    loadAdminData()
  }, [router])

  const loadAdminData = async () => {
    setLoading(true)
    try {
      const [statsRes, usersRes, fraudRes, logsRes] = await Promise.all([
        adminAPI.getStats().catch(() => ({ data: null })),
        adminAPI.getUsers().catch(() => ({ data: [] })),
        adminAPI.getFraudCases().catch(() => ({ data: [] })),
        adminAPI.getLogs().catch(() => ({ data: [] })),
      ])
      if (statsRes.data) setStats(statsRes.data)
      if (usersRes.data) setUsers(Array.isArray(usersRes.data) ? usersRes.data : [])
      if (fraudRes.data) setFraudCases(Array.isArray(fraudRes.data) ? fraudRes.data : [])
      if (logsRes.data) setLogs(Array.isArray(logsRes.data) ? logsRes.data : [])
    } catch (err) {
      console.error('Failed to load admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Block / Unblock user
  const handleToggleUserStatus = async (userId: number, currentStatus: boolean, username: string) => {
    const action = currentStatus ? 'block' : 'unblock'
    if (!window.confirm(`Are you sure you want to ${action} user "${username}"?`)) return
    setActionLoading(`user-${userId}`)
    try {
      await adminAPI.updateUserStatus(userId, !currentStatus)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u))
      alert(`User "${username}" has been ${action}ed successfully.`)
    } catch (err) {
      alert(`Failed to ${action} user. Please try again.`)
    } finally {
      setActionLoading(null)
    }
  }

  // Update fraud case status
  const handleFraudCaseStatus = async (caseId: number, status: string) => {
    setActionLoading(`fraud-${caseId}`)
    try {
      await adminAPI.updateFraudCaseStatus(caseId, status)
      setFraudCases(prev => prev.map(c => c.id === caseId ? { ...c, status } : c))
    } catch (err) {
      alert('Failed to update case status.')
    } finally {
      setActionLoading(null)
    }
  }

  // Broadcast alert
  const handleBroadcast = async () => {
    if (!broadcastTitle || !broadcastMsg) { alert('Enter title and message.'); return }
    try {
      await adminAPI.broadcastAlert(broadcastTitle, broadcastMsg, 'info')
      alert(`Alert broadcasted to all users!`)
      setBroadcastTitle('')
      setBroadcastMsg('')
    } catch (err) {
      alert('Failed to broadcast alert.')
    }
  }

  const handleLogout = () => { localStorage.clear(); router.push('/') }

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchUser.toLowerCase())
  )

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n)

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users',    label: 'Users',    icon: Users },
    { id: 'fraud',    label: 'Fraud Cases', icon: AlertTriangle },
    { id: 'logs',     label: 'System Logs', icon: Activity },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 shadow-sm border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">TRUSTLEDGER Admin</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">System Administration Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadAdminData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" variant="ghost" onClick={handleLogout} className="text-red-600 hover:text-red-700">
              <LogOut className="w-4 h-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-6 gap-1 pb-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        {loading && !stats ? (
          <div className="flex items-center justify-center h-64">
            <Activity className="w-8 h-8 animate-spin text-teal-600 mr-3" />
            <p className="text-slate-600 dark:text-slate-400">Loading admin data...</p>
          </div>
        ) : (
          <>
            {/* ── OVERVIEW TAB ── */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Users', value: stats?.total_users ?? 0, sub: `Active: ${stats?.active_users ?? 0}`, color: 'bg-blue-50 border-blue-200', icon: Users, iconColor: 'text-blue-600' },
                    { label: 'Transactions', value: stats?.total_transactions ?? 0, sub: `Today: ${stats?.today_transactions ?? 0}`, color: 'bg-teal-50 border-teal-200', icon: TrendingUp, iconColor: 'text-teal-600' },
                    { label: 'Fraud Cases', value: stats?.fraud_cases ?? 0, sub: (stats?.fraud_cases ?? 0) > 0 ? 'Needs review' : 'All clear', color: 'bg-rose-50 border-rose-200', icon: AlertTriangle, iconColor: 'text-rose-600' },
                    { label: 'System Health', value: stats?.system_health ?? 'healthy', sub: `Uptime: ${stats?.uptime ?? '99.9%'}`, color: 'bg-green-50 border-green-200', icon: Activity, iconColor: 'text-green-600' },
                  ].map(card => (
                    <Card key={card.label} className={`border ${card.color} dark:bg-slate-800 dark:border-slate-700`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
                          <card.icon className={`w-4 h-4 ${card.iconColor}`} />
                        </div>
                        <p className="text-2xl font-bold text-slate-800 dark:text-white capitalize">{card.value}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{card.sub}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Broadcast Alert */}
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 dark:text-white text-base">
                      <Bell className="w-4 h-4 text-teal-600" />
                      Broadcast Alert to All Users
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      placeholder="Alert title..."
                      value={broadcastTitle}
                      onChange={e => setBroadcastTitle(e.target.value)}
                      className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />
                    <Input
                      placeholder="Alert message..."
                      value={broadcastMsg}
                      onChange={e => setBroadcastMsg(e.target.value)}
                      className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />
                    <Button onClick={handleBroadcast} className="bg-teal-600 hover:bg-teal-700">
                      <Bell className="w-4 h-4 mr-2" />
                      Send to All Users
                    </Button>
                  </CardContent>
                </Card>

                {/* Quick nav */}
                <div className="grid grid-cols-3 gap-3">
                  <Button onClick={() => setActiveTab('users')} variant="outline" className="h-12">
                    <Users className="w-4 h-4 mr-2" /> Manage Users
                  </Button>
                  <Button onClick={() => setActiveTab('fraud')} variant="outline" className="h-12">
                    <AlertTriangle className="w-4 h-4 mr-2" /> Fraud Cases
                  </Button>
                  <Button onClick={() => setActiveTab('logs')} variant="outline" className="h-12">
                    <Activity className="w-4 h-4 mr-2" /> System Logs
                  </Button>
                </div>
              </div>
            )}

            {/* ── USERS TAB ── */}
            {activeTab === 'users' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search users..."
                      value={searchUser}
                      onChange={e => setSearchUser(e.target.value)}
                      className="pl-9 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    />
                  </div>
                  <p className="text-sm text-slate-500">{filteredUsers.length} users</p>
                </div>

                <Card className="dark:bg-slate-800 dark:border-slate-700">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">User</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Email</th>
                            <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Txns</th>
                            <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Fraud</th>
                            <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Role</th>
                            <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                            <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map(user => (
                            <tr key={user.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-medium text-slate-800 dark:text-white">{user.username}</p>
                                  <p className="text-xs text-slate-400">{user.full_name || '—'}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">{user.email}</td>
                              <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">{user.transaction_count}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={user.fraud_alerts > 0 ? 'text-red-600 font-bold' : 'text-green-600'}>
                                  {user.fraud_alerts}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  user.is_admin ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                }`}>
                                  {user.is_admin ? 'Admin' : 'User'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  user.is_active
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                }`}>
                                  {user.is_active ? 'Active' : 'Blocked'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {!user.is_admin && (
                                  <Button
                                    size="sm"
                                    variant={user.is_active ? 'destructive' : 'outline'}
                                    onClick={() => handleToggleUserStatus(user.id, user.is_active, user.username)}
                                    disabled={actionLoading === `user-${user.id}`}
                                    className="text-xs h-7 px-2"
                                  >
                                    {actionLoading === `user-${user.id}` ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : user.is_active ? (
                                      <><Ban className="w-3 h-3 mr-1" />Block</>
                                    ) : (
                                      <><UserCheck className="w-3 h-3 mr-1" />Unblock</>
                                    )}
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── FRAUD CASES TAB ── */}
            {activeTab === 'fraud' && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-sm text-slate-500 dark:text-slate-400">{fraudCases.length} high-risk cases (score ≥ 50)</p>
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">User</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Merchant</th>
                            <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Amount</th>
                            <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Risk</th>
                            <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                            <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fraudCases.slice(0, 30).map(fc => (
                            <tr key={fc.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                              <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{fc.username}</td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{fc.merchant}</td>
                              <td className={`px-4 py-3 text-right font-semibold ${fc.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {fmt(fc.amount)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                  fc.risk_score >= 90 ? 'bg-red-100 text-red-700' :
                                  fc.risk_score >= 70 ? 'bg-orange-100 text-orange-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {Math.round(fc.risk_score)}/100
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                  {fc.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 px-2"
                                    disabled={actionLoading === `fraud-${fc.id}`}
                                    onClick={() => handleFraudCaseStatus(fc.id, 'investigating')}
                                  >
                                    Investigate
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 px-2 text-green-600"
                                    disabled={actionLoading === `fraud-${fc.id}`}
                                    onClick={() => handleFraudCaseStatus(fc.id, 'resolved')}
                                  >
                                    Resolve
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── LOGS TAB ── */}
            {activeTab === 'logs' && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-sm text-slate-500 dark:text-slate-400">{logs.length} system log entries</p>
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0">
                          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Level</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Message</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Source</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {logs.map(log => (
                            <tr key={log.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                              <td className="px-4 py-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                  log.level === 'ERROR' || log.level === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                  log.level === 'WARNING' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {log.level}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-slate-700 dark:text-slate-300 max-w-xs truncate">{log.message}</td>
                              <td className="px-4 py-2 text-slate-500 dark:text-slate-400 text-xs">{log.source}</td>
                              <td className="px-4 py-2 text-slate-400 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </main>
      <VoiceNavigation currentPage="Admin" />
    </div>
  )
}
