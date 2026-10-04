import { describe, expect, it } from 'vitest'
import { passwordProblem } from './password'

describe('passwordProblem', () => {
  it('accepts 10+ characters with a letter and a number', () => {
    expect(passwordProblem('abc1234567')).toBeNull()
    expect(passwordProblem('päss phrase 5')).toBeNull()
  })

  it('explains what is missing', () => {
    expect(passwordProblem('abcdefghij')).toBe('Add a number.')
    expect(passwordProblem('1234567890')).toBe('Add a letter.')
    expect(passwordProblem('ab1')).toBe('Add 10 or more characters.')
  })
})
