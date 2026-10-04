'use client'

import clsx from 'clsx'
import { ChevronRight, KeyRound, LogOut, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { roleLabel, visibleSections } from '@/lib/nav'
import type { Identity } from '@/lib/types'
import { IdentityProvider } from './identity'

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
}

export function AppShell({ identity, outStoreEnabled, children }: {
  identity: Identity
  outStoreEnabled: boolean
  children: ReactNode
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const sections = visibleSections(identity.user.role, outStoreEnabled)

  async function signOut() {
    setSigningOut(true)
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    // Full reload so no cached data from this session survives sign-out.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/login')
  }

  return (
    <IdentityProvider identity={identity}>
      <div className="flex min-h-screen bg-slate-50 text-slate-900">
        {open && <button aria-label="Close navigation" className="fixed inset-0 z-20 bg-slate-900/30 sm:hidden" onClick={() => setOpen(false)} />}

        <aside
          className={clsx(
            'fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform sm:sticky sm:top-0 sm:h-screen sm:translate-x-0',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">S3</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold leading-tight text-slate-900">ServiceOps360</div>
              <div className="truncate text-xs leading-tight text-slate-500">{identity.company?.name ?? 'Platform administration'}</div>
            </div>
            <button className="text-slate-400 sm:hidden" aria-label="Close navigation" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-4">
            {sections.map((section, index) => (
              <div key={section.title ?? index} className={clsx(index > 0 && 'mt-3')}>
                {section.title && <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">{section.title}</div>}
                {section.items.map(({ href, label, icon: Icon }) => {
                  const active = isActive(pathname, href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setOpen(false)}
                      className={clsx(
                        'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition',
                        active ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Icon size={16} />
                        {label}
                      </span>
                      {active && <ChevronRight size={14} />}
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>

          <div className="border-t border-slate-200 p-3">
            <div className="flex items-center gap-3 rounded-lg px-2 py-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                {initials(identity.user.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-800">{identity.user.name}</div>
                <div className="truncate text-xs text-slate-500">{roleLabel(identity.user.role)}</div>
              </div>
              <Link
                href="/change-password"
                title="Change password"
                aria-label="Change password"
                className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <KeyRound size={16} />
              </Link>
              <button
                onClick={signOut}
                disabled={signingOut}
                title="Sign out"
                aria-label="Sign out"
                className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3 sm:hidden">
            <button className="text-slate-600" aria-label="Open navigation" onClick={() => setOpen(true)}>
              <Menu size={20} />
            </button>
            <span className="text-sm font-semibold">ServiceOps360</span>
            <span className="w-5" />
          </header>
          <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">{children}</main>
        </div>
      </div>
    </IdentityProvider>
  )
}
