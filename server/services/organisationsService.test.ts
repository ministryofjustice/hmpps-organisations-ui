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

  it('rethrows other errors', async () => {
    const error = { responseStatus: 500 }
    client.createOrganisation.mockRejectedValue(error)
    await expect(service.createOrganisation(form, user)).rejects.toBe(error)
  })
})
