import { RequestHandler, Router } from 'express'
import type { Services } from '../../../services'
import logPageViewMiddleware from '../../../middleware/logPageViewMiddleware'
import validationMiddleware from '../../../middleware/validationMiddleware'
import { requirePermissions } from '../../../middleware/requirePermissions'
import { Permission } from '../../../interfaces/hmppsUser'
import { PageHandler } from '../../interfaces/pageHandler'
import CreateOrganisationHandler from './handlers/createOrganisationHandler'
import CreateOrganisationConfirmationHandler from './handlers/confirmationHandler'

export default function Index({ auditService, organisationsService }: Services): Router {
  const router = Router({ mergeParams: true })
  router.use(requirePermissions('ORGANISATIONS', Permission.MANAGE))

  const wrap =
    (fn: PageHandler['GET']): RequestHandler =>
    (req, res, next) =>
      fn(req, res, next).catch(next)

  const route = (path: string, handler: PageHandler) => {
    router.get(path, logPageViewMiddleware(auditService, handler), wrap(handler.GET))
    if (handler.POST) router.post(path, validationMiddleware(handler.BODY!), wrap(handler.POST))
  }

  router.get('/create/cancel', (req, res) => {
    delete req.session.createOrganisationForm
    res.redirect('/')
  })

  route('/create', new CreateOrganisationHandler(organisationsService))
  route('/create/confirmation/:organisationId', new CreateOrganisationConfirmationHandler())

  return router
}
