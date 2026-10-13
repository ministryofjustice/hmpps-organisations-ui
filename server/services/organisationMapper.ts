import { format } from 'date-fns'
import type { CreateOrganisationForm } from '../routes/journeys/createOrganisation/createOrganisationSchema'
import type {
  OrganisationV2CreateRequest,
  OrganisationV2Details,
  OrganisationV2PhoneRequest,
} from '../@types/organisationsApi/types'

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

/** Update keeps the original created audit values and records the signed-in user as the updater */
export function toUpdateOrganisationRequest(
  form: CreateOrganisationForm,
  existing: OrganisationV2Details,
  username: string,
  now: Date = new Date(),
): OrganisationV2CreateRequest {
  return {
    ...toCreateOrganisationRequest(form, username, now),
    createdBy: existing.createdBy,
    createdTime: existing.createdTime,
    updatedBy: username,
    updatedTime: format(now, "yyyy-MM-dd'T'HH:mm:ss"),
  }
}

const dateFields = (name: string, value: string | null | undefined) => {
  const [year, month, day] = value ? value.split('-') : []
  return value
    ? { [`${name}-day`]: String(Number(day)), [`${name}-month`]: String(Number(month)), [`${name}-year`]: year }
    : {}
}

const phoneFields = (phone: OrganisationV2PhoneRequest) => ({
  phoneType: phone.phoneType,
  phoneNumber: phone.phoneNumber,
  ...(phone.extNumber && { extNumber: phone.extNumber }),
})

const optional = (fields: Record<string, string | null | undefined>) =>
  Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== null && value !== undefined && value !== ''),
  )

/** Converts API details into the shape of the submitted form, so the edit page can reuse the create page */
export function toFormValues(details: OrganisationV2Details): Record<string, unknown> {
  return {
    ...optional({
      organisationName: details.organisationName,
      programmeNumber: details.programmeNumber,
      vatNumber: details.vatNumber,
      caseloadId: details.caseloadId,
      comments: details.comments,
    }),
    organisationTypes: details.organisationTypes,
    active: String(details.active),
    ...dateFields('deactivatedDate', details.deactivatedDate),
    phoneNumbers: details.phoneNumbers.map(phoneFields),
    internetAddresses: details.internetAddresses.map(({ type, address }) => ({ type, address })),
    addresses: details.addresses.map(address => ({
      ...optional({
        flat: address.flat,
        property: address.property,
        street: address.street,
        area: address.area,
        cityCode: address.cityCode,
        countyCode: address.countyCode,
        postCode: address.postCode,
        countryCode: address.countryCode,
        comments: address.comments,
        addressType: address.addressType,
        specialNeedsCode: address.specialNeedsCode,
        contactPersonName: address.contactPersonName,
        businessHours: address.businessHours,
      }),
      ...(address.noFixedAddress && { noFixedAddress: 'true' }),
      ...(address.serviceAddress && { serviceAddress: 'true' }),
      ...(address.primaryAddress && { primaryAddress: 'true' }),
      ...(address.mailAddress && { mailAddress: 'true' }),
      ...dateFields('startDate', address.startDate),
      ...dateFields('endDate', address.endDate),
      phoneNumbers: address.phoneNumbers.map(phoneFields),
    })),
  }
}
