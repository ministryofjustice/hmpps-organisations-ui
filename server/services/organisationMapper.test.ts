import toCreateOrganisationRequest, { toFormValues, toUpdateOrganisationRequest } from './organisationMapper'
import type { CreateOrganisationForm } from '../routes/journeys/createOrganisation/createOrganisationSchema'

describe('toCreateOrganisationRequest', () => {
  const now = new Date(2025, 0, 2, 3, 4, 5)

  it('maps a minimal form, converting undefined to null and setting audit fields', () => {
    const form: CreateOrganisationForm = {
      organisationName: 'Org',
      organisationTypes: ['OTHER'],
      active: true,
      phoneNumbers: [],
      internetAddresses: [],
      addresses: [],
    } as unknown as CreateOrganisationForm

    expect(toCreateOrganisationRequest(form, 'user1', now)).toEqual({
      organisationName: 'Org',
      programmeNumber: null,
      vatNumber: null,
      caseloadId: null,
      comments: null,
      organisationTypes: ['OTHER'],
      active: true,
      deactivatedDate: null,
      phoneNumbers: [],
      internetAddresses: [],
      addresses: [],
      createdBy: 'user1',
      createdTime: '2025-01-02T03:04:05',
      updatedBy: null,
      updatedTime: null,
    })
  })

  it('maps nested values', () => {
    const form = {
      organisationName: 'Org',
      organisationTypes: ['OTHER'],
      active: false,
      deactivatedDate: '2025-01-01',
      phoneNumbers: [{ phoneType: 'BUS', phoneNumber: '01', extNumber: undefined }],
      internetAddresses: [{ type: 'EMAIL', address: 'a@b.com' }],
      addresses: [
        {
          noFixedAddress: false,
          serviceAddress: false,
          active: true,
          primaryAddress: true,
          mailAddress: false,
          street: 'High St',
          phoneNumbers: [{ phoneType: 'BUS', phoneNumber: '02', extNumber: '1' }],
        },
      ],
    } as unknown as CreateOrganisationForm

    const result = toCreateOrganisationRequest(form, 'user1', now)
    expect(result.deactivatedDate).toBe('2025-01-01')
    expect(result.phoneNumbers[0].extNumber).toBeNull()
    expect(result.addresses[0]).toMatchObject({
      street: 'High St',
      flat: null,
      primaryAddress: true,
      phoneNumbers: [{ phoneNumber: '02', extNumber: '1' }],
    })
  })
})

describe('toUpdateOrganisationRequest', () => {
  it('keeps the created audit values and sets the updater', () => {
    const form = {
      organisationName: 'Org',
      organisationTypes: [],
      active: true,
      phoneNumbers: [],
      internetAddresses: [],
      addresses: [],
    } as unknown as CreateOrganisationForm
    const existing = { createdBy: 'creator', createdTime: '2024-01-01T10:00:00' } as never

    expect(toUpdateOrganisationRequest(form, existing, 'editor', new Date(2025, 0, 2, 3, 4, 5))).toMatchObject({
      createdBy: 'creator',
      createdTime: '2024-01-01T10:00:00',
      updatedBy: 'editor',
      updatedTime: '2025-01-02T03:04:05',
    })
  })
})

describe('toFormValues', () => {
  it('maps API details to form values, including dates and checkboxes', () => {
    const phone = { phoneType: 'BUS', phoneNumber: '0114', extNumber: '12' }
    const values = toFormValues({
      organisationId: 1,
      organisationName: 'Org',
      programmeNumber: null,
      vatNumber: 'GB1',
      caseloadId: null,
      comments: null,
      organisationTypes: ['OTHER'],
      active: false,
      deactivatedDate: '2025-03-07',
      phoneNumbers: [phone],
      internetAddresses: [{ type: 'EMAIL', address: 'a@b.co' }],
      addresses: [
        {
          noFixedAddress: false,
          street: 'High Street',
          startDate: '2024-12-01',
          endDate: null,
          serviceAddress: false,
          active: true,
          primaryAddress: true,
          mailAddress: false,
          phoneNumbers: [{ phoneType: 'BUS', phoneNumber: '0115', extNumber: null }],
        },
      ],
      createdBy: 'c',
      createdTime: '2024-01-01T10:00:00',
    } as never)

    expect(values).toEqual({
      organisationName: 'Org',
      vatNumber: 'GB1',
      organisationTypes: ['OTHER'],
      active: 'false',
      'deactivatedDate-day': '7',
      'deactivatedDate-month': '3',
      'deactivatedDate-year': '2025',
      phoneNumbers: [phone],
      internetAddresses: [{ type: 'EMAIL', address: 'a@b.co' }],
      addresses: [
        {
          street: 'High Street',
          primaryAddress: 'true',
          'startDate-day': '1',
          'startDate-month': '12',
          'startDate-year': '2024',
          phoneNumbers: [{ phoneType: 'BUS', phoneNumber: '0115' }],
        },
      ],
    })
  })
})
