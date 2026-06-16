import { NavLink, Outlet } from 'react-router-dom'
import { Archive, DollarSign, LogOut, Menu, Settings, Users, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/button'
import { cn } from '../ui/utils'

export function AppLayout() {
  const { profile, signOut, isSuperAdmin } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = [
    { to: '/inventory', label: 'نظام الجرد', icon: Archive },
    ...(isSuperAdmin
      ? [
          { to: '/salary', label: 'إدارة المرتبات', icon: DollarSign },
          { to: '/admin/users', label: 'إدارة المستخدمين', icon: Users },
        ]
      : []),
    { to: '/settings', label: 'الإعدادات', icon: Settings },
  ]

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      <button
        className="fixed left-4 top-4 z-50 rounded-lg bg-blue-600 p-2 text-white md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-40 flex w-64 flex-col bg-blue-800 p-4 text-white transition-transform md:static md:translate-x-0',
          mobileOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        )}
      >
        <div className="mb-8 flex flex-col items-center">
          <img
            src="/logo.jpg"
            alt="MR Marvel Logo"
            className="h-20 w-20 rounded-full border-4 border-white object-cover"
          />
          <p className="mt-3 text-center text-sm text-blue-100">{profile?.full_name}</p>
          <span className="mt-1 rounded-full bg-blue-700 px-3 py-0.5 text-xs">
            {isSuperAdmin ? 'مدير عام' : 'موظف'}
          </span>
        </div>

        <nav className="mb-8 space-y-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                  isActive ? 'bg-blue-600 text-white' : 'text-blue-100 hover:bg-blue-700'
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-blue-700 pt-4">
          <Button variant="destructive" className="w-full" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <main className="flex-1 overflow-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  )
}
