import clsx from 'clsx'
import { AlertCircle, CheckCircle2, Loader2, type LucideIcon } from 'lucide-react'
import { useId } from 'react'
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

// Class recipes copied from computer-services.html so every screen matches it.

/* ---------- Buttons ---------- */

const buttonVariants = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700',
  secondary: 'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'border border-rose-200 bg-white text-rose-600 hover:bg-rose-50',
}
const buttonSizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' }

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants
  size?: keyof typeof buttonSizes
  icon?: LucideIcon
  loading?: boolean
}

export function Button({ variant = 'primary', size = 'md', icon: Icon, loading, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : Icon && <Icon size={15} />}
      {children}
    </button>
  )
}

/* ---------- Form controls ---------- */

const controlBase =
  'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500 read-only:bg-slate-50'

export function controlClass(invalid?: boolean) {
  return clsx(controlBase, invalid ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-300 focus:border-brand-500 focus:ring-brand-100')
}

export function Input({ className, invalid, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={clsx(controlClass(invalid), className)} aria-invalid={invalid || undefined} {...props} />
}

export function Select({ className, invalid, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return <select className={clsx(controlClass(invalid), className)} aria-invalid={invalid || undefined} {...props} />
}

export function Textarea({ className, invalid, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea rows={3} className={clsx(controlClass(invalid), className)} aria-invalid={invalid || undefined} {...props} />
}

// Wraps a control with its label. Use `group` for sets of buttons, chips or
// switches, which must not sit inside a <label>.
export function Field({ label, required, error, hint, group, className, children }: {
  label: ReactNode
  required?: boolean
  error?: string
  hint?: ReactNode
  group?: boolean
  className?: string
  children: ReactNode
}) {
  const labelId = useId()
  const Wrapper = group ? 'div' : 'label'
  return (
    <Wrapper className={clsx('flex flex-col gap-1.5', className)} {...(group ? { role: 'group', 'aria-labelledby': labelId } : {})}>
      <span id={labelId} className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-brand-600">*</span>}
      </span>
      {children}
      {error ? <span className="text-xs text-rose-600">{error}</span> : hint && <span className="text-xs text-slate-400">{hint}</span>}
    </Wrapper>
  )
}

export function Checkbox({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={clsx('flex w-fit items-start gap-2 text-sm text-slate-700', className)}>
      <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-brand-600" {...props} />
      {label}
    </label>
  )
}

/* ---------- Layout ---------- */

export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow: string
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-brand-600">{eyebrow}</div>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  // Clips content to the rounded corners unless the caller sets its own overflow (e.g. for dropdowns).
  return <div className={clsx('rounded-xl border border-slate-200 bg-white shadow-sm', !className?.includes('overflow-') && 'overflow-hidden', className)}>{children}</div>
}

export function CardHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      {actions}
    </div>
  )
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('p-5 sm:p-6', className)}>{children}</div>
}

/* ---------- Tabs and chips ---------- */

export function SegmentedTabs<T extends string>({ items, value, onChange }: {
  items: { value: T; label: string; icon?: LucideIcon }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div role="tablist" className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      {items.map(({ value: itemValue, label, icon: Icon }) => (
        <button
          key={itemValue}
          type="button"
          role="tab"
          aria-selected={itemValue === value}
          onClick={() => onChange(itemValue)}
          className={clsx(
            'flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition',
            itemValue === value ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50',
          )}
        >
          {Icon && <Icon size={15} />}
          {label}
        </button>
      ))}
    </div>
  )
}

export function Chip({ active, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={clsx(
        'rounded-full border px-2.5 py-1 text-xs font-medium transition',
        active ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50',
        className,
      )}
      {...props}
    />
  )
}

const badgeTones = {
  neutral: 'border-slate-200 bg-slate-50 text-slate-600',
  brand: 'border-teal-200 bg-teal-50 text-teal-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-rose-200 bg-rose-50 text-rose-600',
}

export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof badgeTones; children: ReactNode }) {
  return <span className={clsx('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', badgeTones[tone])}>{children}</span>
}

/* ---------- Tables ---------- */

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  )
}

export function Th({ className, children }: { className?: string; children?: ReactNode }) {
  return <th className={clsx('border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500', className)}>{children}</th>
}

export function Td({ className, children }: { className?: string; children?: ReactNode }) {
  return <td className={clsx('border-b border-slate-100 px-4 py-3 text-slate-700', className)}>{children}</td>
}

/* ---------- Feedback ---------- */

export function Alert({ tone = 'danger', children }: { tone?: 'danger' | 'success'; children: ReactNode }) {
  const Icon = tone === 'danger' ? AlertCircle : CheckCircle2
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={clsx(
        'flex items-start gap-2 rounded-lg border px-3.5 py-2.5 text-sm',
        tone === 'danger' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700',
      )}
    >
      <Icon size={16} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }: {
  icon: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon size={20} />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-slate-800">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-md bg-slate-200/70', className)} />
}

export function StatTile({ label, value, icon: Icon, tone = 'neutral' }: {
  label: string
  value: ReactNode
  icon?: LucideIcon
  tone?: 'neutral' | 'brand' | 'warning'
}) {
  const iconTone = { neutral: 'bg-slate-100 text-slate-500', brand: 'bg-teal-50 text-teal-600', warning: 'bg-amber-50 text-amber-600' }[tone]
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        {Icon && (
          <span className={clsx('flex h-7 w-7 items-center justify-center rounded-lg', iconTone)}>
            <Icon size={15} />
          </span>
        )}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  )
}
