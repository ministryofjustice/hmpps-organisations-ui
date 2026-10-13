import { Router } from 'express'

import type { Services } from '../services'
import { populateUserPermissions } from '../middleware/populateUserPermissions'
import { requirePermissions } from '../middleware/requirePermissions'
import { Permission } from '../interfaces/hmppsUser'
import createOrganisationRoutes from './journeys/createOrganisation'

export enum Page {
  HOME_PAGE = 'HOME_PAGE',
  CREATE_ORGANISATION_PAGE = 'CREATE_ORGANISATION_PAGE',
  CREATE_ORGANISATION_CONFIRMATION_PAGE = 'CREATE_ORGANISATION_CONFIRMATION_PAGE',
}

export default function routes(services: Services): Router {
  const { auditService } = services
  const router = Router()

  router.use(populateUserPermissions)

  router.get('/', requirePermissions('ORGANISATIONS', Permission.DEFAULT), async (req, res) => {
    await auditService.logPageView(Page.HOME_PAGE, { who: res.locals.user.username, correlationId: req.id })
    res.render('pages/index')
  })

  router.use('/organisations', createOrganisationRoutes(services))

  return router
}
