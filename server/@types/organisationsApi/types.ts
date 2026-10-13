/*
 * Hand-written from OrganisationV2CreateRequest / OrganisationV2Details / ReferenceCode in hmpps-organisations-api
 * (branch MNG-27). Replace with aliases over generated types (see generate-organisations-api-types.sh) once
 * POST /organisation/v2 is merged and published in the API's OpenAPI docs.
 */

export type OrganisationV2PhoneRequest = {
  phoneType: string
  phoneNumber: string
  extNumber?: string | null
}

export type OrganisationV2InternetAddressRequest = {
  type: 'EMAIL' | 'WEB'
  address: string
}

export type OrganisationV2AddressRequest = {
  noFixedAddress: boolean
  flat?: string | null
  property?: string | null
  street?: string | null
  area?: string | null
  cityCode?: string | null
  countyCode?: string | null
  postCode?: string | null
  countryCode?: string | null
  startDate?: string | null
  endDate?: string | null
  comments?: string | null
  addressType?: string | null
  serviceAddress: boolean
  active: boolean
  specialNeedsCode?: string | null
  primaryAddress: boolean
  mailAddress: boolean
  contactPersonName?: string | null
  businessHours?: string | null
  phoneNumbers: OrganisationV2PhoneRequest[]
}

export type OrganisationV2CreateRequest = {
  organisationName: string
  programmeNumber?: string | null
  vatNumber?: string | null
  caseloadId?: string | null
  comments?: string | null
  organisationTypes: string[]
  active: boolean
  deactivatedDate?: string | null
  phoneNumbers: OrganisationV2PhoneRequest[]
  internetAddresses: OrganisationV2InternetAddressRequest[]
  addresses: OrganisationV2AddressRequest[]
  createdBy: string
  createdTime: string
  updatedBy?: string | null
  updatedTime?: string | null
}

export type OrganisationV2Details = OrganisationV2CreateRequest & {
  organisationId: number
}

export type ReferenceCodeGroup =
  'ORGANISATION_TYPE' | 'PHONE_TYPE' | 'ADDRESS_TYPE' | 'CITY' | 'COUNTY' | 'COUNTRY' | 'ORG_ADDRESS_SPECIAL_NEEDS'

export type ReferenceCode = {
  referenceCodeId: number
  groupCode: ReferenceCodeGroup
  code: string
  description: string
  displayOrder: number
  isActive: boolean
}

export type OrganisationSummary = {
  organisationId: number
  organisationName: string
  organisationActive: boolean
  flat?: string | null
  property?: string | null
  street?: string | null
  area?: string | null
  cityCode?: string | null
  cityDescription?: string | null
  countyCode?: string | null
  countyDescription?: string | null
  postcode?: string | null
  countryCode?: string | null
  countryDescription?: string | null
  businessPhoneNumber?: string | null
  businessPhoneNumberExtension?: string | null
}

export type PagedModel<T> = {
  content: T[]
  page: { size: number; number: number; totalElements: number; totalPages: number }
}
