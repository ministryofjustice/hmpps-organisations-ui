import { Request, Response } from 'express'
import z from 'zod'
import { Page } from '../../..'
import { PageHandler } from '../../../interfaces/pageHandler'
import OrganisationsService from '../../../../services/organisationsService'
import OrganisationRejectedError from '../../../../services/organisationRejectedError'
import { createOrganisationSchema } from '../createOrganisationSchema'
import { applyListAction, FormBody, MAX_ITEMS, toViewForm } from '../createOrganisationForm'

const CREATE_URL = '/organisations/create'
const REJECTED_MESSAGE = 'The organisation could not be created. Check the details you entered and try again'

export default class CreateOrganisationHandler implements PageHandler {
  constructor(private readonly organisationsService: OrganisationsService) {}

  public PAGE_NAME = Page.CREATE_ORGANISATION_PAGE

  public GET = async (req: Request, res: Response) => {
    const refData = await this.organisationsService.getReferenceData(res.locals.user)
    const stored = res.locals.formResponses ?? req.session.createOrganisationForm ?? { active: 'true' }

    res.render('pages/organisations/create/create', {
      form: toViewForm(stored),
      refData,
      maxItems: MAX_ITEMS,
      backUrl: '/',
    })
  }

  public BODY = async (req: Request, res: Response) => {
    const action = (req.body as FormBody)?.action
    if (typeof action === 'string' && action !== 'create') return z.looseObject({})
    return createOrganisationSchema(await this.organisationsService.getReferenceData(res.locals.user))
  }

  public POST = async (req: Request, res: Response) => {
    const { _csrf, action, ...submitted } = req.rawBody as FormBody
    req.session.createOrganisationForm = submitted

    if (typeof action === 'string' && action !== 'create') {
      req.session.createOrganisationForm = applyListAction(submitted, action)
      return res.redirect(CREATE_URL)
    }

    try {
      const created = await this.organisationsService.createOrganisation(req.body, res.locals.user)
      req.session.createdOrganisation = {
        organisationId: created.organisationId,
        organisationName: created.organisationName,
        active: created.active,
      }
      delete req.session.createOrganisationForm
      return res.redirect(`${CREATE_URL}/confirmation/${created.organisationId}`)
    } catch (error) {
      if (error instanceof OrganisationRejectedError) {
        res.addValidationError(REJECTED_MESSAGE, 'organisationName')
        return res.validationFailed(CREATE_URL)
      }
      throw error
    }
  }
}
