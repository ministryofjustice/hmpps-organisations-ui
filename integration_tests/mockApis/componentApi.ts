import type { SuperAgentRequest } from 'superagent'
import { stubFor } from './wiremock'

const BASE = '/components-api'

export default {
  stubPing: (httpStatus = 200): SuperAgentRequest =>
    stubFor({
      request: { method: 'GET', urlPath: `${BASE}/ping` },
      response: {
        status: httpStatus,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        jsonBody: { status: httpStatus === 200 ? 'UP' : 'DOWN' },
      },
    }),
}
