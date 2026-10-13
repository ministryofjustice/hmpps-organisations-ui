import { applyListAction, isBlank, normaliseBody, toArray, toViewForm } from './createOrganisationForm'

describe('createOrganisationForm', () => {
  it('toArray handles arrays, qs objects, scalars and empty values', () => {
    expect(toArray(['a'])).toEqual(['a'])
    expect(toArray({ 0: 'a', 1: 'b' })).toEqual(['a', 'b'])
    expect(toArray('a')).toEqual(['a'])
    expect(toArray(undefined)).toEqual([])
  })

  it('isBlank treats nested empties as blank', () => {
    expect(isBlank({ a: '', b: [{ c: '' }] })).toBe(true)
    expect(isBlank({ a: 'x' })).toBe(false)
  })

  it('normaliseBody nulls blank blocks but keeps their position', () => {
    const result = normaliseBody({
      phoneNumbers: [
        { phoneType: '', phoneNumber: '' },
        { phoneType: 'BUS', phoneNumber: '1' },
      ],
      internetAddresses: [{ type: '', address: '' }],
      addresses: [
        { flat: '', phoneNumbers: [{ phoneNumber: '' }] },
        { flat: '1', phoneNumbers: [{ phoneNumber: '' }] },
      ],
      organisationTypes: 'OTHER',
    }) as Record<string, unknown>
    expect(result.phoneNumbers).toEqual([null, { phoneType: 'BUS', phoneNumber: '1' }])
    expect(result.internetAddresses).toEqual([null])
    expect(result.addresses).toEqual([null, { flat: '1', phoneNumbers: [null] }])
    expect(result.organisationTypes).toEqual(['OTHER'])
  })

  describe('applyListAction', () => {
    const body = {
      _csrf: 'x',
      action: 'add-phone',
      organisationName: 'Org',
      phoneNumbers: [{ phoneNumber: '1' }],
      addresses: [{ flat: 'A', phoneNumbers: [{ phoneNumber: '1' }] }, { flat: 'B' }],
    }

    it('adds and removes top-level blocks and drops csrf/action', () => {
      const added = applyListAction(body, 'add-phone')
      expect(added.phoneNumbers).toHaveLength(2)
      expect(added).not.toHaveProperty('_csrf')
      expect(added).not.toHaveProperty('action')
      expect(applyListAction(body, 'remove-phone-0').phoneNumbers).toEqual([])
      expect(applyListAction(body, 'add-internet-address').internetAddresses).toHaveLength(1)
      expect(applyListAction(body, 'add-address').addresses).toHaveLength(3)
      expect(applyListAction(body, 'remove-address-0').addresses).toHaveLength(1)
    })

    it('adds and removes nested phone numbers', () => {
      const added = applyListAction(body, 'add-address-1-phone')
      expect((added.addresses as { phoneNumbers: unknown[] }[])[1].phoneNumbers).toHaveLength(1)
      const removed = applyListAction(body, 'remove-address-0-phone-0')
      expect((removed.addresses as { phoneNumbers: unknown[] }[])[0].phoneNumbers).toHaveLength(0)
    })

    it('does not exceed the cap', () => {
      const full = { phoneNumbers: [1, 2, 3, 4, 5].map(n => ({ phoneNumber: `${n}` })) }
      expect(applyListAction(full, 'add-phone').phoneNumbers).toHaveLength(5)
    })
  })

  it('toViewForm always provides one block per group', () => {
    const view = toViewForm(undefined)
    expect(view.phoneNumbers).toHaveLength(1)
    expect(view.internetAddresses).toHaveLength(1)
    expect(view.addresses).toHaveLength(1)
    expect(view.addresses[0].phoneNumbers).toHaveLength(1)
  })
})
