import nock from 'nock'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import OrganisationsApiClient from './organisationsApiClient'
import config from '../config'
import type { OrganisationV2CreateRequest } from '../@types/organisationsApi/types'

describe('OrganisationsApiClient', () => {
  let client: OrganisationsApiClient
  let authenticationClient: jest.Mocked<AuthenticationClient>

  beforeEach(() => {
    authenticationClient = {
      getToken: jest.fn().mockResolvedValue('test-system-token'),
    } as unknown as jest.Mocked<AuthenticationClient>
    client = new OrganisationsApiClient(authenticationClient)
  })

  afterEach(() => {
    nock.cleanAll()
    jest.resetAllMocks()
  })

  const request: OrganisationV2CreateRequest = {
    organisationName: 'Example Limited',
    organisationTypes: ['OTHER'],
    active: true,
    phoneNumbers: [],
    internetAddresses: [],
    addresses: [],
    createdBy: 'user1',
    createdTime: '2025-01-01T12:00:00',
  }

  it('creates an organisation using a system token for the user', async () => {
    nock(config.apis.organisationsApi.url)
      .post('/organisation/v2', body => body.organisationName === 'Example Limited')
      .matchHeader('authorization', 'Bearer test-system-token')
      .reply(201, { ...request, organisationId: 20000000 })

    const response = await client.createOrganisation(request, 'user1')

    expect(response.organisationId).toEqual(20000000)
    expect(authenticationClient.getToken).toHaveBeenCalledWith('user1')
  })

  it('gets reference codes for a group', async () => {
    const codes = [{ code: 'BUS', description: 'Business', groupCode: 'PHONE_TYPE' }]
    nock(config.apis.organisationsApi.url).get('/reference-codes/group/PHONE_TYPE').reply(200, codes)

    expect(await client.getReferenceCodes('PHONE_TYPE', 'user1')).toEqual(codes)
  })

  it('rejects on a 400', async () => {
    nock(config.apis.organisationsApi.url).post('/organisation/v2').reply(400, { status: 400, userMessage: 'bad' })

    await expect(client.createOrganisation(request, 'user1')).rejects.toMatchObject({ responseStatus: 400 })
  })
})
