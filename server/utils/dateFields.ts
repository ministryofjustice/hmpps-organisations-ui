import { format, isValid } from 'date-fns'

export type DateFieldsResult =
  | { status: 'empty' }
  | { status: 'incomplete'; missing: string[] }
  | { status: 'invalid' }
  | { status: 'ok'; value: string }

/** Combines day/month/year input values into a yyyy-MM-dd string, reporting what is wrong when it cannot */
export const parseDateFields = (day?: string, month?: string, year?: string): DateFieldsResult => {
  const parts = { day, month, year }
  const missing = Object.entries(parts)
    .filter(([, v]) => !v)
    .map(([k]) => k)

  if (missing.length === 3) return { status: 'empty' }
  if (missing.length > 0) return { status: 'incomplete', missing }

  if (![day, month, year].every(v => /^\d+$/.test(v ?? '')) || year?.length !== 4) return { status: 'invalid' }

  const date = new Date(Number(year), Number(month) - 1, Number(day))
  const matches =
    isValid(date) &&
    date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day)

  return matches ? { status: 'ok', value: format(date, 'yyyy-MM-dd') } : { status: 'invalid' }
}
