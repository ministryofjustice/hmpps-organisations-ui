import { z } from 'zod'
import { MAX_ITEMS, normaliseBody } from './createOrganisationForm'
import { parseDateFields } from '../../../utils/dateFields'
import type { ReferenceCode, ReferenceCodeGroup } from '../../../@types/organisationsApi/types'

export type ReferenceData = Record<ReferenceCodeGroup, Pick<ReferenceCode, 'code' | 'description'>[]>

const tooLong = (label: string, max: number) => `${label} must be ${max} characters or less`

export const ERRORS = {
  INVALID: 'Enter a valid value',
  NAME_REQUIRED: 'Enter the organisation name',
  NAME_TOO_LONG: tooLong('Organisation name', 40),
  PROGRAMME_NUMBER_TOO_LONG: tooLong('Programme number', 40),
  VAT_NUMBER_TOO_LONG: tooLong('VAT number', 12),
  CASELOAD_ID_TOO_LONG: tooLong('Caseload ID', 6),
  COMMENTS_TOO_LONG: tooLong('Comments', 240),
  ORGANISATION_TYPE_REQUIRED: 'Select at least one organisation type',
  ORGANISATION_TYPE_INVALID: 'Select a valid organisation type',
  ORGANISATION_TYPE_DUPLICATE: 'Organisation types must not contain duplicates',
  STATUS_REQUIRED: 'Select whether the organisation is active or inactive',
  DEACTIVATED_DATE_WHEN_ACTIVE: 'Deactivated date can only be entered for an inactive organisation',
  PHONE_TYPE_REQUIRED: 'Select a phone type',
  PHONE_NUMBER_REQUIRED: 'Enter a phone number',
  PHONE_NUMBER_TOO_LONG: tooLong('Phone number', 40),
  PHONE_NUMBER_FORMAT: 'Phone number must only include numbers, spaces and ( ) + -',
  EXTENSION_TOO_LONG: tooLong('Extension', 7),
  EXTENSION_FORMAT: 'Extension must only include numbers',
  INTERNET_TYPE_REQUIRED: 'Select whether this is an email or web address',
  INTERNET_ADDRESS_REQUIRED: 'Enter the email or web address',
  INTERNET_ADDRESS_TOO_LONG: tooLong('Email or web address', 240),
  EMAIL_INVALID: 'Enter a valid email address',
  WEB_INVALID: 'Enter a valid web address',
  FLAT_TOO_LONG: tooLong('Flat', 30),
  PROPERTY_TOO_LONG: tooLong('Property', 135),
  STREET_TOO_LONG: tooLong('Street', 160),
  AREA_TOO_LONG: tooLong('Area', 70),
  POSTCODE_TOO_LONG: tooLong('Postcode', 12),
  ADDRESS_COMMENTS_TOO_LONG: tooLong('Address comments', 240),
  CONTACT_PERSON_TOO_LONG: tooLong('Contact person name', 40),
  BUSINESS_HOURS_TOO_LONG: tooLong('Business hours', 60),
  CITY_INVALID: 'Select a valid town or city',
  COUNTY_INVALID: 'Select a valid county',
  COUNTRY_INVALID: 'Select a valid country',
  ADDRESS_TYPE_INVALID: 'Select a valid address type',
  SPECIAL_NEEDS_INVALID: 'Select a valid special needs option',
  END_BEFORE_START: 'End date must be the same as or after the start date',
  ONE_PRIMARY: 'Only one address can be the primary address',
  ONE_MAIL: 'Only one address can be the mail address',
}

const PHONE_NUMBER_REGEX = /^[0-9 ()+-]*$/
const EXTENSION_REGEX = /^[0-9]*$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const isValidEmail = (value: string) => EMAIL_REGEX.test(value)

export const isValidWebAddress = (value: string) => {
  if (/\s/.test(value)) return false
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    return url.hostname.includes('.') && !url.hostname.startsWith('.') && !url.hostname.endsWith('.')
  } catch {
    return false
  }
}

const text = (max: number, message: string) => z.string({ message: ERRORS.INVALID }).max(max, message).optional()
const checkbox = () => z.string({ message: ERRORS.INVALID }).optional()
const dateParts = (name: string) => ({
  [`${name}-day`]: z.string({ message: ERRORS.INVALID }).optional(),
  [`${name}-month`]: z.string({ message: ERRORS.INVALID }).optional(),
  [`${name}-year`]: z.string({ message: ERRORS.INVALID }).optional(),
})

type DateInput = object

/** Adds the right error for a day/month/year group and returns the date when it is complete and real */
const readDate = (input: DateInput, name: string, label: string, ctx: z.RefinementCtx): string | undefined => {
  const fields = input as Record<string, string | undefined>
  const result = parseDateFields(fields[`${name}-day`], fields[`${name}-month`], fields[`${name}-year`])
  if (result.status === 'ok') return result.value
  if (result.status === 'incomplete') {
    ctx.addIssue({
      code: 'custom',
      path: [`${name}-${result.missing[0]}`],
      message: `${label} must include a ${result.missing.join(' and ')}`,
    })
  } else if (result.status === 'invalid') {
    ctx.addIssue({ code: 'custom', path: [`${name}-day`], message: `${label} must be a real date` })
  }
  return undefined
}

const checkRef = (
  ctx: z.RefinementCtx,
  path: string,
  value: string | undefined,
  list: ReferenceData[ReferenceCodeGroup],
  message: string,
) => {
  if (value !== undefined && !list.some(item => item.code === value)) {
    ctx.addIssue({ code: 'custom', path: [path], message })
  }
}

const checkCheckbox = (ctx: z.RefinementCtx, path: string, value: string | undefined) => {
  if (value !== undefined && value !== 'true') ctx.addIssue({ code: 'custom', path: [path], message: ERRORS.INVALID })
}

// Run cross-field checks even when other fields failed, so every error is reported at once
const ALWAYS = { when: () => true }

const phoneSchema = (refs: ReferenceData) =>
  z
    .object({
      phoneType: z.string().optional(),
      phoneNumber: z
        .string({ message: ERRORS.PHONE_NUMBER_REQUIRED })
        .min(1, ERRORS.PHONE_NUMBER_REQUIRED)
        .max(40, ERRORS.PHONE_NUMBER_TOO_LONG)
        .regex(PHONE_NUMBER_REGEX, ERRORS.PHONE_NUMBER_FORMAT),
      extNumber: z
        .string({ message: ERRORS.INVALID })
        .max(7, ERRORS.EXTENSION_TOO_LONG)
        .regex(EXTENSION_REGEX, ERRORS.EXTENSION_FORMAT)
        .optional(),
    })
    .superRefine((phone, ctx) => {
      if (phone.phoneType === undefined) {
        ctx.addIssue({ code: 'custom', path: ['phoneType'], message: ERRORS.PHONE_TYPE_REQUIRED })
      } else {
        checkRef(ctx, 'phoneType', phone.phoneType, refs.PHONE_TYPE, ERRORS.PHONE_TYPE_REQUIRED)
      }
    }, ALWAYS)

const internetAddressSchema = z
  .object({
    type: z.string().optional(),
    address: z
      .string({ message: ERRORS.INTERNET_ADDRESS_REQUIRED })
      .min(1, ERRORS.INTERNET_ADDRESS_REQUIRED)
      .max(240, ERRORS.INTERNET_ADDRESS_TOO_LONG),
  })
  .superRefine((item, ctx) => {
    if (item.type !== 'EMAIL' && item.type !== 'WEB') {
      ctx.addIssue({ code: 'custom', path: ['type'], message: ERRORS.INTERNET_TYPE_REQUIRED })
    } else if (item.address && item.address.length <= 240) {
      if (item.type === 'EMAIL' && !isValidEmail(item.address)) {
        ctx.addIssue({ code: 'custom', path: ['address'], message: ERRORS.EMAIL_INVALID })
      }
      if (item.type === 'WEB' && !isValidWebAddress(item.address)) {
        ctx.addIssue({ code: 'custom', path: ['address'], message: ERRORS.WEB_INVALID })
      }
    }
  }, ALWAYS)

const addressSchema = (refs: ReferenceData) =>
  z
    .object({
      noFixedAddress: checkbox(),
      flat: text(30, ERRORS.FLAT_TOO_LONG),
      property: text(135, ERRORS.PROPERTY_TOO_LONG),
      street: text(160, ERRORS.STREET_TOO_LONG),
      area: text(70, ERRORS.AREA_TOO_LONG),
      cityCode: z.string({ message: ERRORS.CITY_INVALID }).optional(),
      countyCode: z.string({ message: ERRORS.COUNTY_INVALID }).optional(),
      postCode: text(12, ERRORS.POSTCODE_TOO_LONG),
      countryCode: z.string({ message: ERRORS.COUNTRY_INVALID }).optional(),
      ...dateParts('startDate'),
      ...dateParts('endDate'),
      comments: text(240, ERRORS.ADDRESS_COMMENTS_TOO_LONG),
      addressType: z.string({ message: ERRORS.ADDRESS_TYPE_INVALID }).optional(),
      serviceAddress: checkbox(),
      specialNeedsCode: z.string({ message: ERRORS.SPECIAL_NEEDS_INVALID }).optional(),
      primaryAddress: checkbox(),
      mailAddress: checkbox(),
      contactPersonName: text(40, ERRORS.CONTACT_PERSON_TOO_LONG),
      businessHours: text(60, ERRORS.BUSINESS_HOURS_TOO_LONG),
      phoneNumbers: z.array(phoneSchema(refs).nullable()).max(MAX_ITEMS),
    })
    .superRefine((address, ctx) => {
      checkRef(ctx, 'cityCode', address.cityCode, refs.CITY, ERRORS.CITY_INVALID)
      checkRef(ctx, 'countyCode', address.countyCode, refs.COUNTY, ERRORS.COUNTY_INVALID)
      checkRef(ctx, 'countryCode', address.countryCode, refs.COUNTRY, ERRORS.COUNTRY_INVALID)
      checkRef(ctx, 'addressType', address.addressType, refs.ADDRESS_TYPE, ERRORS.ADDRESS_TYPE_INVALID)
      checkRef(
        ctx,
        'specialNeedsCode',
        address.specialNeedsCode,
        refs.ORG_ADDRESS_SPECIAL_NEEDS,
        ERRORS.SPECIAL_NEEDS_INVALID,
      )
      ;(['noFixedAddress', 'serviceAddress', 'primaryAddress', 'mailAddress'] as const).forEach(name =>
        checkCheckbox(ctx, name, address[name]),
      )

      const start = readDate(address, 'startDate', 'Start date', ctx)
      const end = readDate(address, 'endDate', 'End date', ctx)
      if (start && end && end < start) {
        ctx.addIssue({ code: 'custom', path: ['endDate-day'], message: ERRORS.END_BEFORE_START })
      }
    }, ALWAYS)

type PhoneIn = z.infer<ReturnType<typeof phoneSchema>>
type AddressIn = z.infer<ReturnType<typeof addressSchema>>

const toPhone = (phone: PhoneIn) => ({
  phoneType: phone.phoneType as string,
  phoneNumber: phone.phoneNumber,
  extNumber: phone.extNumber,
})

const nonNull = <T>(items: (T | null)[]): T[] => items.filter((item): item is T => item !== null)

const toAddress = (address: AddressIn) => ({
  noFixedAddress: address.noFixedAddress === 'true',
  flat: address.flat,
  property: address.property,
  street: address.street,
  area: address.area,
  cityCode: address.cityCode,
  countyCode: address.countyCode,
  postCode: address.postCode,
  countryCode: address.countryCode,
  startDate: parseDate(address, 'startDate'),
  endDate: parseDate(address, 'endDate'),
  comments: address.comments,
  addressType: address.addressType,
  serviceAddress: address.serviceAddress === 'true',
  specialNeedsCode: address.specialNeedsCode,
  primaryAddress: address.primaryAddress === 'true',
  mailAddress: address.mailAddress === 'true',
  contactPersonName: address.contactPersonName,
  businessHours: address.businessHours,
  phoneNumbers: nonNull(address.phoneNumbers).map(toPhone),
})

const parseDate = (input: DateInput, name: string) => {
  const fields = input as Record<string, string | undefined>
  const result = parseDateFields(fields[`${name}-day`], fields[`${name}-month`], fields[`${name}-year`])
  return result.status === 'ok' ? result.value : undefined
}

export const createOrganisationSchema = (refs: ReferenceData) =>
  z.preprocess(
    normaliseBody,
    z
      .object({
        _csrf: z.string().optional(),
        action: z.string().optional(),
        organisationName: z.string().max(40, ERRORS.NAME_TOO_LONG).optional(),
        programmeNumber: text(40, ERRORS.PROGRAMME_NUMBER_TOO_LONG),
        vatNumber: text(12, ERRORS.VAT_NUMBER_TOO_LONG),
        caseloadId: text(6, ERRORS.CASELOAD_ID_TOO_LONG),
        comments: text(240, ERRORS.COMMENTS_TOO_LONG),
        organisationTypes: z.array(z.string({ message: ERRORS.ORGANISATION_TYPE_INVALID })),
        active: z.string().optional(),
        ...dateParts('deactivatedDate'),
        phoneNumbers: z.array(phoneSchema(refs).nullable()).max(MAX_ITEMS),
        internetAddresses: z.array(internetAddressSchema.nullable()).max(MAX_ITEMS),
        addresses: z.array(addressSchema(refs).nullable()).max(MAX_ITEMS),
      })
      .strict()
      .superRefine((form, ctx) => {
        if (!form.organisationName) {
          ctx.addIssue({ code: 'custom', path: ['organisationName'], message: ERRORS.NAME_REQUIRED })
        }
        if (form.active !== 'true' && form.active !== 'false') {
          ctx.addIssue({ code: 'custom', path: ['active'], message: ERRORS.STATUS_REQUIRED })
        }

        if (form.organisationTypes.length === 0) {
          ctx.addIssue({ code: 'custom', path: ['organisationTypes'], message: ERRORS.ORGANISATION_TYPE_REQUIRED })
        } else if (form.organisationTypes.some(code => !refs.ORGANISATION_TYPE.some(item => item.code === code))) {
          ctx.addIssue({ code: 'custom', path: ['organisationTypes'], message: ERRORS.ORGANISATION_TYPE_INVALID })
        } else if (new Set(form.organisationTypes).size !== form.organisationTypes.length) {
          ctx.addIssue({ code: 'custom', path: ['organisationTypes'], message: ERRORS.ORGANISATION_TYPE_DUPLICATE })
        }

        if (form.active === 'false') {
          readDate(form, 'deactivatedDate', 'Deactivated date', ctx)
        } else if (
          ['day', 'month', 'year'].some(part => (form as Record<string, unknown>)[`deactivatedDate-${part}`])
        ) {
          ctx.addIssue({
            code: 'custom',
            path: ['deactivatedDate-day'],
            message: ERRORS.DEACTIVATED_DATE_WHEN_ACTIVE,
          })
        }

        let primarySeen = false
        let mailSeen = false
        form.addresses.forEach((address, index) => {
          if (!address) return
          if (address.primaryAddress === 'true') {
            if (primarySeen)
              ctx.addIssue({
                code: 'custom',
                path: ['addresses', index, 'primaryAddress'],
                message: ERRORS.ONE_PRIMARY,
              })
            primarySeen = true
          }
          if (address.mailAddress === 'true') {
            if (mailSeen)
              ctx.addIssue({ code: 'custom', path: ['addresses', index, 'mailAddress'], message: ERRORS.ONE_MAIL })
            mailSeen = true
          }
        })
      }, ALWAYS)
      .transform(form => ({
        organisationName: form.organisationName as string,
        programmeNumber: form.programmeNumber,
        vatNumber: form.vatNumber,
        caseloadId: form.caseloadId,
        comments: form.comments,
        organisationTypes: form.organisationTypes,
        active: form.active === 'true',
        deactivatedDate: form.active === 'false' ? parseDate(form, 'deactivatedDate') : undefined,
        phoneNumbers: nonNull(form.phoneNumbers).map(toPhone),
        internetAddresses: nonNull(form.internetAddresses).map(item => ({
          type: item.type as 'EMAIL' | 'WEB',
          address: item.address,
        })),
        addresses: nonNull(form.addresses).map(toAddress),
      })),
  )

export type CreateOrganisationForm = z.infer<ReturnType<typeof createOrganisationSchema>>
