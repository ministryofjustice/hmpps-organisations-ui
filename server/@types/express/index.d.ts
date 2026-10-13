import { HmppsUser } from '../../interfaces/hmppsUser'

export declare module 'express-session' {
  // Declare that the session will potentially contain these additional fields
  interface SessionData {
    returnTo: string
    createOrganisationForm: Record<string, unknown>
    createdOrganisation: { organisationId: number; organisationName: string; active: boolean }
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    rawBody: object
  }

  interface Response {
    addSuccessMessage(heading: string, message?: string): void
    addValidationError(message: string, field?: string): void
    validationFailed(redirectUrl?: string): void
  }
}

export declare global {
  namespace Express {
    interface User {
      username: string
      token: string
      authSource: string
    }

    interface Request {
      verified?: boolean
      id: string
      logout(done: (err: unknown) => void): void
    }

    interface Locals {
      user: HmppsUser
      cspNonce: string
      csrfToken: string
      asset_path: string
      applicationName: string
      environmentName: string
      environmentNameColour: string
      appInsightsConnectionString?: string
      appInsightsApplicationName?: string
      buildNumber?: string
      formResponses?: Record<string, unknown>
    }
  }
}
