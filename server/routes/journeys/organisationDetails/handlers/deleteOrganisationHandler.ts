import { Request, Response } from 'express'
import z from 'zod'
import { Page } from '../../..'
import { PageHandler } from '../../../interfaces/pageHandler'
import OrganisationsService from '../../../../services/organisationsService'

export default class DeleteOrganisationHandler implements PageHandler {
  constructor(private readonly organisationsService: OrganisationsService) {}

  public PAGE_NAME = Page.DELETE_ORGANISATION_PAGE

  public GET = async (req: Request, res: Response) => {
    const organisation = await this.organisationsService.getOrganisation(
      Number(req.params.organisationId),
      res.locals.user,
    )
    res.render('pages/organisations/delete/delete', {
      organisation,
      backUrl: `/organisations/${organisation.organisationId}`,
    })
  }

  public BODY = z.looseObject({})

  public POST = async (req: Request, res: Response) => {
    const organisationId = Number(req.params.organisationId)
    const organisation = await this.organisationsService.getOrganisation(organisationId, res.locals.user)
    await this.organisationsService.deleteOrganisation(organisationId, res.locals.user)
    res.addSuccessMessage('Organisation deleted', `${organisation.organisationName} has been deleted`)
    res.redirect('/organisations')
  }
}
