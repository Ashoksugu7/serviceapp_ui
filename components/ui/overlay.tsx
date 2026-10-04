'use client'

import clsx from 'clsx'
import { CheckCircle2, X, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Alert, Button } from './index'

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
}

/* ---------- Drawer: slide-over form panel ---------- */

export function Drawer({ open, title, description, onClose, onSubmit, onInput, noValidate, submitLabel = 'Save', submitting, error, children }: {
  open: boolean
  title: string
  description?: ReactNode
  onClose: () => void
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void
  /** Lets a form clear a field's message as soon as it is edited. */
  onInput?: (event: FormEvent<HTMLFormElement>) => void
  /** Skip the browser's own validation popups when the form shows its own messages (UI05). */
  noValidate?: boolean
  submitLabel?: string
  submitting?: boolean
  error?: string | null
  children: ReactNode
}) {
  useEscape(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button aria-label="Close" className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <form
        role="dialog"
        aria-modal="true"
        aria-label={title}
        noValidate={noValidate}
        onInput={onInput}
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit?.(event)
        }}
        className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {error && <Alert>{error}</Alert>}
          {children}
        </div>
        {onSubmit && (
          <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={submitting}>{submitLabel}</Button>
          </div>
        )}
      </form>
    </div>
  )
}

/* ---------- Confirm dialog ---------- */

export function ConfirmDialog({ open, title, message, confirmLabel, danger, busy, onConfirm, onClose }: {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  useEscape(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Close" className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div role="alertdialog" aria-modal="true" aria-label={title} className="relative w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <div className="mt-2 text-sm text-slate-600">{message}</div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            loading={busy}
            onClick={onConfirm}
            className={clsx(danger && 'bg-rose-600 hover:bg-rose-700')}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ---------- Toasts ---------- */

type Toast = { id: number; tone: 'success' | 'danger'; message: string }
const ToastContext = createContext<(message: string, tone?: Toast['tone']) => void>(() => undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)
  const notify = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = ++nextId.current
    setToasts((current) => [...current, { id, tone, message }])
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4000)
  }, [])
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-lg">
            {toast.tone === 'success'
              ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
              : <XCircle size={16} className="mt-0.5 shrink-0 text-rose-600" />}
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
