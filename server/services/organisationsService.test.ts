import OrganisationsService from './organisationsService'
import OrganisationRejectedError from './organisationRejectedError'
import OrganisationsApiClient from '../data/organisationsApiClient'
import type { HmppsUser } from '../interfaces/hmppsUser'
import type { CreateOrganisationForm } from '../routes/journeys/createOrganisation/createOrganisationSchema'

jest.mock('../data/organisationsApiClient')

describe('OrganisationsService', () => {
  const client = new OrganisationsApiClient(null as never) as jest.Mocked<OrganisationsApiClient>
  const service = new OrganisationsService(client)
  const user = { username: 'user1' } as HmppsUser
  const form = {
    organisationName: 'Org',
    organisationTypes: ['OTHER'],
    active: true,
    phoneNumbers: [],
    internetAddresses: [],
    addresses: [],
  } as unknown as CreateOrganisationForm

  afterEach(jest.resetAllMocks)

  it('caches reference codes per group', async () => {
    client.getReferenceCodes.mockResolvedValue([])
    await service.getReferenceCodes('CITY', user)
    await service.getReferenceCodes('CITY', user)
    expect(client.getReferenceCodes).toHaveBeenCalledTimes(1)
  })

  it('loads all reference groups', async () => {
    client.getReferenceCodes.mockResolvedValue([])
    const data = await service.getReferenceData(user)
    expect(Object.keys(data).sort()).toEqual(
      [
        'ADDRESS_TYPE',
        'CITY',
        'COUNTRY',
        'COUNTY',
        'ORGANISATION_TYPE',
        'ORG_ADDRESS_SPECIAL_NEEDS',
        'PHONE_TYPE',
      ].sort(),
    )
  })

  it('creates an organisation with the user as creator', async () => {
    client.createOrganisation.mockResolvedValue({ organisationId: 1 } as never)
    const result = await service.createOrganisation(form, user)
    expect(result.organisationId).toBe(1)
    expect(client.createOrganisation).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: 'user1', organisationName: 'Org' }),
      'user1',
    )
  })

  it.each([{ responseStatus: 400 }, { status: 400 }])('wraps a 400 (%p)', async error => {
    client.createOrganisation.mockRejectedValue(error)
    await expect(service.createOrganisation(form, user)).rejects.toBeInstanceOf(OrganisationRejectedError)
  })

  it('lists organisations, treating a blank term as no filter', async () => {
    const result = { content: [], page: { size: 20, number: 0, totalElements: 0, totalPages: 0 } }
    client.listOrganisations.mockResolvedValue(result)

    expect(await service.listOrganisations('', 0, 20, user)).toBe(result)
    expect(client.listOrganisations).toHaveBeenCalledWith(undefined, 0, 20, 'user1')
  })

  it('rethrows other errors', async () => {
    const error = { responseStatus: 500 }
    client.createOrganisation.mockRejectedValue(error)
    await expect(service.createOrganisation(form, user)).rejects.toBe(error)
  })

  describe('get, update and delete', () => {
    const existing = {
      organisationId: 7,
      organisationName: 'Old',
      organisationTypes: ['OTHER'],
      active: true,
      phoneNumbers: [],
      internetAddresses: [],
      addresses: [],
      createdBy: 'creator',
      createdTime: '2024-01-01T10:00:00',
    } as never

    it('turns a 404 into a not found error', async () => {
      client.getOrganisation.mockRejectedValue({ responseStatus: 404 })
      await expect(service.getOrganisation(7, user)).rejects.toMatchObject({ status: 404 })
    })

    it('updates with the original created audit values and the user as updater', async () => {
      client.getOrganisation.mockResolvedValue(existing)
      client.updateOrganisation.mockResolvedValue({ organisationId: 7 } as never)
      await service.updateOrganisation(7, form, user)
      expect(client.updateOrganisation).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ createdBy: 'creator', createdTime: '2024-01-01T10:00:00', updatedBy: 'user1' }),
        'user1',
      )
    })

    it('wraps a 400 from update', async () => {
      client.getOrganisation.mockResolvedValue(existing)
      client.updateOrganisation.mockRejectedValue({ responseStatus: 400 })
      await expect(service.updateOrganisation(7, form, user)).rejects.toBeInstanceOf(OrganisationRejectedError)
    })

    it('deletes, mapping 404 to not found', async () => {
      client.deleteOrganisation.mockResolvedValue(undefined)
      await service.deleteOrganisation(7, user)
      expect(client.deleteOrganisation).toHaveBeenCalledWith(7, 'user1')

      client.deleteOrganisation.mockRejectedValue({ status: 404 })
      await expect(service.deleteOrganisation(7, user)).rejects.toMatchObject({ status: 404 })
    })
  })
})
