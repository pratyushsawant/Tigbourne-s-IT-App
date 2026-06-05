import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Logo } from '../../components/Logo'
import { IChart, IClose, IGear, IGlobe, ILayers, ILogout, IMenu, INews, IShield, IUpgrade } from '../../components/icons'

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')
}

export default function AppLayout() {
  const { user, signOut, can } = useAuth()
  const nav = useNavigate()
  const [menu, setMenu] = useState(false)
  const [mobile, setMobile] = useState(false)

  const tab = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
      isActive ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:bg-black/[0.04] hover:text-ink'
    }`

  const mtab = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
      isActive ? 'bg-ink text-white' : 'text-ink-soft hover:bg-black/[0.04]'
    }`

  const navItems = (
    cls: typeof tab,
    onClick?: () => void,
  ) => (
    <>
      <NavLink to="/app" end className={cls} onClick={onClick}>
        <ILayers className="h-4 w-4" />
        Dashboard
      </NavLink>
      <NavLink to="/app/explorer" className={cls} onClick={onClick}>
        <IGlobe className="h-4 w-4" />
        Field Explorer
      </NavLink>
      <NavLink to="/app/analytics" className={cls} onClick={onClick}>
        <IChart className="h-4 w-4" />
        Analytics
      </NavLink>
      <NavLink to="/app/news" className={cls} onClick={onClick}>
        <INews className="h-4 w-4" />
        News
      </NavLink>
      {can('dataIntegrity') && (
        <NavLink to="/app/integrity" className={cls} onClick={onClick}>
          <IShield className="h-4 w-4" />
          Data Integrity
        </NavLink>
      )}
    </>
  )

  return (
    <div className="flex min-h-screen flex-col bg-[#fafafa]">
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <button
              onClick={() => setMobile(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition hover:bg-black/[0.04] sm:hidden"
              aria-label="Open menu"
            >
              <IMenu className="h-5 w-5" />
            </button>
            <NavLink to="/app">
              <Logo />
            </NavLink>
            <nav className="hidden items-center gap-1 sm:flex">{navItems(tab)}</nav>
          </div>

          <div className="relative">
            <button
              onClick={() => setMenu((m) => !m)}
              className="flex items-center gap-3 rounded-full border border-black/[0.07] bg-white py-1.5 pl-1.5 pr-3 transition hover:border-gold-300"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-xs font-bold text-white">
                {initials(user?.name || 'A')}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-xs font-semibold leading-tight text-ink">{user?.name}</span>
                <span className="block text-[11px] leading-tight text-ink-faint">{user?.org}</span>
              </span>
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                <div className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-float animate-fade-up">
                  <div className="border-b border-black/[0.06] p-4">
                    <p className="text-sm font-semibold text-ink">{user?.name}</p>
                    <p className="text-xs text-ink-faint">{user?.email}</p>
                    <span className="mt-2 inline-block rounded-full bg-gold-50 px-2.5 py-0.5 text-[11px] font-semibold text-gold-700">
                      {user?.tier} tier
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setMenu(false)
                      nav('/app/settings')
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-ink-soft transition hover:bg-black/[0.03]"
                  >
                    <IGear className="h-4 w-4" />
                    Settings
                  </button>
                  {user?.tier !== 'Enterprise' && (
                    <button
                      onClick={() => {
                        setMenu(false)
                        nav('/pricing')
                      }}
                      className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-gold-700 transition hover:bg-gold-50"
                    >
                      <IUpgrade className="h-4 w-4" />
                      Upgrade plan
                    </button>
                  )}
                  <button
                    onClick={() => {
                      signOut()
                      nav('/')
                    }}
                    className="flex w-full items-center gap-2 border-t border-black/[0.06] px-4 py-3 text-sm font-medium text-ink-soft transition hover:bg-black/[0.03]"
                  >
                    <ILogout className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobile && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={() => setMobile(false)} />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[80%] bg-white p-4 shadow-float animate-fade-up">
            <div className="flex items-center justify-between px-2 py-2">
              <Logo />
              <button onClick={() => setMobile(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-black/[0.04]" aria-label="Close menu">
                <IClose className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-3 flex flex-col gap-1">{navItems(mtab, () => setMobile(false))}</nav>
          </div>
        </div>
      )}

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
