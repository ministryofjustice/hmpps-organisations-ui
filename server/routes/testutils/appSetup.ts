import express, { Express } from 'express'
import { NotFound } from 'http-errors'
import flash from 'connect-flash'
import { AuditService } from '@ministryofjustice/hmpps-audit-client'

import routes from '../index'
import nunjucksSetup from '../../utils/nunjucksSetup'
import errorHandler from '../../errorHandler'
import type { Services } from '../../services'
import { HmppsUser } from '../../interfaces/hmppsUser'
import setUpWebSession from '../../middleware/setUpWebSession'
import setUpFlash from '../../middleware/setUpFlash'
import type { ApplicationInfo } from '../../applicationInfo'

jest.mock('@ministryofjustice/hmpps-audit-client')

export const user: HmppsUser = {
  name: 'FIRST LAST',
  userId: 'id',
  userUuid: '11111111-1111-1111-1111-111111111111',
  token: 'token',
  username: 'user1',
  displayName: 'First Last',
  authSource: 'nomis',
  staffId: 1234,
  userRoles: ['ORGANISATIONS__RW'],
}

export const viewOnlyUser: HmppsUser = { ...user, userRoles: ['ORGANISATIONS__R'] }

const applicationInfo: ApplicationInfo = {
  applicationName: 'hmpps-organisations-ui',
  buildNumber: '123',
  gitRef: 'abc123',
  gitShortHash: 'abc',
  productId: 'DPSXYZ',
  branchName: 'main',
}

function appSetup(services: Partial<Services>, production: boolean, userSupplier: () => HmppsUser): Express {
  const app = express()

  app.set('view engine', 'njk')

  nunjucksSetup(app)
  app.use(setUpWebSession())
  app.use(flash())
  app.use((req, res, next) => {
    req.user = userSupplier() as Express.User
    res.locals = {
      user: { ...req.user } as HmppsUser,
      cspNonce: '',
      csrfToken: '',
      asset_path: '',
      applicationName: '',
      environmentName: '',
      environmentNameColour: '',
    }
    next()
  })
  app.use((req, _res, next) => {
    req.id = '4d0fd4da-ecc1-454d-8308-cdee6b8b91f7'
    next()
  })
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(setUpFlash())
  app.use(routes({ applicationInfo, ...services } as Services))
  app.use((_req, _res, next) => next(new NotFound()))
  app.use(errorHandler(production))

  return app
}

export function appWithAllRoutes({
  production = false,
  services = {
    auditService: new AuditService({} as never) as jest.Mocked<AuditService>,
  },
  userSupplier = () => user,
}: {
  production?: boolean
  services?: Partial<Services>
  userSupplier?: () => HmppsUser
}): Express {
  return appSetup(services as Services, production, userSupplier)
}
