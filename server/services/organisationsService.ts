import createError from 'http-errors'
import type OrganisationsApiClient from '../data/organisationsApiClient'
import type { HmppsUser } from '../interfaces/hmppsUser'
import type {
  OrganisationSummary,
  OrganisationV2Details,
  PagedModel,
  ReferenceCode,
  ReferenceCodeGroup,
} from '../@types/organisationsApi/types'
import type {
  CreateOrganisationForm,
  ReferenceData,
} from '../routes/journeys/createOrganisation/createOrganisationSchema'
import toCreateOrganisationRequest, { toUpdateOrganisationRequest } from './organisationMapper'
import OrganisationRejectedError from './organisationRejectedError'
import logger from '../../logger'

const REFERENCE_GROUPS: ReferenceCodeGroup[] = [
  'ORGANISATION_TYPE',
  'PHONE_TYPE',
  'ADDRESS_TYPE',
  'CITY',
  'COUNTY',
  'COUNTRY',
  'ORG_ADDRESS_SPECIAL_NEEDS',
]

const statusOf = (error: unknown) =>
  (error as { responseStatus?: number; status?: number }).responseStatus ?? (error as { status?: number }).status

const CACHE_TTL_MS = 5 * 60 * 1000

export default class OrganisationsService {
  private readonly cache = new Map<ReferenceCodeGroup, { expires: number; codes: ReferenceCode[] }>()

  constructor(private readonly organisationsApiClient: OrganisationsApiClient) {}

  async getReferenceCodes(group: ReferenceCodeGroup, user: HmppsUser): Promise<ReferenceCode[]> {
    const cached = this.cache.get(group)
    if (cached && cached.expires > Date.now()) return cached.codes

    const codes = await this.organisationsApiClient.getReferenceCodes(group, user.username)
    this.cache.set(group, { expires: Date.now() + CACHE_TTL_MS, codes })
    return codes
  }

  async getReferenceData(user: HmppsUser): Promise<ReferenceData> {
    const lists = await Promise.all(REFERENCE_GROUPS.map(group => this.getReferenceCodes(group, user)))
    return Object.fromEntries(REFERENCE_GROUPS.map((group, i) => [group, lists[i]])) as unknown as ReferenceData
  }

  async createOrganisation(form: CreateOrganisationForm, user: HmppsUser): Promise<OrganisationV2Details> {
    const request = toCreateOrganisationRequest(form, user.username)
    try {
      return await this.organisationsApiClient.createOrganisation(request, user.username)
    } catch (error) {
      if (statusOf(error) === 400) {
        logger.error(error, 'Organisations API rejected the create organisation request')
        throw new OrganisationRejectedError('The organisation could not be created')
      }
      throw error
    }
  }

  async getOrganisation(organisationId: number, user: HmppsUser): Promise<OrganisationV2Details> {
    try {
      return await this.organisationsApiClient.getOrganisation(organisationId, user.username)
    } catch (error) {
      if (statusOf(error) === 404) throw createError(404, 'Organisation not found')
      throw error
    }
  }

  async updateOrganisation(
    organisationId: number,
    form: CreateOrganisationForm,
    user: HmppsUser,
  ): Promise<OrganisationV2Details> {
    const existing = await this.getOrganisation(organisationId, user)
    const request = toUpdateOrganisationRequest(form, existing, user.username)
    try {
      return await this.organisationsApiClient.updateOrganisation(organisationId, request, user.username)
    } catch (error) {
      if (statusOf(error) === 404) throw createError(404, 'Organisation not found')
      if (statusOf(error) === 400) {
        logger.error(error, 'Organisations API rejected the update organisation request')
        throw new OrganisationRejectedError('The organisation could not be updated')
      }
      throw error
    }
  }

  async deleteOrganisation(organisationId: number, user: HmppsUser): Promise<void> {
    try {
      await this.organisationsApiClient.deleteOrganisation(organisationId, user.username)
    } catch (error) {
      if (statusOf(error) === 404) throw createError(404, 'Organisation not found')
      throw error
    }
  }

  listOrganisations(
    term: string | undefined,
    page: number,
    size: number,
    user: HmppsUser,
  ): Promise<PagedModel<OrganisationSummary>> {
    return this.organisationsApiClient.listOrganisations(term || undefined, page, size, user.username)
  }
}
