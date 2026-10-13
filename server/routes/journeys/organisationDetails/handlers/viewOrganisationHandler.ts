import { Request, Response } from 'express'
import { Page } from '../../..'
import { PageHandler } from '../../../interfaces/pageHandler'
import OrganisationsService from '../../../../services/organisationsService'
import type { OrganisationV2AddressRequest, ReferenceCode } from '../../../../@types/organisationsApi/types'

const joinLines = (parts: (string | null | undefined)[]) => parts.filter(Boolean).join(', ')

export default class ViewOrganisationHandler implements PageHandler {
  constructor(private readonly organisationsService: OrganisationsService) {}

  public PAGE_NAME = Page.VIEW_ORGANISATION_PAGE

  public GET = async (req: Request, res: Response) => {
    const organisationId = Number(req.params.organisationId)
    const [organisation, refData] = await Promise.all([
      this.organisationsService.getOrganisation(organisationId, res.locals.user),
      this.organisationsService.getReferenceData(res.locals.user),
    ])

    const describe = (codes: Pick<ReferenceCode, 'code' | 'description'>[], code?: string | null) =>
      code ? (codes.find(c => c.code === code)?.description ?? code) : undefined
    const phone = (p: { phoneType: string; phoneNumber: string; extNumber?: string | null }) =>
      `${describe(refData.PHONE_TYPE, p.phoneType)}: ${p.phoneNumber}${p.extNumber ? ` ext. ${p.extNumber}` : ''}`
    const address = (a: OrganisationV2AddressRequest) => ({
      ...a,
      type: describe(refData.ADDRESS_TYPE, a.addressType),
      lines: a.noFixedAddress
        ? 'No fixed address'
        : joinLines([
            a.flat,
            a.property,
            a.street,
            a.area,
            describe(refData.CITY, a.cityCode),
            describe(refData.COUNTY, a.countyCode),
            a.postCode,
            describe(refData.COUNTRY, a.countryCode),
          ]),
      specialNeeds: describe(refData.ORG_ADDRESS_SPECIAL_NEEDS, a.specialNeedsCode),
      phones: a.phoneNumbers.map(phone),
    })

    res.render('pages/organisations/view/view', {
      organisation,
      types: organisation.organisationTypes.map(type => describe(refData.ORGANISATION_TYPE, type)),
      phones: organisation.phoneNumbers.map(phone),
      emails: organisation.internetAddresses.filter(i => i.type === 'EMAIL').map(i => i.address),
      webAddresses: organisation.internetAddresses.filter(i => i.type === 'WEB').map(i => i.address),
      addresses: organisation.addresses.map(address),
      backUrl: '/organisations',
    })
  }
}
