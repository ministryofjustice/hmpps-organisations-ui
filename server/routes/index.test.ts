import request from 'supertest'
import * as cheerio from 'cheerio'
import { AuditService } from '@ministryofjustice/hmpps-audit-client'
import { appWithAllRoutes, user, viewOnlyUser } from './testutils/appSetup'
import { Page } from '.'

jest.mock('@ministryofjustice/hmpps-audit-client')

const auditService = new AuditService({} as never) as jest.Mocked<AuditService>

afterEach(jest.resetAllMocks)

describe('GET /', () => {
  it('shows the add organisation card to managers and audits the view', async () => {
    const app = appWithAllRoutes({ services: { auditService }, userSupplier: () => user })
    const res = await request(app).get('/').expect(200)
    const $ = cheerio.load(res.text)
    expect($('[data-qa=main-heading]').text()).toBe('Organisations')
    expect($('[data-qa=add-organisation-card] a').attr('href')).toBe('/organisations/create')
    expect(auditService.logPageView).toHaveBeenCalledWith(Page.HOME_PAGE, {
      who: user.username,
      correlationId: expect.any(String),
    })
  })

  it('hides the card from view-only users', async () => {
    const app = appWithAllRoutes({ services: { auditService }, userSupplier: () => viewOnlyUser })
    const $ = cheerio.load((await request(app).get('/').expect(200)).text)
    expect($('[data-qa=add-organisation-card]')).toHaveLength(0)
  })

  it('shows not authorised without a service role', async () => {
    const app = appWithAllRoutes({ services: { auditService }, userSupplier: () => ({ ...user, userRoles: [] }) })
    await request(app).get('/').expect(403)
  })
})
