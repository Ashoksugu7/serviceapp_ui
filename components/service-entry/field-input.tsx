'use client'

import clsx from 'clsx'
import { Calculator } from 'lucide-react'
import { Checkbox, Chip, Field, Input, Select, Textarea, controlClass } from '@/components/ui'
import { addDays, localToday, QUICK_PICKS } from '@/lib/dates'
import { formatAmount } from '@/lib/format'
import { formulaOf, type ToggleDate } from '@/lib/forms/form-values'
import type { Charge, Product, ProfileField, Staff } from '@/lib/types'

export type EntryOptions = { products: Product[]; charges: Charge[]; staff: Staff[] }

type Props = {
  field: ProfileField
  value: unknown
  calculated?: number | null
  error?: string
  options: EntryOptions
  // Current linked labels from a saved record, so inactive selections stay visible when editing.
  linked?: { id: string; label: string; selectable: boolean }[]
  onChange: (value: unknown) => void
}

// Controls made of several buttons (chips, switches) are labelled as a group.
function isGroupField(field: ProfileField): boolean {
  const { config } = field
  return field.type === 'checkbox' || field.type === 'linked_charges' || (field.type === 'choice' && (config.multiple === true || config.buttons === true)) || (field.type === 'date' && config.toggle_based === true)
}

// Multi-line text and multi-select controls take the full row of the form grid.
export function isWideField(field: ProfileField): boolean {
  return (field.type === 'text' && field.config.multiline === true) || field.type === 'linked_charges' || (field.type === 'choice' && field.config.multiple === true)
}

export function DynamicFieldInput({ field, value, calculated, error, options, linked, onChange }: Props) {
  return (
    <Field label={field.label} required={field.required && !formulaOf(field)} error={error} group={isGroupField(field)} className={clsx(isWideField(field) && 'sm:col-span-2')}>
      <Control field={field} value={value} calculated={calculated} error={error} options={options} linked={linked} onChange={onChange} />
    </Field>
  )
}

function Control({ field, value, calculated, error, options, linked = [], onChange }: Props) {
  const invalid = !!error
  const { config } = field
  const inactive = (ids: string[]) =>
    linked.filter((item) => ids.includes(item.id)).map((item) => ({ id: item.id, label: `${item.label} (inactive)` }))

  switch (field.type) {
    case 'text': {
      const text = typeof value === 'string' ? value : ''
      const maxLength = typeof config.max_length === 'number' ? config.max_length : 4000
      if (config.multiline) {
        return (
          <>
            <Textarea
              rows={5}
              value={text}
              maxLength={maxLength}
              invalid={invalid}
              placeholder={field.label}
              className="min-h-32 resize-y leading-relaxed"
              onChange={(event) => onChange(event.target.value)}
            />
            <CharacterCount length={text.length} max={maxLength} />
          </>
        )
      }
      const type = config.format === 'phone' ? 'tel' : config.format === 'email' ? 'email' : 'text'
      return (
        <>
          <Input type={type} value={text} maxLength={maxLength} invalid={invalid} onChange={(event) => onChange(event.target.value)} />
          {maxLength < 4000 && <CharacterCount length={text.length} max={maxLength} />}
        </>
      )
    }

    case 'number': {
      if (formulaOf(field)) {
        return (
          <div className={clsx(controlClass(), 'flex items-center justify-between bg-slate-50 tabular-nums text-slate-700')} aria-live="polite">
            <span>{calculated === null || calculated === undefined ? '—' : config.currency ? formatAmount(calculated) : calculated}</span>
            <Calculator size={14} className="text-slate-400" aria-label="Calculated" />
          </div>
        )
      }
      const input = (
        <Input
          type="number"
          inputMode="decimal"
          step="0.01"
          min={config.currency ? 0 : undefined}
          value={value === undefined || value === null ? '' : String(value)}
          invalid={invalid}
          className={clsx(config.currency === true && 'pl-7', 'tabular-nums')}
          onChange={(event) => onChange(event.target.value)}
        />
      )
      return config.currency ? (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₹</span>
          {input}
        </div>
      ) : input
    }

    case 'date': {
      if (config.toggle_based) {
        const toggle = (value as ToggleDate | undefined) ?? { on: false, date: null }
        return (
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={toggle.on}
              aria-label={`${field.label} on`}
              onClick={() => onChange(toggle.on ? { on: false, date: null } : { on: true, date: toggle.date ?? addDays(localToday(), 7) })}
              className={clsx('relative h-6 w-11 shrink-0 rounded-full transition', toggle.on ? 'bg-brand-600' : 'bg-slate-300')}
            >
              <span className={clsx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', toggle.on ? 'left-5' : 'left-0.5')} />
            </button>
            {toggle.on
              ? <Input type="date" required value={toggle.date ?? ''} invalid={invalid} onChange={(event) => onChange({ on: true, date: event.target.value || null })} />
              : <span className="text-sm text-slate-400">Off</span>}
          </div>
        )
      }
      const date = typeof value === 'string' ? value : ''
      return (
        <>
          <Input type="date" value={date} invalid={invalid} onChange={(event) => onChange(event.target.value)} />
          {config.quick_pick === true && (
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PICKS.map(({ label, days }) => {
                const pick = addDays(localToday(), days)
                return <Chip key={label} active={date === pick} onClick={() => onChange(pick)}>{label}</Chip>
              })}
            </div>
          )}
        </>
      )
    }

    case 'choice': {
      const choices = (config.options as string[] | undefined) ?? []
      if (config.multiple) {
        const selected = Array.isArray(value) ? (value as string[]) : []
        return (
          <div className="flex flex-wrap gap-1.5">
            {choices.map((choice) => (
              <Chip
                key={choice}
                active={selected.includes(choice)}
                aria-pressed={selected.includes(choice)}
                onClick={() => onChange(selected.includes(choice) ? selected.filter((item) => item !== choice) : [...selected, choice])}
              >
                {choice}
              </Chip>
            ))}
          </div>
        )
      }
      if (config.buttons) {
        return (
          <div role="radiogroup" aria-label={field.label} className="flex flex-wrap gap-1.5">
            {choices.map((choice) => (
              <button
                key={choice}
                type="button"
                role="radio"
                aria-checked={value === choice}
                onClick={() => onChange(value === choice && !field.required ? '' : choice)}
                className={clsx(
                  'rounded-lg border px-3 py-1.5 text-sm font-medium transition',
                  value === choice ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
                )}
              >
                {choice}
              </button>
            ))}
          </div>
        )
      }
      return (
        <Select value={typeof value === 'string' ? value : ''} invalid={invalid} onChange={(event) => onChange(event.target.value)}>
          <option value="">Select…</option>
          {choices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}
        </Select>
      )
    }

    case 'checkbox':
      return <Checkbox label="Yes" checked={value === true} onChange={(event) => onChange(event.target.checked)} />

    case 'linked_product': {
      const products = options.products.filter((product) => product.profile_id === field.profile_id && product.status === 'ACTIVE')
      return (
        <Select value={typeof value === 'string' ? value : ''} invalid={invalid} onChange={(event) => onChange(event.target.value)}>
          <option value="">{products.length ? 'Select product' : 'No products for this profile'}</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>{product.brand ? `${product.name} · ${product.brand}` : product.name}</option>
          ))}
          {typeof value === 'string' && value && !products.some((product) => product.id === value) &&
            inactive([value]).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </Select>
      )
    }

    case 'linked_charges': {
      const charges = options.charges.filter((charge) => charge.profile_id === field.profile_id && charge.status === 'ACTIVE')
      const selected = Array.isArray(value) ? (value as string[]) : []
      const retired = inactive(selected.filter((id) => !charges.some((charge) => charge.id === id)))
      if (charges.length === 0 && retired.length === 0) return <p className="text-sm text-slate-400">No services for this profile.</p>
      return (
        <div className="flex flex-wrap gap-1.5">
          {retired.map((item) => (
            <Chip key={item.id} active aria-pressed onClick={() => onChange(selected.filter((id) => id !== item.id))}>{item.label}</Chip>
          ))}
          {charges.map((charge) => (
            <Chip
              key={charge.id}
              active={selected.includes(charge.id)}
              aria-pressed={selected.includes(charge.id)}
              title={charge.description ?? undefined}
              onClick={() => onChange(selected.includes(charge.id) ? selected.filter((id) => id !== charge.id) : [...selected, charge.id])}
            >
              {charge.name}
            </Chip>
          ))}
        </div>
      )
    }

    case 'staff_role': {
      const roleId = String(config.role_id ?? '')
      const staff = options.staff.filter((member) => member.status === 'ACTIVE' && member.role_ids.includes(roleId))
      return (
        <Select value={typeof value === 'string' ? value : ''} invalid={invalid} onChange={(event) => onChange(event.target.value)}>
          <option value="">{staff.length ? 'Select staff' : 'No staff with this role'}</option>
          {staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
          {typeof value === 'string' && value && !staff.some((member) => member.id === value) &&
            inactive([value]).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </Select>
      )
    }
  }
}

// Shows how much of the limit is used; turns amber near the end.
function CharacterCount({ length, max }: { length: number; max: number }) {
  if (length === 0 && max >= 4000) return null
  return (
    <span className={clsx('self-end text-[11px] tabular-nums', length >= max * 0.9 ? 'text-amber-600' : 'text-slate-400')}>
      {length.toLocaleString()} / {max.toLocaleString()}
    </span>
  )
}
