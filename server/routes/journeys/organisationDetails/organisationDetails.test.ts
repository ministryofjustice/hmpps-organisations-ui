import request from 'supertest'
import * as cheerio from 'cheerio'
import createError from 'http-errors'
import { AuditService } from '@ministryofjustice/hmpps-audit-client'
import { appWithAllRoutes, user, viewOnlyUser } from '../../testutils/appSetup'
import OrganisationsService from '../../../services/organisationsService'
import OrganisationRejectedError from '../../../services/organisationRejectedError'
import { Page } from '../..'
import type { ReferenceData } from '../createOrganisation/createOrganisationSchema'
import type { OrganisationV2Details } from '../../../@types/organisationsApi/types'

jest.mock('@ministryofjustice/hmpps-audit-client')
jest.mock('../../../services/organisationsService')

const auditService = new AuditService({} as never) as jest.Mocked<AuditService>
const organisationsService = new OrganisationsService(null as never) as jest.Mocked<OrganisationsService>

const refData: ReferenceData = {
  ORGANISATION_TYPE: [{ code: 'OTHER', description: 'Other' }],
  PHONE_TYPE: [{ code: 'BUS', description: 'Business' }],
  ADDRESS_TYPE: [{ code: 'HOME', description: 'Home' }],
  CITY: [{ code: '25343', description: 'Sheffield' }],
  COUNTY: [{ code: 'S.YORKSHIRE', description: 'South Yorkshire' }],
  COUNTRY: [{ code: 'ENG', description: 'England' }],
  ORG_ADDRESS_SPECIAL_NEEDS: [{ code: 'WHEEL', description: 'Wheelchair' }],
}

const organisation: OrganisationV2Details = {
  organisationId: 7,
  organisationName: 'Acme <b>Limited</b>',
  programmeNumber: null,
  vatNumber: 'GB123',
  caseloadId: null,
  comments: null,
  organisationTypes: ['OTHER'],
  active: true,
  deactivatedDate: null,
  phoneNumbers: [{ phoneType: 'BUS', phoneNumber: '0114 496 0000', extNumber: '12' }],
  internetAddresses: [
    { type: 'EMAIL', address: 'info@acme.example' },
    { type: 'WEB', address: 'https://acme.example' },
  ],
  addresses: [
    {
      noFixedAddress: false,
      street: 'High Street',
      cityCode: '25343',
      postCode: 'S1 1AA',
      countryCode: 'ENG',
      serviceAddress: false,
      active: true,
      primaryAddress: true,
      mailAddress: false,
      phoneNumbers: [{ phoneType: 'BUS', phoneNumber: '0114 111 2222', extNumber: null }],
    },
  ],
  createdBy: 'creator',
  createdTime: '2024-01-01T10:00:00',
} as OrganisationV2Details

const build = (currentUser = user) =>
  request.agent(appWithAllRoutes({ services: { auditService, organisationsService }, userSupplier: () => currentUser }))

beforeEach(() => {
  auditService.logPageView.mockResolvedValue(undefined)
  organisationsService.getReferenceData.mockResolvedValue(refData)
  organisationsService.getOrganisation.mockResolvedValue(organisation)
})

afterEach(jest.resetAllMocks)

describe('GET /organisations/:id', () => {
  it('shows the organisation with descriptions, escaped, and manage buttons', async () => {
    const res = await build().get('/organisations/7').expect(200)
    const $ = cheerio.load(res.text)

    expect($('[data-qa=main-heading]').text()).toBe('Acme <b>Limited</b>')
    expect($('[data-qa=organisation-details]').text()).toContain('Other')
    expect($('[data-qa=contact-details]').text()).toContain('Business: 0114 496 0000 ext. 12')
    expect($('[data-qa=contact-details]').text()).toContain('info@acme.example')
    expect($('[data-qa=address-1]').text()).toContain('High Street, Sheffield, S1 1AA, England')
    expect($('[data-qa=address-1]').text()).toContain('Primary')
    expect($('[data-qa=update-button]').attr('href')).toBe('/organisations/7/edit')
    expect($('[data-qa=delete-button]').attr('href')).toBe('/organisations/7/delete')
    expect(auditService.logPageView).toHaveBeenCalledWith(Page.VIEW_ORGANISATION_PAGE, {
      who: user.username,
      correlationId: expect.any(String),
    })
  })

  it('hides update and delete for view-only users', async () => {
    const res = await build(viewOnlyUser).get('/organisations/7').expect(200)
    const $ = cheerio.load(res.text)
    expect($('[data-qa=update-button]')).toHaveLength(0)
    expect($('[data-qa=delete-button]')).toHaveLength(0)
  })

  it('returns 404 when the organisation does not exist', async () => {
    organisationsService.getOrganisation.mockRejectedValue(createError(404))
    await build().get('/organisations/999').expect(404)
  })

  it('does not capture the create route', async () => {
    await build().get('/organisations/create').expect(200)
    expect(organisationsService.getOrganisation).not.toHaveBeenCalled()
  })
})

describe('edit', () => {
  it('prefills the form from the organisation', async () => {
    const res = await build().get('/organisations/7/edit').expect(200)
    const $ = cheerio.load(res.text)

    expect($('[data-qa=main-heading]').text()).toBe('Update organisation')
    expect($('[id="organisationName"]').val()).toBe('Acme <b>Limited</b>')
    expect($('[id="vatNumber"]').val()).toBe('GB123')
    expect($('[id="phoneNumbers[0][phoneNumber]"]').val()).toBe('0114 496 0000')
    expect($('[id="addresses[0][street]"]').val()).toBe('High Street')
    expect($('[data-qa=save-organisation-button]').text().trim()).toBe('Save changes')
    expect($('[data-qa=cancel-link]').attr('href')).toBe('/organisations/7/edit/cancel')
    expect($('[data-qa=back-link]').attr('href')).toBe('/organisations/7')
  })

  it('blocks view-only users', async () => {
    await build(viewOnlyUser).get('/organisations/7/edit').expect(403)
  })

  it('saves valid changes and redirects to the organisation', async () => {
    organisationsService.updateOrganisation.mockResolvedValue(organisation)
    await build()
      .post('/organisations/7/edit')
      .type('form')
      .send({ organisationName: 'Renamed', organisationTypes: 'OTHER', active: 'true', action: 'save' })
      .expect(302)
      .expect('Location', '/organisations/7')
    expect(organisationsService.updateOrganisation).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ organisationName: 'Renamed' }),
      expect.anything(),
    )
  })

  it('does not call the service when validation fails', async () => {
    await build()
      .post('/organisations/7/edit')
      .type('form')
      .send({ organisationName: '', active: 'true', action: 'save' })
      .expect(302)
    expect(organisationsService.updateOrganisation).not.toHaveBeenCalled()
  })

  it('keeps entered data on add actions without validating', async () => {
    const agent = build()
    await agent
      .post('/organisations/7/edit')
      .type('form')
      .send({ organisationName: '', action: 'add-phone', 'phoneNumbers[0][phoneNumber]': '0114' })
      .expect(302)
      .expect('Location', '/organisations/7/edit')
    const $ = cheerio.load((await agent.get('/organisations/7/edit')).text)
    expect($('[id="phoneNumbers[0][phoneNumber]"]').val()).toBe('0114')
    expect($('[id="phoneNumbers[1][phoneNumber]"]')).toHaveLength(1)
  })

  it('reports an API rejection', async () => {
    organisationsService.updateOrganisation.mockRejectedValue(new OrganisationRejectedError('no'))
    await build()
      .post('/organisations/7/edit')
      .type('form')
      .send({ organisationName: 'Org', organisationTypes: 'OTHER', active: 'true', action: 'save' })
      .expect(302)
      .expect('Location', /\/organisations\/7\/edit/)
  })
})

describe('delete', () => {
  it('asks for confirmation', async () => {
    const res = await build().get('/organisations/7/delete').expect(200)
    const $ = cheerio.load(res.text)
    expect($('[data-qa=main-heading]').text()).toBe('Are you sure you want to delete this organisation?')
    expect($('[data-qa=cancel-link]').attr('href')).toBe('/organisations/7')
  })

  it('deletes and returns to the list', async () => {
    organisationsService.deleteOrganisation.mockResolvedValue(undefined)
    await build().post('/organisations/7/delete').type('form').send({}).expect(302).expect('Location', '/organisations')
    expect(organisationsService.deleteOrganisation).toHaveBeenCalledWith(7, expect.anything())
  })

  it('blocks view-only users', async () => {
    await build(viewOnlyUser).post('/organisations/7/delete').type('form').send({}).expect(403)
    expect(organisationsService.deleteOrganisation).not.toHaveBeenCalled()
  })
})
