import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Database,
  LogOut,
  Droplets,
} from 'lucide-react'

export default function Sidebar() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('tc_user')
    navigate('/login')
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
      isActive
        ? 'bg-surface-3 text-accent-bright border-r-2 border-accent'
        : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
    }`

  return (
    <aside className="w-56 bg-surface-1 border-r border-border flex flex-col h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <Droplets size={22} className="text-accent" />
          <div>
            <div className="text-sm font-semibold text-text-primary tracking-tight">
              Tigbourne Capital
            </div>
            <div className="text-[10px] text-text-muted uppercase tracking-widest mt-0.5">
              Oil Field Data
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 flex flex-col gap-0.5">
        <NavLink to="/" end className={linkClass}>
          <LayoutDashboard size={16} />
          Dashboard
        </NavLink>
        <NavLink to="/explorer" className={linkClass}>
          <Database size={16} />
          Field Explorer
        </NavLink>
      </nav>

      {/* User / Logout */}
      <div className="border-t border-border p-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-red transition-colors w-full cursor-pointer"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
