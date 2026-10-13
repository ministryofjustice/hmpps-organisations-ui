import { checked, findError, formatDate, prependEmptyOption, refDataToOptions, selected } from './viewFilters'

describe('viewFilters', () => {
  it('findError returns the error text for a field or null', () => {
    const errors = [{ fieldId: 'a', href: '#a', text: 'Bad' }]
    expect(findError(errors, 'a')).toEqual({ text: 'Bad' })
    expect(findError(errors, 'b')).toBeNull()
    expect(findError(null, 'a')).toBeNull()
  })

  it('refDataToOptions, prependEmptyOption', () => {
    const options = refDataToOptions([{ code: 'A', description: 'Alpha' }])
    expect(options).toEqual([{ value: 'A', text: 'Alpha' }])
    expect(prependEmptyOption(options)).toEqual([{ value: '', text: '' }, ...options])
    expect(refDataToOptions(undefined)).toEqual([])
  })

  it('selected and checked mark items', () => {
    const items = [{ value: 'A' }, { value: 'B' }]
    expect(selected(items, 'B')).toEqual([
      { value: 'A', selected: false },
      { value: 'B', selected: true },
    ])
    expect(selected(items, undefined).every(i => !i.selected)).toBe(true)
    expect(checked(items, ['A'])).toEqual([
      { value: 'A', checked: true },
      { value: 'B', checked: false },
    ])
  })

  it('formatDate', () => {
    expect(formatDate('2025-01-02')).toBe('2 January 2025')
    expect(formatDate(undefined)).toBe('')
  })
})
