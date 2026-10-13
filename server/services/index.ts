import { AuditServiceFactory } from '@ministryofjustice/hmpps-audit-client'
import { dataAccess } from '../data'
import OrganisationsService from './organisationsService'
import logger from '../../logger'
import config from '../config'

export const services = () => {
  const { applicationInfo, organisationsApiClient } = dataAccess()

  const auditService = AuditServiceFactory.createInstance(config.sqs.audit, logger)

  return {
    applicationInfo,
    auditService,
    organisationsService: new OrganisationsService(organisationsApiClient),
  }
}

export type Services = ReturnType<typeof services>
