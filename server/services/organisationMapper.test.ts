import toCreateOrganisationRequest from './organisationMapper'
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
