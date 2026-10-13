import { RequestHandler, Router } from 'express'
import type { Services } from '../../../services'
import logPageViewMiddleware from '../../../middleware/logPageViewMiddleware'
import validationMiddleware from '../../../middleware/validationMiddleware'
import { requirePermissions } from '../../../middleware/requirePermissions'
import { Permission } from '../../../interfaces/hmppsUser'
import { PageHandler } from '../../interfaces/pageHandler'
import ViewOrganisationHandler from './handlers/viewOrganisationHandler'
import EditOrganisationHandler from './handlers/editOrganisationHandler'
import DeleteOrganisationHandler from './handlers/deleteOrganisationHandler'

export default function Index({ auditService, organisationsService }: Services): Router {
  const router = Router({ mergeParams: true })

  // Non-numeric ids (e.g. "create") fall through to the other organisation routers
  router.param('organisationId', (_req, _res, next, id) => (/^\d+$/.test(String(id)) ? next() : next('router')))

  const wrap =
    (fn: PageHandler['GET']): RequestHandler =>
    (req, res, next) =>
      fn(req, res, next).catch(next)

  const route = (path: string, permission: Permission, handler: PageHandler) => {
    const allowed = requirePermissions('ORGANISATIONS', permission)
    router.get(path, allowed, logPageViewMiddleware(auditService, handler), wrap(handler.GET))
    if (handler.POST) router.post(path, allowed, validationMiddleware(handler.BODY!), wrap(handler.POST))
  }

  router.get('/:organisationId/edit/cancel', requirePermissions('ORGANISATIONS', Permission.MANAGE), (req, res) => {
    delete req.session.editOrganisationForm
    res.redirect(`/organisations/${req.params.organisationId}`)
  })

  route('/:organisationId', Permission.VIEW, new ViewOrganisationHandler(organisationsService))
  route('/:organisationId/edit', Permission.MANAGE, new EditOrganisationHandler(organisationsService))
  route('/:organisationId/delete', Permission.MANAGE, new DeleteOrganisationHandler(organisationsService))

  return router
}
