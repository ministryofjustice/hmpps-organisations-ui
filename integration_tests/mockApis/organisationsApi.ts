import type { SuperAgentRequest } from 'superagent'
import { stubFor, stubPing } from './wiremock'

const BASE = '/organisations-api'

const referenceData: Record<string, { code: string; description: string }[]> = {
  ORGANISATION_TYPE: [
    { code: 'CRC', description: 'Community rehabilitation company' },
    { code: 'OTHER', description: 'Other' },
  ],
  PHONE_TYPE: [
    { code: 'BUS', description: 'Business' },
    { code: 'MOB', description: 'Mobile' },
  ],
  ADDRESS_TYPE: [
    { code: 'BUS', description: 'Business address' },
    { code: 'HOME', description: 'Home address' },
  ],
  CITY: [{ code: '25343', description: 'Sheffield' }],
  COUNTY: [{ code: 'S.YORKSHIRE', description: 'South Yorkshire' }],
  COUNTRY: [{ code: 'ENG', description: 'England' }],
  ORG_ADDRESS_SPECIAL_NEEDS: [{ code: 'WHEEL', description: 'Wheelchair access' }],
}

const stubReferenceCodes = (group: string): SuperAgentRequest =>
  stubFor({
    request: { method: 'GET', urlPath: `${BASE}/reference-codes/group/${group}` },
    response: {
      status: 200,
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      jsonBody: referenceData[group].map((item, index) => ({
        referenceCodeId: index + 1,
        groupCode: group,
        displayOrder: index + 1,
        isActive: true,
        ...item,
      })),
    },
  })

export default {
  stubPing: (httpStatus = 200): SuperAgentRequest => stubPing(BASE, httpStatus),

  stubAllReferenceCodes: (): Promise<unknown[]> => Promise.all(Object.keys(referenceData).map(stubReferenceCodes)),

  stubCreateOrganisation: (organisationId = 20000001): SuperAgentRequest =>
    stubFor({
      request: { method: 'POST', urlPath: `${BASE}/organisation/v2` },
      response: {
        status: 201,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {
          organisationId,
          organisationName: 'Acme Limited',
          active: true,
          organisationTypes: ['OTHER'],
          phoneNumbers: [],
          internetAddresses: [],
          addresses: [],
          createdBy: 'USER1',
          createdTime: '2025-01-01T12:00:00',
        },
      },
    }),

  stubListOrganisations: (): SuperAgentRequest =>
    stubFor({
      request: { method: 'GET', urlPath: `${BASE}/organisation/v2` },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {
          content: [
            {
              organisationId: 20000001,
              organisationName: 'Acme Limited',
              organisationActive: true,
              street: 'High Street',
              cityDescription: 'Sheffield',
              postcode: 'S1 1AA',
              businessPhoneNumber: '0114 496 0000',
            },
            { organisationId: 20000002, organisationName: 'Beta Ltd', organisationActive: false },
          ],
          page: { size: 20, number: 0, totalElements: 2, totalPages: 1 },
        },
      },
    }),

  stubGetOrganisation: (): SuperAgentRequest =>
    stubFor({
      request: { method: 'GET', urlPath: `${BASE}/organisation/v2/20000001` },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: {
          organisationId: 20000001,
          organisationName: 'Acme Limited',
          vatNumber: 'GB123',
          organisationTypes: ['OTHER'],
          active: true,
          phoneNumbers: [{ phoneType: 'BUS', phoneNumber: '0114 496 0000' }],
          internetAddresses: [{ type: 'EMAIL', address: 'info@acme.example' }],
          addresses: [
            {
              noFixedAddress: false,
              street: 'High Street',
              cityCode: '25343',
              postCode: 'S1 1AA',
              serviceAddress: false,
              active: true,
              primaryAddress: true,
              mailAddress: false,
              phoneNumbers: [],
            },
          ],
          createdBy: 'creator',
          createdTime: '2024-01-01T10:00:00',
        },
      },
    }),

  stubUpdateOrganisation: (): SuperAgentRequest =>
    stubFor({
      request: { method: 'PUT', urlPath: `${BASE}/organisation/v2/20000001` },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: { organisationId: 20000001, organisationName: 'Renamed Limited' },
      },
    }),

  stubDeleteOrganisation: (): SuperAgentRequest =>
    stubFor({
      request: { method: 'DELETE', urlPath: `${BASE}/organisation/v2/20000001` },
      response: { status: 204 },
    }),

  stubCreateOrganisationBadRequest: (): SuperAgentRequest =>
    stubFor({
      request: { method: 'POST', urlPath: `${BASE}/organisation/v2` },
      response: {
        status: 400,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: { status: 400, userMessage: 'Validation failure' },
      },
    }),
}
