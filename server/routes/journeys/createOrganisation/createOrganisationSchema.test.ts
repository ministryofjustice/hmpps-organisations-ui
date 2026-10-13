import {
  createOrganisationSchema,
  ERRORS,
  isValidEmail,
  isValidWebAddress,
  ReferenceData,
} from './createOrganisationSchema'

const refs: ReferenceData = {
  ORGANISATION_TYPE: [{ code: 'OTHER', description: 'Other' }],
  PHONE_TYPE: [{ code: 'BUS', description: 'Business' }],
  ADDRESS_TYPE: [{ code: 'HOME', description: 'Home' }],
  CITY: [{ code: '25343', description: 'Sheffield' }],
  COUNTY: [{ code: 'S.YORKSHIRE', description: 'South Yorkshire' }],
  COUNTRY: [{ code: 'ENG', description: 'England' }],
  ORG_ADDRESS_SPECIAL_NEEDS: [{ code: 'WHEEL', description: 'Wheelchair' }],
}

const schema = createOrganisationSchema(refs)
const valid = { organisationName: 'Org', organisationTypes: ['OTHER'], active: 'true' }

const errorsFor = (body: Record<string, unknown>) => {
  const result = schema.safeParse(body)
  if (result.success) return {}
  return Object.fromEntries(
    result.error.issues.map(issue => [
      issue.path.reduce<string>((acc, p) => (acc ? `${acc}[${String(p)}]` : String(p)), ''),
      issue.message,
    ]),
  )
}

describe('createOrganisationSchema', () => {
  it('accepts a minimal valid body and returns clean values', () => {
    const result = schema.safeParse({ ...valid, _csrf: 'x', action: 'create', programmeNumber: '' })
    expect(result.success).toBe(true)
  })

  it('requires the name and limits to 40', () => {
    expect(errorsFor({ ...valid, organisationName: '' })).toEqual({ organisationName: ERRORS.NAME_REQUIRED })
    expect(errorsFor({ ...valid, organisationName: 'a'.repeat(40) })).toEqual({})
    expect(errorsFor({ ...valid, organisationName: 'a'.repeat(41) })).toEqual({
      organisationName: ERRORS.NAME_TOO_LONG,
    })
  })

  it.each([
    ['programmeNumber', 40, ERRORS.PROGRAMME_NUMBER_TOO_LONG],
    ['vatNumber', 12, ERRORS.VAT_NUMBER_TOO_LONG],
    ['caseloadId', 6, ERRORS.CASELOAD_ID_TOO_LONG],
    ['comments', 240, ERRORS.COMMENTS_TOO_LONG],
  ])('limits %s to %d', (field, max, message) => {
    expect(errorsFor({ ...valid, [field]: 'a'.repeat(max) })).toEqual({})
    expect(errorsFor({ ...valid, [field]: 'a'.repeat(max + 1) })).toEqual({ [field]: message })
  })

  describe('organisation types', () => {
    it('requires at least one', () => {
      expect(errorsFor({ ...valid, organisationTypes: undefined })).toEqual({
        organisationTypes: ERRORS.ORGANISATION_TYPE_REQUIRED,
      })
    })
    it('rejects unknown and duplicate codes', () => {
      expect(errorsFor({ ...valid, organisationTypes: ['NOPE'] })).toEqual({
        organisationTypes: ERRORS.ORGANISATION_TYPE_INVALID,
      })
      expect(errorsFor({ ...valid, organisationTypes: ['OTHER', 'OTHER'] })).toEqual({
        organisationTypes: ERRORS.ORGANISATION_TYPE_DUPLICATE,
      })
    })
  })

  describe('status and deactivated date', () => {
    it('requires a valid status', () => {
      expect(errorsFor({ ...valid, active: undefined }).active).toBeDefined()
      expect(errorsFor({ ...valid, active: 'maybe' }).active).toEqual(ERRORS.STATUS_REQUIRED)
    })
    it('forbids a deactivated date when active', () => {
      expect(
        errorsFor({
          ...valid,
          'deactivatedDate-day': '1',
          'deactivatedDate-month': '1',
          'deactivatedDate-year': '2025',
        }),
      ).toEqual({
        'deactivatedDate-day': ERRORS.DEACTIVATED_DATE_WHEN_ACTIVE,
      })
    })
    it('allows an optional, valid date when inactive and rejects bad ones', () => {
      expect(errorsFor({ ...valid, active: 'false' })).toEqual({})
      const ok = schema.safeParse({
        ...valid,
        active: 'false',
        'deactivatedDate-day': '2',
        'deactivatedDate-month': '1',
        'deactivatedDate-year': '2025',
      })
      expect(ok.success && ok.data.deactivatedDate).toBe('2025-01-02')
      expect(
        errorsFor({
          ...valid,
          active: 'false',
          'deactivatedDate-day': '31',
          'deactivatedDate-month': '2',
          'deactivatedDate-year': '2025',
        }),
      ).toEqual({ 'deactivatedDate-day': 'Deactivated date must be a real date' })
      expect(errorsFor({ ...valid, active: 'false', 'deactivatedDate-day': '1' })).toEqual({
        'deactivatedDate-month': 'Deactivated date must include a month and year',
      })
    })
  })

  describe('phone numbers', () => {
    const phone = (overrides = {}) => ({
      ...valid,
      phoneNumbers: [{ phoneType: 'BUS', phoneNumber: '01 (2)+3-4', ...overrides }],
    })
    it('accepts valid phones and drops blank blocks', () => {
      const result = schema.safeParse({ ...valid, phoneNumbers: [{ phoneType: '', phoneNumber: '' }] })
      expect(result.success && result.data.phoneNumbers).toEqual([])
      expect(errorsFor(phone({ extNumber: '1234567' }))).toEqual({})
    })
    it('validates number format and length', () => {
      expect(errorsFor(phone({ phoneNumber: 'abc' }))).toEqual({
        'phoneNumbers[0][phoneNumber]': ERRORS.PHONE_NUMBER_FORMAT,
      })
      expect(errorsFor(phone({ phoneNumber: '1'.repeat(41) }))['phoneNumbers[0][phoneNumber]']).toBe(
        ERRORS.PHONE_NUMBER_TOO_LONG,
      )
      expect(errorsFor(phone({ phoneNumber: '' }))['phoneNumbers[0][phoneNumber]']).toBe(ERRORS.PHONE_NUMBER_REQUIRED)
    })
    it('validates type and extension', () => {
      expect(errorsFor(phone({ phoneType: '' }))['phoneNumbers[0][phoneType]']).toBe(ERRORS.PHONE_TYPE_REQUIRED)
      expect(errorsFor(phone({ phoneType: 'X' }))['phoneNumbers[0][phoneType]']).toBe(ERRORS.PHONE_TYPE_REQUIRED)
      expect(errorsFor(phone({ extNumber: '12345678' }))['phoneNumbers[0][extNumber]']).toBe(ERRORS.EXTENSION_TOO_LONG)
      expect(errorsFor(phone({ extNumber: '12a' }))['phoneNumbers[0][extNumber]']).toBe(ERRORS.EXTENSION_FORMAT)
    })
  })

  describe('internet addresses', () => {
    const net = (type: string, address: string) => ({ ...valid, internetAddresses: [{ type, address }] })
    it('validates email and web formats', () => {
      expect(errorsFor(net('EMAIL', 'a@b.com'))).toEqual({})
      expect(errorsFor(net('EMAIL', 'nope'))).toEqual({ 'internetAddresses[0][address]': ERRORS.EMAIL_INVALID })
      expect(errorsFor(net('WEB', 'www.example.com'))).toEqual({})
      expect(errorsFor(net('WEB', 'https://example.com/a'))).toEqual({})
      expect(errorsFor(net('WEB', 'not a url'))).toEqual({ 'internetAddresses[0][address]': ERRORS.WEB_INVALID })
    })
    it('requires type and address, and limits length', () => {
      expect(errorsFor(net('', 'a@b.com'))['internetAddresses[0][type]']).toBe(ERRORS.INTERNET_TYPE_REQUIRED)
      expect(errorsFor(net('EMAIL', ''))['internetAddresses[0][address]']).toBe(ERRORS.INTERNET_ADDRESS_REQUIRED)
      expect(errorsFor(net('WEB', `${'a'.repeat(241)}.com`))['internetAddresses[0][address]']).toBe(
        ERRORS.INTERNET_ADDRESS_TOO_LONG,
      )
    })
    it('helpers', () => {
      expect(isValidEmail('a@b.co')).toBe(true)
      expect(isValidWebAddress('localhost')).toBe(false)
    })
  })

  describe('addresses', () => {
    const addr = (overrides = {}) => ({ ...valid, addresses: [{ street: 'High St', ...overrides }] })
    it('accepts a valid address with nested phone', () => {
      const result = schema.safeParse(
        addr({
          cityCode: '25343',
          countyCode: 'S.YORKSHIRE',
          countryCode: 'ENG',
          addressType: 'HOME',
          specialNeedsCode: 'WHEEL',
          primaryAddress: 'true',
          phoneNumbers: [{ phoneType: 'BUS', phoneNumber: '01' }],
        }),
      )
      expect(result.success && result.data.addresses[0].primaryAddress).toBe(true)
      expect(result.success && result.data.addresses[0].phoneNumbers).toHaveLength(1)
    })
    it.each([
      ['flat', 30],
      ['property', 135],
      ['street', 160],
      ['area', 70],
      ['postCode', 12],
      ['comments', 240],
      ['contactPersonName', 40],
      ['businessHours', 60],
    ])('limits %s to %d', (field, max) => {
      expect(errorsFor(addr({ [field]: 'a'.repeat(max) }))).toEqual({})
      expect(errorsFor(addr({ [field]: 'a'.repeat(max + 1) }))[`addresses[0][${field}]`]).toBeDefined()
    })
    it('checks reference data', () => {
      const errors = errorsFor(
        addr({ cityCode: 'x', countyCode: 'x', countryCode: 'x', addressType: 'x', specialNeedsCode: 'x' }),
      )
      expect(Object.keys(errors).sort()).toEqual(
        [
          'addresses[0][addressType]',
          'addresses[0][cityCode]',
          'addresses[0][countryCode]',
          'addresses[0][countyCode]',
          'addresses[0][specialNeedsCode]',
        ].sort(),
      )
    })
    it('requires end date not before start date', () => {
      const dates = (end: string) => ({
        'startDate-day': '10',
        'startDate-month': '1',
        'startDate-year': '2025',
        'endDate-day': end,
        'endDate-month': '1',
        'endDate-year': '2025',
      })
      expect(errorsFor(addr(dates('10')))).toEqual({})
      expect(errorsFor(addr(dates('9')))).toEqual({ 'addresses[0][endDate-day]': ERRORS.END_BEFORE_START })
    })
    it('allows only one primary and one mail address, flagging the offender', () => {
      const body = {
        ...valid,
        addresses: [
          { street: 'a', primaryAddress: 'true', mailAddress: 'true' },
          { street: 'b', primaryAddress: 'true', mailAddress: 'true' },
        ],
      }
      expect(errorsFor(body)).toEqual({
        'addresses[1][primaryAddress]': ERRORS.ONE_PRIMARY,
        'addresses[1][mailAddress]': ERRORS.ONE_MAIL,
      })
    })
    it('reports nested phone errors at the full path', () => {
      expect(errorsFor(addr({ phoneNumbers: [{ phoneType: 'BUS', phoneNumber: 'x', extNumber: 'y' }] }))).toEqual({
        'addresses[0][phoneNumbers][0][phoneNumber]': ERRORS.PHONE_NUMBER_FORMAT,
        'addresses[0][phoneNumbers][0][extNumber]': ERRORS.EXTENSION_FORMAT,
      })
    })
    it('keeps error indexes aligned when earlier blocks are blank', () => {
      const body = {
        ...valid,
        phoneNumbers: [
          { phoneType: '', phoneNumber: '' },
          { phoneType: 'BUS', phoneNumber: 'x' },
        ],
      }
      expect(Object.keys(errorsFor(body))).toEqual(['phoneNumbers[1][phoneNumber]'])
    })
  })
})
