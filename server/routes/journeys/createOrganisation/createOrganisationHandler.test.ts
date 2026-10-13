import request from 'supertest'
import * as cheerio from 'cheerio'
import { AuditService } from '@ministryofjustice/hmpps-audit-client'
import { appWithAllRoutes, user, viewOnlyUser } from '../../testutils/appSetup'
import OrganisationsService from '../../../services/organisationsService'
import OrganisationRejectedError from '../../../services/organisationRejectedError'
import { Page } from '../..'
import type { ReferenceData } from './createOrganisationSchema'

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

const build = (currentUser = user) =>
  request.agent(appWithAllRoutes({ services: { auditService, organisationsService }, userSupplier: () => currentUser }))

const URL = '/organisations/create'
const topLevelPhones = '[id^="phoneNumbers["][id$="[phoneNumber]"]'

beforeEach(() => {
  auditService.logPageView.mockResolvedValue(undefined)
  organisationsService.getReferenceData.mockResolvedValue(refData)
})

afterEach(jest.resetAllMocks)

describe('GET /organisations/create', () => {
  it('renders the page with all sections', async () => {
    const res = await build().get(URL).expect(200)
    const $ = cheerio.load(res.text)

    expect($('[data-qa=main-heading]').text()).toBe('Add an organisation')
    expect($('[data-qa=caption]').text()).toBe('Organisations')
    expect($('[data-qa=back-link]').attr('href')).toBe('/')
    expect($('[data-qa=cancel-link]').attr('href')).toBe('/organisations/create/cancel')
    expect(
      $('h2.govuk-heading-m')
        .map((_, el) => $(el).text())
        .get(),
    ).toEqual([
      'Organisation details',
      'Organisation types',
      'Status',
      'Phone numbers',
      'Email and web addresses',
      'Addresses',
    ])
    expect($('[id="organisationName"]')).toHaveLength(1)
    expect($('input[name="organisationTypes"]')).toHaveLength(1)
    expect($('input[name="active"][value="true"]').is(':checked')).toBe(true)
    expect($('[id="phoneNumbers[0][phoneNumber]"]')).toHaveLength(1)
    expect($('[id="internetAddresses[0][address]"]')).toHaveLength(1)
    expect($('[id="addresses[0][street]"]')).toHaveLength(1)
    expect($('[id="addresses[0][phoneNumbers][0][phoneNumber]"]')).toHaveLength(1)
    expect($('[id="deactivatedDate-day"]')).toHaveLength(1)
    expect(
      $('legend')
        .filter((_, el) => $(el).text().trim() === 'Address 1')
        .toArray(),
    ).toHaveLength(1)
    expect(auditService.logPageView).toHaveBeenCalledWith(Page.CREATE_ORGANISATION_PAGE, {
      who: user.username,
      correlationId: expect.any(String),
    })
  })

  it('blocks view-only users', async () => {
    const res = await build(viewOnlyUser).get(URL).expect(403)
    expect(res.text).toContain('You do not have permission to view this page')
  })
})

describe('POST /organisations/create', () => {
  const valid = { organisationName: 'Org', organisationTypes: 'OTHER', active: 'true', action: 'create' }

  it('adds and removes blocks without validating, keeping entered data', async () => {
    const agent = build()
    await agent
      .post(URL)
      .type('form')
      .send({ organisationName: '', action: 'add-phone', 'phoneNumbers[0][phoneNumber]': '0114' })
      .expect(302)
      .expect('Location', URL)
    expect(organisationsService.createOrganisation).not.toHaveBeenCalled()

    let $ = cheerio.load((await agent.get(URL).expect(200)).text)
    expect($(topLevelPhones)).toHaveLength(2)
    expect($('[id="phoneNumbers[0][phoneNumber]"]').val()).toBe('0114')
    expect($('[data-qa=error-summary]')).toHaveLength(0)

    await agent
      .post(URL)
      .type('form')
      .send({ action: 'remove-phone-1', 'phoneNumbers[0][phoneNumber]': '0114', 'phoneNumbers[1][phoneNumber]': '' })
      .expect(302)
    $ = cheerio.load((await agent.get(URL)).text)
    expect($(topLevelPhones)).toHaveLength(1)
  })

  it('hides Add another at the cap', async () => {
    const agent = build()
    for (let i = 0; i < 6; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await agent
        .post(URL)
        .type('form')
        .send({
          action: 'add-phone',
          ...Object.fromEntries(Array.from({ length: i }, (_, j) => [`phoneNumbers[${j}][phoneNumber]`, ''])),
        })
    }
    const $ = cheerio.load((await agent.get(URL)).text)
    expect($(topLevelPhones)).toHaveLength(5)
    expect($('[data-qa=add-phone]')).toHaveLength(0)
  })

  it('shows errors and retains values after a validation failure', async () => {
    const agent = build()
    await agent
      .post(URL)
      .set('Referer', URL)
      .type('form')
      .send({ ...valid, organisationName: '', vatNumber: 'ABC', 'phoneNumbers[0][phoneNumber]': 'abc' })
      .expect(302)
      .expect('Location', URL)
    const $ = cheerio.load((await agent.get(URL)).text)

    const messages = $('.govuk-error-summary__list a')
      .map((_, el) => $(el).text())
      .get()
    expect(messages).toEqual(expect.arrayContaining(['Enter the organisation name', 'Select a phone type']))
    expect($('.govuk-error-summary__list a[href="#phoneNumbers[0][phoneNumber]"]')).toHaveLength(1)
    expect($('[id="vatNumber"]').val()).toBe('ABC')
    expect(organisationsService.createOrganisation).not.toHaveBeenCalled()
  })

  it('creates the organisation and redirects to the confirmation page', async () => {
    organisationsService.createOrganisation.mockResolvedValue({
      organisationId: 123,
      organisationName: 'Org',
      active: true,
    } as never)
    const agent = build()

    await agent.post(URL).type('form').send(valid).expect(302).expect('Location', `${URL}/confirmation/123`)

    expect(organisationsService.createOrganisation).toHaveBeenCalledWith(
      expect.objectContaining({ organisationName: 'Org', organisationTypes: ['OTHER'], active: true }),
      expect.objectContaining({ username: 'user1' }),
    )
    const $ = cheerio.load((await agent.get(`${URL}/confirmation/123`).expect(200)).text)
    expect($('[data-qa=confirmation-panel]').text()).toContain('Organisation created')
    expect($('[data-qa=confirmation-summary]').text()).toContain('Org')
    expect($('[data-qa=add-another-link]').attr('href')).toBe(URL)
    expect($('[data-qa=homepage-link]').attr('href')).toBe('/')
    expect(auditService.logPageView).toHaveBeenCalledWith(Page.CREATE_ORGANISATION_CONFIRMATION_PAGE, {
      who: user.username,
      correlationId: expect.any(String),
    })
  })

  it('shows a generic error when the API rejects the request', async () => {
    organisationsService.createOrganisation.mockRejectedValue(new OrganisationRejectedError('no'))
    const agent = build()
    await agent.post(URL).type('form').send(valid).expect(302).expect('Location', URL)
    const $ = cheerio.load((await agent.get(URL)).text)
    expect($('.govuk-error-summary').text()).toContain('The organisation could not be created')
  })

  it('clears the saved form on cancel', async () => {
    const agent = build()
    await agent.post(URL).type('form').send({ action: 'add-phone', organisationName: 'Keep me' })
    await agent.get('/organisations/create/cancel').expect(302).expect('Location', '/')
    const $ = cheerio.load((await agent.get(URL)).text)
    expect($('[id="organisationName"]').val()).toBeUndefined()
  })

  it('blocks view-only users', async () => {
    await build(viewOnlyUser).post(URL).type('form').send(valid).expect(403)
    expect(organisationsService.createOrganisation).not.toHaveBeenCalled()
  })
})

describe('GET /organisations/create/confirmation/:organisationId', () => {
  it('returns 404 for a non-numeric id', async () => {
    await build().get(`${URL}/confirmation/abc`).expect(404)
  })
})
