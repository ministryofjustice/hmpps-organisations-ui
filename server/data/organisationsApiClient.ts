import { RestClient, asSystem } from '@ministryofjustice/hmpps-rest-client'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import config from '../config'
import logger from '../../logger'
import type {
  OrganisationV2CreateRequest,
  OrganisationV2Details,
  ReferenceCode,
  ReferenceCodeGroup,
} from '../@types/organisationsApi/types'

export default class OrganisationsApiClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Organisations API', config.apis.organisationsApi, logger, authenticationClient)
  }

  createOrganisation(request: OrganisationV2CreateRequest, username: string): Promise<OrganisationV2Details> {
    return this.post<OrganisationV2Details>({ path: '/organisation/v2', data: request }, asSystem(username))
  }

  getReferenceCodes(group: ReferenceCodeGroup, username: string): Promise<ReferenceCode[]> {
    return this.get<ReferenceCode[]>({ path: `/reference-codes/group/${group}` }, asSystem(username))
  }
}
