import { useState, useMemo } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Calendar, LayoutGrid, Users, Package, BarChart3, Bell, X, Check, CheckCheck, Filter } from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/calendar', icon: Calendar, label: '排班日历' },
  { to: '/rooms', icon: LayoutGrid, label: '房间看板' },
  { to: '/staff', icon: Users, label: '人员状态' },
  { to: '/consumables', icon: Package, label: '耗材预警' },
  { to: '/review', icon: BarChart3, label: '复盘统计' },
]

const TYPE_LABELS: Record<string, string> = {
  assignment: '排班通知',
  dispatch: '调派通知',
  delay: '延误通知',
  consumable: '耗材通知',
}

const TYPE_COLORS: Record<string, string> = {
  assignment: 'bg-navy-100 text-navy-700',
  dispatch: 'bg-emerald-100 text-emerald-700',
  delay: 'bg-coral-100 text-coral-700',
  consumable: 'bg-amber-100 text-amber-700',
}

export default function Layout() {
  const notifications = useStore((s) => s.notifications)
  const assistants = useStore((s) => s.assistants)
  const markNotificationRead = useStore((s) => s.markNotificationRead)
  const markAllNotificationsRead = useStore((s) => s.markAllNotificationsRead)
  const markNotificationsReadByTarget = useStore((s) => s.markNotificationsReadByTarget)

  const unreadCount = notifications.filter((n) => !n.read).length
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [filterTargetId, setFilterTargetId] = useState('')

  const sortedNotifications = useMemo(
    () => [...notifications].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [notifications]
  )

  const filteredNotifications = useMemo(() => {
    if (!filterTargetId) return sortedNotifications
    return sortedNotifications.filter((n) => n.targetId === filterTargetId)
  }, [sortedNotifications, filterTargetId])

  const targetIds = useMemo(() => {
    const ids = new Set<string>()
    notifications.forEach((n) => {
      if (n.targetId) ids.add(n.targetId)
    })
    return Array.from(ids)
  }, [notifications])

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
          <div className="relative w-[420px] bg-white shadow-2xl flex flex-col animate-slide-in">
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

            <div className="px-5 py-3 border-b border-warm-100 shrink-0">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-navy-400 shrink-0" />
                <select
                  className="select-field text-sm py-1.5 flex-1"
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
                {filterTargetId && (
                  <button
                    onClick={() => setFilterTargetId('')}
                    className="text-xs text-coral-500 hover:text-coral-600"
                  >
                    清除
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="py-16 text-center">
                  <Bell size={32} className="mx-auto mb-3 text-warm-300" />
                  <p className="text-sm text-gray-400">
                    {filterTargetId ? '该人员暂无通知' : '暂无通知'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-warm-100">
                  {filteredNotifications.map((n) => {
                    const targetAssistant = assistants.find((a) => a.id === n.targetId)
                    return (
                      <div
                        key={n.id}
                        className={cn(
                          'px-5 py-3.5 transition-colors',
                          !n.read ? 'bg-navy-50/50' : 'bg-white'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', TYPE_COLORS[n.type] ?? 'bg-gray-100 text-gray-600')}>
                                {TYPE_LABELS[n.type] ?? n.type}
                              </span>
                              {targetAssistant && (
                                <span className="text-[10px] text-navy-400">
                                  → {targetAssistant.name}
                                </span>
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
                              className="shrink-0 p-1.5 rounded-lg hover:bg-emerald-50 text-navy-300 hover:text-emerald-600 transition-colors"
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

            {filterTargetId && filteredNotifications.some((n) => !n.read) && (
              <div className="px-5 py-3 border-t border-warm-200/60 shrink-0">
                <button
                  onClick={() => markNotificationsReadByTarget(filterTargetId)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-navy-50 text-navy-600 text-sm font-medium hover:bg-navy-100 transition-colors"
                >
                  <CheckCheck size={14} />
                  将该人员通知标为已读
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
