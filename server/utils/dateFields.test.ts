import { parseDateFields } from './dateFields'

describe('parseDateFields', () => {
  it.each([
    ['1', '2', '2024', { status: 'ok', value: '2024-02-01' }],
    ['29', '2', '2024', { status: 'ok', value: '2024-02-29' }],
    ['29', '2', '2023', { status: 'invalid' }],
    ['31', '4', '2024', { status: 'invalid' }],
    ['1', '13', '2024', { status: 'invalid' }],
    ['a', '1', '2024', { status: 'invalid' }],
    ['1', '1', '24', { status: 'invalid' }],
    [undefined, undefined, undefined, { status: 'empty' }],
    ['1', undefined, '2024', { status: 'incomplete', missing: ['month'] }],
    [undefined, undefined, '2024', { status: 'incomplete', missing: ['day', 'month'] }],
  ])('parses %s/%s/%s', (day, month, year, expected) => {
    expect(parseDateFields(day, month, year)).toEqual(expected)
  })
})
