import { expect, test } from '@playwright/test'
import organisationsApi from '../mockApis/organisationsApi'
import { getMatchingRequests } from '../mockApis/wiremock'
import { login, resetStubs } from '../testUtils'
import HomePage from '../pages/homePage'
import CreateOrganisationPage from '../pages/createOrganisationPage'
import CreateOrganisationConfirmationPage from '../pages/createOrganisationConfirmationPage'

test.describe('Create organisation', () => {
  test.beforeEach(async () => {
    await organisationsApi.stubAllReferenceCodes()
  })

  test.afterEach(async () => {
    await resetStubs()
  })

  test('happy path including repeating groups', async ({ page }) => {
    await organisationsApi.stubCreateOrganisation()
    await login(page)
    const homePage = await HomePage.verifyOnPage(page)
    await homePage.addOrganisationLink.click()

    const createPage = await CreateOrganisationPage.verifyOnPage(page)
    await createPage.fillName('Acme Limited')
    await createPage.selectOrganisationType('Other')

    await page.getByTestId('phoneNumbers-0-phoneNumber').fill('0114 496 0000')
    await page.locator('[id="phoneNumbers[0][phoneType]"]').selectOption('BUS')
    await createPage.clickAction('Add another phone number')
    await expect(page.getByTestId('phoneNumbers-1-phoneNumber')).toBeVisible()
    await expect(page.getByTestId('phoneNumbers-0-phoneNumber')).toHaveValue('0114 496 0000')
    await page.getByTestId('phoneNumbers-1-phoneNumber').fill('07700 900000')
    await page.locator('[id="phoneNumbers[1][phoneType]"]').selectOption('MOB')

    await page.getByLabel('Email or web address', { exact: true }).first().fill('info@example.com')
    await page.getByLabel('Email address').check()

    await page.getByTestId('addresses-0-street').fill('High Street')
    await createPage.clickAction('Add another address')
    await expect(page.getByTestId('addresses-1-street')).toBeVisible()
    await page.getByTestId('addresses-1-street').fill('Low Street')

    await createPage.create()

    const confirmation = await CreateOrganisationConfirmationPage.verifyOnPage(page)
    await expect(confirmation.summary).toContainText('Acme Limited')

    const [request] = await getMatchingRequests({ method: 'POST', urlPath: '/organisations-api/organisation/v2' })
    const body = JSON.parse(request.body)
    expect(body.organisationName).toBe('Acme Limited')
    expect(body.organisationTypes).toEqual(['OTHER'])
    expect(body.phoneNumbers).toHaveLength(2)
    expect(body.addresses.map((a: { street: string }) => a.street)).toEqual(['High Street', 'Low Street'])
  })

  test('shows validation errors and passes accessibility checks in the error state', async ({ page }) => {
    await login(page)
    await page.goto('/organisations/create')
    const createPage = await CreateOrganisationPage.verifyOnPage(page)

    await createPage.create()

    await expect(createPage.errorSummary).toContainText('There is a problem')
    await expect(createPage.errorSummary).toContainText('Enter the organisation name')
    await expect(createPage.errorSummary).toContainText('Select at least one organisation type')
    await createPage.verifyNoAccessViolationsOnPage()
  })

  test('shows a generic error when the API rejects the request', async ({ page }) => {
    await organisationsApi.stubCreateOrganisationBadRequest()
    await login(page)
    await page.goto('/organisations/create')
    const createPage = await CreateOrganisationPage.verifyOnPage(page)
    await createPage.fillName('Acme Limited')
    await createPage.selectOrganisationType('Other')
    await createPage.create()

    await expect(createPage.errorSummary).toContainText('The organisation could not be created')
  })

  test('view-only users cannot add organisations', async ({ page }) => {
    await login(page, { roles: ['ROLE_ORGANISATIONS__R'] })
    await page.goto('/organisations/create')
    await expect(page.getByTestId('main-heading')).toHaveText('You do not have permission to view this page')
  })
})
