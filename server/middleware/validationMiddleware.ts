import { RequestHandler, Request, Response } from 'express'
import z, { RefinementCtx } from 'zod'
import { $ZodSuperRefineIssue } from 'zod/v4/core'

type ReferenceDataItem = { code: string; description: string }

export const fromRefData = (refData: ReferenceDataItem[], errorMessage: string) => {
  return (val: string, ctx: RefinementCtx) => {
    const item = refData.find(o => o.code === val)
    if (!item) {
      ctx.addIssue({ code: 'custom', message: errorMessage })
      return z.NEVER
    }
    return item.code
  }
}

export type SchemaFactory = (request: Request, res: Response) => Promise<z.ZodTypeAny>

export const createSchema = <T extends z.core.$ZodLooseShape>(shape: T, strict = true) =>
  zodAlwaysRefine(strict ? zObjectStrict(shape) : z.looseObject(shape))

const zObjectStrict = <T extends z.core.$ZodLooseShape>(shape: T) =>
  z.object({ _csrf: z.string().optional(), ...shape }).strict()

/*
 * Ensure that all parts of the schema get tried and can fail before exiting schema checks
 * https://github.com/colinhacks/zod/issues/479#issuecomment-2067278879
 */
const zodAlwaysRefine = <T extends z.ZodTypeAny>(zodType: T) =>
  z.any().transform((val, ctx) => {
    const res = zodType.safeParse(val)
    if (!res.success) res.error.issues.forEach(issue => ctx.addIssue(issue as $ZodSuperRefineIssue))
    return res.data || val
  }) as unknown as T

const normaliseNewLines = (body: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(body).map(([k, v]) => [k, typeof v === 'string' ? v.replace(/\r\n/g, '\n') : v]))

const pathArrayToString = (previous: string | number | symbol, next: string | number | symbol): string => {
  if (!previous) return next.toString()
  return `${String(previous)}[${next.toString()}]`
}

export default function validationMiddleware(schema: z.ZodTypeAny | SchemaFactory): RequestHandler {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deepTrim = (object: any): object => {
    const o = object
    if (o) {
      Object.keys(o).forEach(key => {
        if (typeof o[key] === 'string') {
          o[key] = o[key].trim() || undefined
        } else if (typeof o[key] === 'object') {
          o[key] = deepTrim(o[key])
        }
      })
    }
    return o as object
  }

  return async (req, res, next) => {
    req.rawBody = req.body
    req.body = deepTrim(req.body)

    if (!schema) return next()

    const resolvedSchema = typeof schema === 'function' ? await schema(req, res) : schema
    const result = await resolvedSchema.safeParseAsync(normaliseNewLines(req.body))
    if (result.success) {
      req.body = result.data
      return next()
    }

    result.error.issues.forEach(key => {
      res.addValidationError(key.message, key.path.reduce(pathArrayToString) as string)
    })

    return res.validationFailed(req.originalUrl.split('?')[0])
  }
}
