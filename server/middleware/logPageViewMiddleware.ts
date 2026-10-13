import type { NextFunction, Request, RequestHandler, Response } from 'express'
import type { AuditService } from '@ministryofjustice/hmpps-audit-client'
import { PageHandler } from '../routes/interfaces/pageHandler'

export default function logPageViewMiddleware(auditService: AuditService, pageHandler: PageHandler): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    await auditService.logPageView(pageHandler.PAGE_NAME, { who: res.locals.user.username, correlationId: req.id })
    return next()
  }
}
