import { RequestHandler, Router } from 'express'
import type { Services } from '../../../services'
import logPageViewMiddleware from '../../../middleware/logPageViewMiddleware'
import { requirePermissions } from '../../../middleware/requirePermissions'
import { Permission } from '../../../interfaces/hmppsUser'
import ListOrganisationsHandler from './handlers/listOrganisationsHandler'

export default function Index({ auditService, organisationsService }: Services): Router {
  const router = Router({ mergeParams: true })
  const handler = new ListOrganisationsHandler(organisationsService)

  const wrap: RequestHandler = (req, res, next) => handler.GET(req, res).catch(next)

  router.get(
    '/',
    requirePermissions('ORGANISATIONS', Permission.VIEW),
    logPageViewMiddleware(auditService, handler),
    wrap,
  )

  return router
}
