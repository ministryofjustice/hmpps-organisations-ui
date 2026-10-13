import { RequestHandler } from 'express'
import { Permission } from '../interfaces/hmppsUser'

// HMPPS Auth role names without the ROLE_ prefix
export enum AuthorisedRoles {
  VIEW = 'ORGANISATIONS__R',
  MANAGE = 'ORGANISATIONS__RW',
}

const roleMap: Record<string, Permission> = {
  [AuthorisedRoles.VIEW]: Permission.VIEW,
  [AuthorisedRoles.MANAGE]: Permission.MANAGE,
}

/** Any service role implies DEFAULT; MANAGE implies VIEW */
function normalise(mask: number): number {
  const hasAny = (mask & (Permission.VIEW | Permission.MANAGE)) !== 0
  const withDefault = hasAny ? mask | Permission.DEFAULT : mask
  return withDefault & Permission.MANAGE ? withDefault | Permission.VIEW : withDefault
}

export const populateUserPermissions: RequestHandler = (_req, res, next) => {
  const roles: string[] = res.locals.user.userRoles ?? []
  let mask = 0
  roles.forEach(role => {
    mask |= roleMap[role] ?? 0
  })
  res.locals.user.permissions = { ORGANISATIONS: normalise(mask) }
  return next()
}
