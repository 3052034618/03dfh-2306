import { useState, useMemo } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Calendar,
  LayoutGrid,
  Users,
  Package,
  BarChart3,
  Bell,
  X,
  Check,
  CheckCheck,
  Filter,
  Inbox,
  CalendarDays,
  ExternalLink,
} from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import { NOTIFICATION_TYPE_LABELS } from '@/types'
import type { Notification } from '@/types'

const navItems = [
  { to: '/calendar', icon: Calendar, label: '排班日历' },
  { to: '/rooms', icon: LayoutGrid, label: '房间看板' },
  { to: '/staff', icon: Users, label: '人员状态' },
  { to: '/consumables', icon: Package, label: '耗材预警' },
  { to: '/review', icon: BarChart3, label: '复盘统计' },
]

const TYPE_COLORS: Record<string, string> = {
  assignment: 'bg-navy-100 text-navy-700',
  dispatch: 'bg-emerald-100 text-emerald-700',
  delay: 'bg-coral-100 text-coral-700',
  consumable: 'bg-amber-100 text-amber-700',
  handover: 'bg-cyan-100 text-cyan-700',
}

type ReadFilter = 'all' | 'unread'

export default function Layout() {
  const navigate = useNavigate()
  const notifications = useStore((s) => s.notifications)
  const assistants = useStore((s) => s.assistants)
  const schedules = useStore((s) => s.schedules)
  const markNotificationRead = useStore((s) => s.markNotificationRead)
  const markAllNotificationsRead = useStore((s) => s.markAllNotificationsRead)
  const markNotificationsReadByTarget = useStore((s) => s.markNotificationsReadByTarget)

  const unreadCount = notifications.filter((n) => !n.read).length
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [filterTargetId, setFilterTargetId] = useState('')
  const [filterType, setFilterType] = useState<string>('')
  const [filterRead, setFilterRead] = useState<ReadFilter>('all')
  const [filterDate, setFilterDate] = useState('')

  const sortedNotifications = useMemo(
    () => [...notifications].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [notifications]
  )

  const filteredNotifications = useMemo(() => {
    return sortedNotifications.filter((n) => {
      if (filterTargetId && n.targetId !== filterTargetId) return false
      if (filterType && n.type !== filterType) return false
      if (filterRead === 'unread' && n.read) return false
      if (filterDate) {
        const nDate = new Date(n.timestamp).toISOString().slice(0, 10)
        if (nDate !== filterDate) return false
      }
      return true
    })
  }, [sortedNotifications, filterTargetId, filterType, filterRead, filterDate])

  const targetIds = useMemo(() => {
    const ids = new Set<string>()
    notifications.forEach((n) => {
      if (n.targetId) ids.add(n.targetId)
    })
    return Array.from(ids)
  }, [notifications])

  const typeList = useMemo(() => {
    const types = new Set<string>()
    notifications.forEach((n) => types.add(n.type))
    return Array.from(types)
  }, [notifications])

  const filteredUnreadCount = useMemo(
    () => filteredNotifications.filter((n) => !n.read).length,
    [filteredNotifications]
  )

  function handleJumpToSchedule(n: Notification) {
    if (!n.scheduleId) return
    const schedule = schedules.find((s) => s.id === n.scheduleId)
    if (!schedule) return
    markNotificationRead(n.id)
    setNotifyOpen(false)

    const params = new URLSearchParams()
    params.set('scheduleId', n.scheduleId)
    params.set('date', schedule.date)

    if (n.type === 'handover' || n.type === 'delay') {
      params.set('roomId', schedule.roomId)
      navigate(`/rooms?${params.toString()}`)
    } else {
      navigate(`/calendar?${params.toString()}`)
    }
  }

  function handleResetFilters() {
    setFilterTargetId('')
    setFilterType('')
    setFilterRead('all')
    setFilterDate('')
  }

  const hasFilters = filterTargetId || filterType || filterRead !== 'all' || filterDate

  return (
    <div className="flex h-screen bg-warm-100">
      <aside className="w-64 bg-navy-800 flex flex-col shrink-0">
        <div className="px-6 py-6 border-b border-white/10">
          <h1 className="font-serif text-lg font-semibold text-white tracking-wide">
            医美协同看板
          </h1>
          <p className="text-xs text-navy-300 mt-1">跟台排班 · 实时协同 · 复盘管理</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-4">
          <button
            onClick={() => setNotifyOpen(!notifyOpen)}
            className="sidebar-link sidebar-link-inactive relative w-full text-left"
          >
            <Bell size={18} />
            <span>通知中心</span>
            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 bg-coral-400 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        <div className="px-6 py-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-navy-600 flex items-center justify-center text-white text-sm font-medium">
              院
            </div>
            <div>
              <p className="text-sm text-white font-medium">运营院长</p>
              <p className="text-xs text-navy-300">在线</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>

      {notifyOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-navy-900/30 backdrop-blur-sm" onClick={() => setNotifyOpen(false)} />
          <div className="relative w-[460px] bg-white shadow-2xl flex flex-col animate-slide-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-warm-200/60 shrink-0">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-navy-600" />
                <h2 className="font-serif text-lg font-semibold text-navy-800">通知中心</h2>
                {unreadCount > 0 && (
                  <span className="badge bg-coral-100 text-coral-700 text-xs px-2 py-0.5 rounded-full">
                    {unreadCount} 条未读
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="flex items-center gap-1 text-xs text-navy-500 hover:text-navy-700 transition-colors"
                  >
                    <CheckCheck size={14} />
                    全部已读
                  </button>
                )}
                <button
                  onClick={() => setNotifyOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-warm-100 transition-colors"
                >
                  <X size={18} className="text-navy-400" />
                </button>
              </div>
            </div>

            <div className="px-5 py-3 border-b border-warm-100 shrink-0 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-warm-100 rounded-lg p-0.5 flex-1">
                  <button
                    onClick={() => setFilterRead('all')}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-all',
                      filterRead === 'all' ? 'bg-white text-navy-800 shadow-sm' : 'text-navy-400 hover:text-navy-600'
                    )}
                  >
                    <Inbox size={12} />
                    全部 ({sortedNotifications.length})
                  </button>
                  <button
                    onClick={() => setFilterRead('unread')}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-all',
                      filterRead === 'unread' ? 'bg-white text-navy-800 shadow-sm' : 'text-navy-400 hover:text-navy-600'
                    )}
                  >
                    <Bell size={12} />
                    未读 ({unreadCount})
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  className="select-field text-xs py-1.5 flex-1 min-w-[100px]"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="">全部类型</option>
                  {typeList.map((t) => (
                    <option key={t} value={t}>
                      {NOTIFICATION_TYPE_LABELS[t] ?? t}
                    </option>
                  ))}
                </select>

                <select
                  className="select-field text-xs py-1.5 flex-1 min-w-[100px]"
                  value={filterTargetId}
                  onChange={(e) => setFilterTargetId(e.target.value)}
                >
                  <option value="">全部人员</option>
                  {targetIds.map((id) => {
                    const a = assistants.find((ast) => ast.id === id)
                    return (
                      <option key={id} value={id}>
                        {a?.name ?? id}
                      </option>
                    )
                  })}
                </select>

                <div className="flex items-center gap-1 flex-1 min-w-[130px]">
                  <CalendarDays size={12} className="text-navy-400 shrink-0" />
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="select-field text-xs py-1.5 flex-1"
                  />
                </div>

                {hasFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="text-xs text-coral-500 hover:text-coral-600 shrink-0"
                  >
                    重置
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="py-16 text-center">
                  <Bell size={32} className="mx-auto mb-3 text-warm-300" />
                  <p className="text-sm text-gray-400">
                    {hasFilters ? '符合筛选条件的通知为空' : '暂无通知'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-warm-100">
                  {filteredNotifications.map((n) => {
                    const targetAssistant = assistants.find((a) => a.id === n.targetId)
                    const hasSchedule = !!n.scheduleId
                    return (
                      <div
                        key={n.id}
                        className={cn(
                          'px-5 py-3.5 transition-colors group',
                          !n.read ? 'bg-navy-50/50 hover:bg-navy-100/40' : 'bg-white hover:bg-warm-50'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', TYPE_COLORS[n.type] ?? 'bg-gray-100 text-gray-600')}>
                                {NOTIFICATION_TYPE_LABELS[n.type] ?? n.type}
                              </span>
                              {targetAssistant && (
                                <span className="text-[10px] text-navy-400">
                                  → {targetAssistant.name}
                                </span>
                              )}
                              {hasSchedule && (
                                <button
                                  onClick={() => handleJumpToSchedule(n)}
                                  className="text-[10px] text-navy-500 hover:text-coral-600 flex items-center gap-0.5 transition-colors"
                                >
                                  <ExternalLink size={10} />
                                  跳转到台次
                                </button>
                              )}
                              {!n.read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-coral-400 shrink-0" />
                              )}
                            </div>
                            <p className={cn('text-sm', n.read ? 'text-gray-500' : 'text-navy-800 font-medium')}>
                              {n.message}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {new Date(n.timestamp).toLocaleString('zh-CN')}
                            </p>
                          </div>
                          {!n.read && (
                            <button
                              onClick={() => markNotificationRead(n.id)}
                              className="shrink-0 p-1.5 rounded-lg hover:bg-emerald-50 text-navy-300 hover:text-emerald-600 transition-colors opacity-0 group-hover:opacity-100"
                              title="标记已读"
                            >
                              <Check size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-warm-200/60 shrink-0 flex items-center justify-between">
              <span className="text-xs text-navy-400">
                共 {filteredNotifications.length} 条
                {filteredUnreadCount > 0 && `，${filteredUnreadCount} 条未读`}
              </span>
              {filterTargetId && filteredNotifications.some((n) => !n.read) && (
                <button
                  onClick={() => markNotificationsReadByTarget(filterTargetId)}
                  className="flex items-center gap-1 text-xs text-navy-500 hover:text-navy-700"
                >
                  <CheckCheck size={12} />
                  该人员标为已读
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
