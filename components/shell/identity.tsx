'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Identity } from '@/lib/types'

const IdentityContext = createContext<Identity | null>(null)

export function IdentityProvider({ identity, children }: { identity: Identity; children: ReactNode }) {
  return <IdentityContext.Provider value={identity}>{children}</IdentityContext.Provider>
}

export function useIdentity(): Identity {
  const identity = useContext(IdentityContext)
  if (!identity) throw new Error('useIdentity must be used inside the app shell')
  return identity
}

// Company-scoped screens need the signed-in company; SUPER_ADMIN has none.
export function useCompanyId(): string | null {
  return useIdentity().company?.id ?? null
}
