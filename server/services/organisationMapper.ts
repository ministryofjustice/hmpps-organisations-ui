import { format } from 'date-fns'
import type { CreateOrganisationForm } from '../routes/journeys/createOrganisation/createOrganisationSchema'
import type { OrganisationV2CreateRequest } from '../@types/organisationsApi/types'

const orNull = <T>(value: T | undefined): T | null => (value === undefined ? null : value)

/** Maps validated form values to the API request; audit fields come from the signed-in user, never the form */
export default function toCreateOrganisationRequest(
  form: CreateOrganisationForm,
  username: string,
  now: Date = new Date(),
): OrganisationV2CreateRequest {
  return {
    organisationName: form.organisationName,
    programmeNumber: orNull(form.programmeNumber),
    vatNumber: orNull(form.vatNumber),
    caseloadId: orNull(form.caseloadId),
    comments: orNull(form.comments),
    organisationTypes: form.organisationTypes,
    active: form.active,
    deactivatedDate: orNull(form.deactivatedDate),
    phoneNumbers: form.phoneNumbers.map(phone => ({ ...phone, extNumber: orNull(phone.extNumber) })),
    internetAddresses: form.internetAddresses,
    addresses: form.addresses.map(address => ({
      noFixedAddress: address.noFixedAddress,
      flat: orNull(address.flat),
      property: orNull(address.property),
      street: orNull(address.street),
      area: orNull(address.area),
      cityCode: orNull(address.cityCode),
      countyCode: orNull(address.countyCode),
      postCode: orNull(address.postCode),
      countryCode: orNull(address.countryCode),
      startDate: orNull(address.startDate),
      endDate: orNull(address.endDate),
      comments: orNull(address.comments),
      addressType: orNull(address.addressType),
      serviceAddress: address.serviceAddress,
      specialNeedsCode: orNull(address.specialNeedsCode),
      primaryAddress: address.primaryAddress,
      mailAddress: address.mailAddress,
      contactPersonName: orNull(address.contactPersonName),
      businessHours: orNull(address.businessHours),
      phoneNumbers: address.phoneNumbers.map(phone => ({ ...phone, extNumber: orNull(phone.extNumber) })),
    })),
    createdBy: username,
    createdTime: format(now, "yyyy-MM-dd'T'HH:mm:ss"),
    updatedBy: null,
    updatedTime: null,
  }
}
