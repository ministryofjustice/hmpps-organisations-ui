export const MAX_ITEMS = 5

type Block = Record<string, unknown>
export type FormBody = Record<string, unknown>

const isObject = (value: unknown): value is Block => !!value && typeof value === 'object' && !Array.isArray(value)

export const toArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value
  if (isObject(value)) return Object.values(value)
  return value === undefined || value === null ? [] : [value]
}

export const isBlank = (value: unknown): boolean => {
  if (value === undefined || value === null || value === '') return true
  if (Array.isArray(value)) return value.every(isBlank)
  if (isObject(value)) return Object.values(value).every(isBlank)
  return false
}

/*
 * Blank blocks become null rather than being removed so that validation error paths keep matching the
 * indexes of the blocks rendered on the page.
 */
const blankToNull = (blocks: unknown): unknown[] => toArray(blocks).map(block => (isBlank(block) ? null : block))

export const normaliseBody = (raw: unknown): unknown => {
  if (!isObject(raw)) return raw
  return {
    ...raw,
    organisationTypes: toArray(raw.organisationTypes),
    phoneNumbers: blankToNull(raw.phoneNumbers),
    internetAddresses: blankToNull(raw.internetAddresses),
    addresses: toArray(raw.addresses).map(address =>
      isObject(address) && !isBlank(address) ? { ...address, phoneNumbers: blankToNull(address.phoneNumbers) } : null,
    ),
  }
}

const addBlock = (blocks: unknown[], block: Block = {}) => (blocks.length < MAX_ITEMS ? [...blocks, block] : blocks)
const removeBlock = (blocks: unknown[], index: number) => blocks.filter((_, i) => i !== index)

/** Applies an "Add another" / "Remove" button press to the submitted form without validating it */
export const applyListAction = (body: FormBody, action: string): FormBody => {
  const { action: _action, _csrf, ...rest } = body
  const form: FormBody = {
    ...rest,
    phoneNumbers: toArray(rest.phoneNumbers),
    internetAddresses: toArray(rest.internetAddresses),
    addresses: toArray(rest.addresses).map(address => ({
      ...(isObject(address) ? address : {}),
      phoneNumbers: toArray(isObject(address) ? address.phoneNumbers : undefined),
    })),
  }
  const addresses = form.addresses as Block[]

  const run = (regex: RegExp, fn: (m: number[]) => void) => {
    const match = action.match(regex)
    if (match) fn(match.slice(1).map(Number))
  }
  const withAddressPhones = (index: number, fn: (phones: unknown[]) => unknown[]) => {
    if (addresses[index])
      addresses[index] = { ...addresses[index], phoneNumbers: fn(addresses[index].phoneNumbers as unknown[]) }
  }

  if (action === 'add-phone') form.phoneNumbers = addBlock(form.phoneNumbers as unknown[])
  if (action === 'add-internet-address') form.internetAddresses = addBlock(form.internetAddresses as unknown[])
  if (action === 'add-address') form.addresses = addBlock(addresses, { phoneNumbers: [] })
  run(/^remove-phone-(\d+)$/, ([i]) => {
    form.phoneNumbers = removeBlock(form.phoneNumbers as unknown[], i)
  })
  run(/^remove-internet-address-(\d+)$/, ([i]) => {
    form.internetAddresses = removeBlock(form.internetAddresses as unknown[], i)
  })
  run(/^remove-address-(\d+)$/, ([i]) => {
    form.addresses = removeBlock(addresses, i)
  })
  run(/^add-address-(\d+)-phone$/, ([i]) => withAddressPhones(i, phones => addBlock(phones)))
  run(/^remove-address-(\d+)-phone-(\d+)$/, ([i, j]) => withAddressPhones(i, phones => removeBlock(phones, j)))

  return form
}

const withMinimumOne = (blocks: unknown, blank: Block = {}) => {
  const list = toArray(blocks)
  return list.length ? list : [blank]
}

/** Shapes stored or flashed form values for rendering: every repeating group shows at least one block */
export const toViewForm = (body: FormBody | null | undefined) => {
  const form = body ?? {}
  return {
    ...form,
    organisationTypes: toArray(form.organisationTypes),
    phoneNumbers: withMinimumOne(form.phoneNumbers),
    internetAddresses: withMinimumOne(form.internetAddresses),
    addresses: withMinimumOne(form.addresses).map(address => {
      const block = isObject(address) ? address : {}
      return { ...block, phoneNumbers: withMinimumOne(block.phoneNumbers) }
    }),
  }
}
