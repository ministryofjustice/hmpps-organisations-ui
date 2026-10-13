import { expect, test } from '@playwright/test'
import organisationsApi from '../mockApis/organisationsApi'
import { login, resetStubs } from '../testUtils'
import AxePage from '../pages/axePage'

test.describe('View, update and delete an organisation', () => {
  test.beforeEach(async ({ page }) => {
    await organisationsApi.stubAllReferenceCodes()
    await organisationsApi.stubListOrganisations()
    await organisationsApi.stubGetOrganisation()
    await login(page)
  })

  test.afterEach(async () => {
    await resetStubs()
  })

  test('views an organisation from the list', async ({ page }) => {
    await page.goto('/organisations')
    await page.getByTestId('organisation-link-20000001').click()

    await expect(page.getByTestId('main-heading')).toHaveText('Acme Limited')
    await expect(page.getByTestId('contact-details')).toContainText('Business: 0114 496 0000')
    await AxePage.on(page).verifyNoAccessViolationsOnPage()
  })

  test('updates an organisation', async ({ page }) => {
    await organisationsApi.stubUpdateOrganisation()
    await page.goto('/organisations/20000001')
    await page.getByTestId('update-button').click()

    await expect(page.getByTestId('main-heading')).toHaveText('Update organisation')
    await expect(page.locator('[id="organisationName"]')).toHaveValue('Acme Limited')
    await AxePage.on(page).verifyNoAccessViolationsOnPage()

    await page.locator('[id="organisationName"]').fill('Renamed Limited')
    await page.getByTestId('save-organisation-button').click()
    await expect(page.getByTestId('main-heading')).toHaveText('Acme Limited')
    await expect(page.getByText('Organisation updated')).toBeVisible()
  })

  test('deletes an organisation after confirmation', async ({ page }) => {
    await organisationsApi.stubDeleteOrganisation()
    await page.goto('/organisations/20000001/delete')
    await expect(page.getByTestId('main-heading')).toHaveText('Are you sure you want to delete this organisation?')
    await AxePage.on(page).verifyNoAccessViolationsOnPage()

    await page.getByTestId('confirm-delete-button').click()
    await expect(page.getByTestId('main-heading')).toHaveText('View organisations')
    await expect(page.getByText('Organisation deleted')).toBeVisible()
  })
})
