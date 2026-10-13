import { Request, Response } from 'express'
import z from 'zod'
import { Page } from '../../..'
import { PageHandler } from '../../../interfaces/pageHandler'
import OrganisationsService from '../../../../services/organisationsService'
import OrganisationRejectedError from '../../../../services/organisationRejectedError'
import { toFormValues } from '../../../../services/organisationMapper'
import { createOrganisationSchema } from '../../createOrganisation/createOrganisationSchema'
import { applyListAction, FormBody, MAX_ITEMS, toViewForm } from '../../createOrganisation/createOrganisationForm'

const REJECTED_MESSAGE = 'The organisation could not be updated. Check the details you entered and try again'

export default class EditOrganisationHandler implements PageHandler {
  constructor(private readonly organisationsService: OrganisationsService) {}

  public PAGE_NAME = Page.EDIT_ORGANISATION_PAGE

  public GET = async (req: Request, res: Response) => {
    const organisationId = String(req.params.organisationId)
    const [organisation, refData] = await Promise.all([
      this.organisationsService.getOrganisation(Number(organisationId), res.locals.user),
      this.organisationsService.getReferenceData(res.locals.user),
    ])
    const saved = req.session.editOrganisationForm
    const stored =
      res.locals.formResponses ??
      (saved?.organisationId === organisationId ? saved.form : undefined) ??
      toFormValues(organisation)

    res.render('pages/organisations/create/create', {
      mode: 'edit',
      organisation,
      form: toViewForm(stored),
      refData,
      maxItems: MAX_ITEMS,
      backUrl: `/organisations/${organisationId}`,
    })
  }

  public BODY = async (req: Request, res: Response) => {
    const action = (req.body as FormBody)?.action
    if (typeof action === 'string' && action !== 'save') return z.looseObject({})
    return createOrganisationSchema(await this.organisationsService.getReferenceData(res.locals.user))
  }

  public POST = async (req: Request, res: Response) => {
    const organisationId = String(req.params.organisationId)
    const editUrl = `/organisations/${organisationId}/edit`
    const { _csrf, action, ...submitted } = req.rawBody as FormBody
    req.session.editOrganisationForm = { organisationId, form: submitted }

    if (typeof action === 'string' && action !== 'save') {
      req.session.editOrganisationForm = { organisationId, form: applyListAction(submitted, action) }
      return res.redirect(editUrl)
    }

    try {
      const updated = await this.organisationsService.updateOrganisation(
        Number(organisationId),
        req.body,
        res.locals.user,
      )
      delete req.session.editOrganisationForm
      res.addSuccessMessage('Organisation updated', `${updated.organisationName} has been updated`)
      return res.redirect(`/organisations/${organisationId}`)
    } catch (error) {
      if (error instanceof OrganisationRejectedError) {
        res.addValidationError(REJECTED_MESSAGE, 'organisationName')
        return res.validationFailed(editUrl)
      }
      throw error
    }
  }
}
