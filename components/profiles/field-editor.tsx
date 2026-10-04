'use client'

import clsx from 'clsx'
import { Lock, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { useState, type KeyboardEvent } from 'react'
import { Checkbox, Field, Input, Select } from '@/components/ui'
import { Drawer } from '@/components/ui/overlay'
import { formError } from '@/lib/api-client'
import { fieldErrors } from '@/lib/queries'
import type { FormDefinition, ProfileField } from '@/lib/types'
import { defaultConfig, fieldType, fieldTypes, formulaOps, KEY_PATTERN, keyFromLabel, type FieldType } from './field-types'

type Config = Record<string, unknown>

const MAX_TEXT_LENGTH = 4000
const LONG_TEXT_LABEL = /desc|remark|note|comment|complaint|detail|address|problem|issue/i
export type FieldDraft = { key: string; label: string; type: FieldType; required: boolean; enabled: boolean; config: Config }

// Drawer that edits one dynamic field with a form per type, replacing the
// raw JSON configuration box of the old UI.
export function FieldEditor({ open, field, prefix, numberFields, staffRoles, saving, error, onClose, onSave }: {
  open: boolean
  field: ProfileField | null
  prefix: string
  numberFields: ProfileField[]
  staffRoles: FormDefinition['staff_roles']
  saving: boolean
  error: unknown
  onClose: () => void
  onSave: (draft: FieldDraft) => void
}) {
  if (!open) return null
  // Keyed so the draft resets whenever a different field is opened.
  return (
    <FieldEditorForm
      key={field?.id ?? 'new'}
      field={field}
      prefix={prefix}
      numberFields={numberFields}
      staffRoles={staffRoles}
      saving={saving}
      error={error}
      onClose={onClose}
      onSave={onSave}
    />
  )
}

function FieldEditorForm({ field, prefix, numberFields, staffRoles, saving, error, onClose, onSave }: Omit<Parameters<typeof FieldEditor>[0], 'open'>) {
  const [draft, setDraft] = useState<FieldDraft>(() =>
    field
      ? { key: field.key, label: field.label, type: field.type, required: field.required, enabled: field.enabled, config: { ...defaultConfig[field.type], ...field.config } }
      : { key: '', label: '', type: 'text', required: false, enabled: true, config: { ...defaultConfig.text } },
  )
  const [keyEdited, setKeyEdited] = useState(false)
  const [sizeChosen, setSizeChosen] = useState(false)
  const errors = fieldErrors(error)
  const locked = field?.is_system ?? false
  const set = (patch: Partial<FieldDraft>) => setDraft((current) => ({ ...current, ...patch }))
  const setConfig = (patch: Config) => setDraft((current) => ({ ...current, config: { ...current.config, ...patch } }))

  return (
    <Drawer
      open
      title={field ? `Edit ${field.label}` : 'Add field'}
      description={field ? <span className="font-mono">{field.key}</span> : 'New fields appear at the end of the Service Entry form.'}
      onClose={onClose}
      onSubmit={() => onSave(draft)}
      submitLabel={field ? 'Save field' : 'Add field'}
      submitting={saving}
      error={formError(error)}
    >
      <Field label="Label" required error={errors.label}>
        <Input
          required
          maxLength={200}
          value={draft.label}
          invalid={!!errors.label}
          onChange={(event) => {
            const label = event.target.value
            const patch: Partial<FieldDraft> = field || keyEdited ? { label } : { label, key: keyFromLabel(label, prefix) }
            // New text fields that sound like free text start as a long box.
            if (!field && !sizeChosen && draft.type === 'text') patch.config = { ...draft.config, multiline: LONG_TEXT_LABEL.test(label) }
            set(patch)
          }}
        />
      </Field>

      {!field && (
        <Field label="Key" required error={errors.key} hint="Stored with every record. It cannot be changed later.">
          <Input
            required
            pattern={KEY_PATTERN}
            className="font-mono"
            value={draft.key}
            invalid={!!errors.key}
            onChange={(event) => { setKeyEdited(true); set({ key: event.target.value.toLowerCase() }) }}
          />
        </Field>
      )}

      <fieldset>
        <legend className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Type {locked && <Lock size={12} className="text-slate-400" />}
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {fieldTypes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              disabled={locked}
              onClick={() => set({ type: value, config: { ...defaultConfig[value] } })}
              className={clsx(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-60',
                draft.type === value ? 'border-brand-500 bg-brand-50 font-medium text-brand-700 ring-1 ring-brand-500' : 'border-slate-200 text-slate-600 hover:bg-slate-50',
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {locked ? 'Built-in fields keep their type.' : fieldType(draft.type).hint}
          {field && !locked && ' The type can only change before the profile has records.'}
        </p>
        {errors.type && <p className="mt-1 text-xs text-rose-600">{errors.type}</p>}
      </fieldset>

      <TypeConfig
        draft={draft}
        field={field}
        numberFields={numberFields}
        staffRoles={staffRoles}
        setConfig={(patch) => { if ('multiline' in patch) setSizeChosen(true); setConfig(patch) }}
        error={errors.config}
      />

      <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 pt-4">
        <Checkbox label="Required" checked={draft.required} onChange={(event) => set({ required: event.target.checked })} />
        <Checkbox
          label="Shown on Service Entry"
          checked={draft.enabled}
          disabled={locked}
          onChange={(event) => set({ enabled: event.target.checked })}
        />
      </div>
      {!draft.enabled && <p className="text-xs text-slate-500">Hidden fields keep their saved values on existing records, shown read-only.</p>}
    </Drawer>
  )
}

function TypeConfig({ draft, field, numberFields, staffRoles, setConfig, error }: {
  draft: FieldDraft
  field: ProfileField | null
  numberFields: ProfileField[]
  staffRoles: FormDefinition['staff_roles']
  setConfig: (patch: Config) => void
  error?: string
}) {
  const { config } = draft
  const errorLine = error && <p className="text-xs text-rose-600">{error}</p>

  switch (draft.type) {
    case 'text': {
      const long = config.multiline === true
      const sizes = [
        { multiline: false, label: 'Short', hint: 'One line, e.g. Serial No' },
        { multiline: true, label: 'Long', hint: 'A larger box, e.g. Description' },
      ]
      return (
        <div className="space-y-3">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Size</legend>
            <div className="grid grid-cols-2 gap-2">
              {sizes.map((size) => (
                <button
                  key={size.label}
                  type="button"
                  aria-pressed={long === size.multiline}
                  onClick={() => setConfig({ multiline: size.multiline, ...(size.multiline ? { format: 'plain' } : {}) })}
                  className={clsx(
                    'rounded-lg border px-3 py-2 text-left transition',
                    long === size.multiline ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-slate-200 hover:bg-slate-50',
                  )}
                >
                  <span className={clsx('block text-sm font-medium', long === size.multiline ? 'text-brand-700' : 'text-slate-700')}>{size.label}</span>
                  <span className="block text-xs text-slate-500">{size.hint}</span>
                </button>
              ))}
            </div>
          </fieldset>
          {!long && (
            <Field label="Format">
              <Select value={String(config.format ?? 'plain')} onChange={(event) => setConfig({ format: event.target.value })}>
                <option value="plain">Plain text</option>
                <option value="phone">Phone number</option>
                <option value="email">Email address</option>
              </Select>
            </Field>
          )}
          <Field label="Character limit" hint={`Leave empty for the maximum of ${MAX_TEXT_LENGTH} characters.`}>
            <Input
              type="number"
              min={1}
              max={MAX_TEXT_LENGTH}
              placeholder={String(MAX_TEXT_LENGTH)}
              value={config.max_length === undefined ? '' : String(config.max_length)}
              onChange={(event) => setConfig({ max_length: event.target.value === '' ? undefined : Math.min(MAX_TEXT_LENGTH, Number(event.target.value)) })}
            />
          </Field>
          {errorLine}
        </div>
      )
    }

    case 'number': {
      const formula = config.formula as { a: string; op: string; b: string } | null | undefined
      const candidates = numberFields.filter((item) => item.key !== field?.key)
      return (
        <div className="space-y-3">
          <Checkbox label="Show as currency" checked={config.currency === true} onChange={(event) => setConfig({ currency: event.target.checked })} />
          <Checkbox
            label="Calculate from other fields"
            checked={!!formula}
            disabled={candidates.length === 0}
            onChange={(event) => setConfig({ formula: event.target.checked ? { a: candidates[0]?.key ?? '', op: '-', b: candidates[1]?.key ?? candidates[0]?.key ?? '' } : null })}
          />
          {candidates.length === 0 && <p className="text-xs text-slate-400">Add at least one other number field to calculate from.</p>}
          {formula && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="grid grid-cols-[4.5rem_1fr] items-center gap-2 text-xs text-slate-500">
                <span>Value</span>
                <Select aria-label="First field" value={formula.a} onChange={(event) => setConfig({ formula: { ...formula, a: event.target.value } })}>
                  {candidates.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                </Select>
                <span>Operation</span>
                <Select aria-label="Operator" value={formula.op} onChange={(event) => setConfig({ formula: { ...formula, op: event.target.value } })}>
                  {formulaOps.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                </Select>
                <span>Value</span>
                <Select aria-label="Second field" value={formula.b} onChange={(event) => setConfig({ formula: { ...formula, b: event.target.value } })}>
                  {candidates.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                </Select>
              </div>
              <p className="mt-2 text-xs text-slate-500">Calculated on save and read-only on Service Entry. Empty optional fields count as 0.</p>
            </div>
          )}
          {errorLine}
        </div>
      )
    }

    case 'date': {
      const mode = config.quick_pick ? 'quick' : config.toggle_based ? 'toggle' : 'plain'
      const modes = [
        { value: 'plain', label: 'Plain date', hint: 'A standard date picker.' },
        { value: 'quick', label: 'Quick pick', hint: 'Adds Today, +3, +7 and +14 day chips.' },
        { value: 'toggle', label: 'On / off', hint: 'A switch with a date, e.g. a reminder.' },
      ]
      return (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Date input</legend>
          {modes.map((item) => (
            <label key={item.value} className={clsx('flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5', mode === item.value ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50')}>
              <input
                type="radio"
                name="date-mode"
                className="mt-0.5 accent-brand-600"
                checked={mode === item.value}
                onChange={() => setConfig({ quick_pick: item.value === 'quick', toggle_based: item.value === 'toggle' })}
              />
              <span>
                <span className="block text-sm font-medium text-slate-800">{item.label}</span>
                <span className="block text-xs text-slate-500">{item.hint}</span>
              </span>
            </label>
          ))}
          {errorLine}
        </fieldset>
      )
    }

    case 'choice':
      return <ChoiceConfig config={config} setConfig={setConfig} error={error} />

    case 'staff_role':
      // New companies start without staff roles (T30); point admins to where they are created.
      if (staffRoles.length === 0) {
        return (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            No staff roles yet. Add a role such as &ldquo;Service Engineer&rdquo; under{' '}
            <Link href="/masters/staff" className="font-medium underline">Masters → Staff</Link>, then come back to this field.
          </p>
        )
      }
      return (
        <Field label="Staff role" required error={error} hint="Only active staff with this role can be picked.">
          <Select required value={String(config.role_id ?? '')} onChange={(event) => setConfig({ role_id: event.target.value })} invalid={!!error}>
            <option value="" disabled>Select role</option>
            {staffRoles.map((role) => <option key={role.id} value={role.id}>{role.name}{role.is_system ? ' (built-in)' : ''}</option>)}
          </Select>
        </Field>
      )

    default:
      return error ? errorLine : null
  }
}

function ChoiceConfig({ config, setConfig, error }: { config: Config; setConfig: (patch: Config) => void; error?: string }) {
  const options = (config.options as string[] | undefined) ?? []
  const [text, setText] = useState('')
  const multiple = config.multiple === true

  function add() {
    const value = text.trim()
    if (!value || options.includes(value)) return
    setConfig({ options: [...options, value] })
    setText('')
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      add()
    }
  }

  return (
    <div className="space-y-3">
      <Field label="Options" required error={error}>
        <div className="flex gap-2">
          <Input value={text} maxLength={200} onChange={(event) => setText(event.target.value)} onKeyDown={onKeyDown} placeholder="Type an option and press Enter" />
          <button type="button" onClick={add} aria-label="Add option" className="rounded-lg border border-slate-300 px-3 text-slate-600 hover:bg-slate-50">
            <Plus size={15} />
          </button>
        </div>
      </Field>
      {options.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {options.map((option) => (
            <li key={option} className="flex items-center justify-between px-3 py-1.5 text-sm text-slate-700">
              {option}
              <button type="button" aria-label={`Remove ${option}`} onClick={() => setConfig({ options: options.filter((item) => item !== option) })} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Checkbox label="Allow several options" checked={multiple} onChange={(event) => setConfig({ multiple: event.target.checked, buttons: event.target.checked ? false : config.buttons })} />
      <Checkbox label="Show as buttons instead of a dropdown" checked={config.buttons === true} disabled={multiple} onChange={(event) => setConfig({ buttons: event.target.checked })} />
    </div>
  )
}
