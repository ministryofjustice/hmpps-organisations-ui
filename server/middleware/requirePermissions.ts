import { NextFunction, Request, Response } from 'express'
import { HmppsUser, Permission } from '../interfaces/hmppsUser'

type Service = 'ORGANISATIONS'

const SERVICE_NAMES = { ORGANISATIONS: 'Organisations' }

export const hasPerm = (mask: number, perm: Permission) => (mask & perm) === perm

export const requirePermissions =
  (service: Service, permissions: Permission) => (_req: Request, res: Response, next: NextFunction) => {
    if (hasPerm(res.locals.user.permissions?.[service] ?? 0, permissions)) return next()
    return res.status(403).render('pages/not-authorised', { serviceName: SERVICE_NAMES[service] })
  }

export const hasPermissionFilter = (user: HmppsUser, permission: Permission, service: Service = 'ORGANISATIONS') =>
  hasPerm(user.permissions?.[service] ?? 0, permission)
