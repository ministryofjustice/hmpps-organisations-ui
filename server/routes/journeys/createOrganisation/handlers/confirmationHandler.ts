import { Request, Response } from 'express'
import createError from 'http-errors'
import { Page } from '../../..'
import { PageHandler } from '../../../interfaces/pageHandler'

export default class CreateOrganisationConfirmationHandler implements PageHandler {
  public PAGE_NAME = Page.CREATE_ORGANISATION_CONFIRMATION_PAGE

  public GET = async (req: Request, res: Response) => {
    const organisationId = String(req.params.organisationId)
    if (!/^\d+$/.test(organisationId)) throw createError(404, 'Not found')

    const created = req.session.createdOrganisation
    res.render('pages/organisations/create/confirmation', {
      organisationId,
      created: created && String(created.organisationId) === organisationId ? created : null,
    })
  }
}
