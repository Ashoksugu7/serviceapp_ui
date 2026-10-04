import {
  Boxes,
  Building2,
  ClipboardList,
  Contact,
  LayoutDashboard,
  Package,
  RotateCcw,
  Settings2,
  Store,
  Truck,
  UserCog,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole } from './types'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  roles: UserRole[]
  // Hidden unless the company has at least one Out-Store-enabled profile.
  requiresOutStore?: boolean
}

export interface NavSection {
  title?: string
  items: NavItem[]
}

const COMPANY: UserRole[] = ['ADMIN', 'USER']

export const navSections: NavSection[] = [
  { items: [{ href: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'USER'] }] },
  {
    title: 'Transaction',
    items: [
      { href: '/service-entry', label: 'Service Entry', icon: ClipboardList, roles: COMPANY },
      { href: '/out-store', label: 'Out-Store Entry', icon: Truck, roles: COMPANY, requiresOutStore: true },
      { href: '/records', label: 'Records', icon: RotateCcw, roles: COMPANY },
      { href: '/standby', label: 'Stand-by', icon: Boxes, roles: COMPANY },
    ],
  },
  {
    title: 'Masters',
    items: [
      { href: '/masters/customers', label: 'Customers', icon: Contact, roles: COMPANY },
      { href: '/masters/staff', label: 'Staff', icon: UserCog, roles: COMPANY },
      { href: '/masters/products', label: 'Products & Services', icon: Package, roles: COMPANY },
      { href: '/masters/shops', label: 'Out-Store Shops', icon: Store, roles: COMPANY, requiresOutStore: true },
      { href: '/masters/standby-items', label: 'Stand-by Items', icon: Wrench, roles: COMPANY },
    ],
  },
  {
    title: 'Settings',
    items: [
      { href: '/settings/profiles', label: 'Service Profiles', icon: Settings2, roles: ['ADMIN'] },
      { href: '/admin/users', label: 'Users', icon: Users, roles: ['ADMIN'] },
    ],
  },
  {
    title: 'Platform',
    items: [{ href: '/admin/companies', label: 'Companies', icon: Building2, roles: ['SUPER_ADMIN'] }],
  },
]

export function visibleSections(role: UserRole, outStoreEnabled: boolean): NavSection[] {
  return navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(role) && (!item.requiresOutStore || outStoreEnabled)),
    }))
    .filter((section) => section.items.length > 0)
}

export function roleLabel(role: UserRole): string {
  return { SUPER_ADMIN: 'Super admin', ADMIN: 'Admin', USER: 'User' }[role]
}
