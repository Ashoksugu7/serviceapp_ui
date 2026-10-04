const amountFormat = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Amounts arrive as decimal strings; they are informational only (no billing in Phase 1).
export function formatAmount(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const amount = Number(value)
  return Number.isFinite(amount) ? `₹${amountFormat.format(amount)}` : String(value)
}
