// Mirrors the API rule (T26): 10-128 characters with a letter and a number.
// The server stays authoritative (it also rejects common passwords).
export function passwordChecks(value: string) {
  const length = [...value].length
  return [
    { label: '10 or more characters', ok: length >= 10 && length <= 128 },
    { label: 'A letter', ok: /\p{L}/u.test(value) },
    { label: 'A number', ok: /\p{N}/u.test(value) },
  ]
}

export function passwordProblem(value: string): string | null {
  if ([...value].length > 128) return 'Use at most 128 characters.'
  const missing = passwordChecks(value).filter((check) => !check.ok).map((check) => check.label.toLowerCase())
  return missing.length ? `Add ${missing.join(', ')}.` : null
}
