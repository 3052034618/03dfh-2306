import { NavLink, Outlet } from 'react-router-dom'
import { Calendar, LayoutGrid, Users, Package, BarChart3, Bell } from 'lucide-react'
import { useStore } from '@/store'

const navItems = [
  { to: '/calendar', icon: Calendar, label: '排班日历' },
  { to: '/rooms', icon: LayoutGrid, label: '房间看板' },
  { to: '/staff', icon: Users, label: '人员状态' },
  { to: '/consumables', icon: Package, label: '耗材预警' },
  { to: '/review', icon: BarChart3, label: '复盘统计' },
]

export default function Layout() {
  const notifications = useStore((s) => s.notifications)
  const unreadCount = notifications.filter((n) => !n.read).length

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
          <div className="sidebar-link sidebar-link-inactive relative">
            <Bell size={18} />
            <span>通知中心</span>
            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 bg-coral-400 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
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
    </div>
  )
}
