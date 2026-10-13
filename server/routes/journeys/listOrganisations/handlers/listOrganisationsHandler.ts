import { Request, Response } from 'express'
import { Page } from '../../..'
import { PageHandler } from '../../../interfaces/pageHandler'
import OrganisationsService from '../../../../services/organisationsService'

export const PAGE_SIZE = 20

export default class ListOrganisationsHandler implements PageHandler {
  constructor(private readonly organisationsService: OrganisationsService) {}

  public PAGE_NAME = Page.LIST_ORGANISATIONS_PAGE

  public GET = async (req: Request, res: Response) => {
    const name = typeof req.query.name === 'string' ? req.query.name.trim().slice(0, 40) : ''
    const requested = parseInt(String(req.query.page ?? '1'), 10)
    const pageNumber = Number.isFinite(requested) && requested > 0 ? requested : 1

    const result = await this.organisationsService.listOrganisations(name, pageNumber - 1, PAGE_SIZE, res.locals.user)
    const { totalElements, totalPages } = result.page

    res.render('pages/organisations/list/list', {
      name,
      organisations: result.content,
      totalElements,
      pagination: totalPages > 1 ? this.pagination(name, pageNumber, totalPages) : null,
    })
  }

  private pagination = (name: string, current: number, totalPages: number) => {
    const href = (page: number) =>
      `/organisations?${new URLSearchParams({ ...(name && { name }), page: String(page) })}`
    return {
      previous: current > 1 ? { href: href(current - 1) } : undefined,
      next: current < totalPages ? { href: href(current + 1) } : undefined,
      items: Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter(page => page === 1 || page === totalPages || Math.abs(page - current) <= 2)
        .flatMap((page, i, pages) => [
          ...(i > 0 && page - pages[i - 1] > 1 ? [{ ellipsis: true }] : []),
          { number: page, href: href(page), current: page === current },
        ]),
    }
  }
}
