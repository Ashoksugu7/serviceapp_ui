'use client'

import { addDays, localToday, QUICK_PICKS } from '@/lib/dates'
import { Chip, Input } from './index'

// Date input with Today / +3 / +7 / +14 chips counted from `from` (default today).
export function QuickDateInput({ value, onChange, from, includeToday = true, invalid, required, min }: {
  value: string
  onChange: (value: string) => void
  from?: string
  includeToday?: boolean
  invalid?: boolean
  required?: boolean
  min?: string
}) {
  const start = from || localToday()
  return (
    <>
      <Input type="date" value={value} required={required} min={min} invalid={invalid} onChange={(event) => onChange(event.target.value)} />
      <div className="flex flex-wrap gap-1.5">
        {QUICK_PICKS.filter((pick) => includeToday || pick.days > 0).map(({ label, days }) => {
          const date = addDays(start, days)
          return <Chip key={label} active={value === date} onClick={() => onChange(date)}>{label}</Chip>
        })}
      </div>
    </>
  )
}
