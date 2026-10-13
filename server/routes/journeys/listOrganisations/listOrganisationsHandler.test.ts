import request from 'supertest'
import * as cheerio from 'cheerio'
import { AuditService } from '@ministryofjustice/hmpps-audit-client'
import { appWithAllRoutes, user, viewOnlyUser } from '../../testutils/appSetup'
import OrganisationsService from '../../../services/organisationsService'
import { Page } from '../..'
import type { OrganisationSummary } from '../../../@types/organisationsApi/types'

jest.mock('@ministryofjustice/hmpps-audit-client')
jest.mock('../../../services/organisationsService')

const auditService = new AuditService({} as never) as jest.Mocked<AuditService>
const organisationsService = new OrganisationsService(null as never) as jest.Mocked<OrganisationsService>

const build = (currentUser = user) =>
  request(appWithAllRoutes({ services: { auditService, organisationsService }, userSupplier: () => currentUser }))

const org = (overrides: Partial<OrganisationSummary> = {}): OrganisationSummary => ({
  organisationId: 1,
  organisationName: 'Acme Limited',
  organisationActive: true,
  street: 'High Street',
  cityDescription: 'Sheffield',
  postcode: 'S1 1AA',
  businessPhoneNumber: '0114 496 0000',
  ...overrides,
})

const result = (content: OrganisationSummary[], totalElements = content.length, totalPages = 1) => ({
  content,
  page: { size: 20, number: 0, totalElements, totalPages },
})

beforeEach(() => {
  auditService.logPageView.mockResolvedValue(undefined)
})

afterEach(jest.resetAllMocks)

describe('GET /organisations', () => {
  it('lists organisations and audits the page view', async () => {
    organisationsService.listOrganisations.mockResolvedValue(
      result([org(), org({ organisationId: 2, organisationName: 'Beta Ltd', organisationActive: false })]),
    )

    const res = await build().get('/organisations').expect(200)
    const $ = cheerio.load(res.text)

    expect($('[data-qa=main-heading]').text()).toBe('View organisations')
    expect($('[data-qa=result-count]').text().trim()).toBe('2 organisations found')
    expect($('[data-qa=organisations-table] tbody tr')).toHaveLength(2)
    expect($('[data-qa=organisations-table] tbody tr').first().text()).toContain('High Street, Sheffield, S1 1AA')
    expect($('[data-qa=organisations-table] tbody tr').last().text()).toContain('Inactive')
    expect($('[data-qa=add-organisation-link]')).toHaveLength(1)
    expect(organisationsService.listOrganisations).toHaveBeenCalledWith('', 0, 20, expect.anything())
    expect(auditService.logPageView).toHaveBeenCalledWith(Page.LIST_ORGANISATIONS_PAGE, {
      who: user.username,
      correlationId: expect.any(String),
    })
  })

  it('passes the search term and page, and renders pagination', async () => {
    organisationsService.listOrganisations.mockResolvedValue(result([org()], 45, 3))

    const res = await build().get('/organisations').query({ name: ' acme ', page: '2' }).expect(200)
    const $ = cheerio.load(res.text)

    expect(organisationsService.listOrganisations).toHaveBeenCalledWith('acme', 1, 20, expect.anything())
    expect($('[data-qa=name-input]').val()).toBe('acme')
    expect($('.govuk-pagination__link[href="/organisations?name=acme&page=3"]').length).toBeGreaterThan(0)
  })

  it('shows a message and no table when nothing matches', async () => {
    organisationsService.listOrganisations.mockResolvedValue(result([]))

    const $ = cheerio.load((await build().get('/organisations').expect(200)).text)

    expect($('[data-qa=result-count]').text().trim()).toBe('0 organisations found')
    expect($('[data-qa=organisations-table]')).toHaveLength(0)
  })

  it('falls back to page 1 for an invalid page', async () => {
    organisationsService.listOrganisations.mockResolvedValue(result([]))

    await build().get('/organisations').query({ page: 'abc' }).expect(200)

    expect(organisationsService.listOrganisations).toHaveBeenCalledWith('', 0, 20, expect.anything())
  })

  it('is available to view-only users without the add link', async () => {
    organisationsService.listOrganisations.mockResolvedValue(result([org()]))

    const $ = cheerio.load((await build(viewOnlyUser).get('/organisations').expect(200)).text)

    expect($('[data-qa=add-organisation-link]')).toHaveLength(0)
  })
})
