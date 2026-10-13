import { expect, test } from '@playwright/test'
import organisationsApi from '../mockApis/organisationsApi'
import { login, resetStubs } from '../testUtils'
import HomePage from '../pages/homePage'
import ListOrganisationsPage from '../pages/listOrganisationsPage'

test.describe('List organisations', () => {
  test.afterEach(async () => {
    await resetStubs()
  })

  test('shows organisations from the home page card', async ({ page }) => {
    await organisationsApi.stubListOrganisations()
    await login(page)
    await HomePage.verifyOnPage(page)
    await page.getByTestId('list-organisations-card').getByRole('link').click()

    const listPage = await ListOrganisationsPage.verifyOnPage(page)
    await expect(listPage.resultCount).toContainText('2 organisations found')
    await expect(listPage.table).toContainText('Acme Limited')
    await expect(listPage.table).toContainText('High Street, Sheffield, S1 1AA')
    await expect(listPage.table).toContainText('Inactive')
  })
})
