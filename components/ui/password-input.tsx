'use client'

import clsx from 'clsx'
import { Check, Eye, EyeOff } from 'lucide-react'
import { useState, type InputHTMLAttributes } from 'react'
import { passwordChecks, passwordProblem } from '@/lib/password'
import { controlClass } from './index'

// Password field with a show/hide button. With `rules`, it shows the password
// rule as a checklist and blocks submitting until the rule is met.
export function PasswordInput({ rules, invalid, className, onChange, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  rules?: boolean
  invalid?: boolean
}) {
  const [visible, setVisible] = useState(false)
  const [value, setValue] = useState('')
  const checks = passwordChecks(value)

  return (
    <>
      <div className="relative">
        <input
          {...props}
          type={visible ? 'text' : 'password'}
          aria-invalid={invalid || undefined}
          className={clsx(controlClass(invalid), 'pr-10', className)}
          onChange={(event) => {
            setValue(event.target.value)
            // An empty optional field is fine; otherwise the rule must be met.
            event.target.setCustomValidity(rules && event.target.value ? passwordProblem(event.target.value) ?? '' : '')
            onChange?.(event)
          }}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {rules && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Password rule">
          {checks.map((check) => (
            <li key={check.label} className={clsx('inline-flex items-center gap-1 text-xs', check.ok ? 'text-emerald-600' : 'text-slate-400')}>
              <Check size={12} className={check.ok ? 'opacity-100' : 'opacity-30'} />
              {check.label}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
