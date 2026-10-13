import { format, parseISO } from 'date-fns'
import type { FieldValidationError } from '../middleware/setUpFlash'

type RefDataItem = { code: string; description: string }
type Item = { value?: string; text?: string; [key: string]: unknown }

export const findError = (errors: FieldValidationError[] | null | undefined, fieldId: string) => {
  const error = errors?.find(e => e.fieldId === fieldId)
  return error ? { text: error.text } : null
}

export const refDataToOptions = (refData: RefDataItem[] = []): Item[] =>
  refData.map(({ code, description }) => ({ value: code, text: description }))

export const prependEmptyOption = (items: Item[], text = ''): Item[] => [{ value: '', text }, ...items]

export const selected = (items: Item[], value: unknown): Item[] =>
  items.map(item => ({ ...item, selected: value !== undefined && value !== null && item.value === String(value) }))

export const checked = (items: Item[], values: unknown): Item[] => {
  const list = Array.isArray(values) ? values : [values]
  return items.map(item => ({ ...item, checked: list.includes(item.value) }))
}

export const formatDate = (value?: string | null, pattern = 'd MMMM yyyy'): string =>
  value ? format(parseISO(value), pattern) : ''
