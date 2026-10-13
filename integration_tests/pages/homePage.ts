import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class HomePage extends AbstractPage {
  readonly header: Locator

  readonly addOrganisationLink: Locator

  private constructor(page: Page) {
    super(page)
    this.header = page.getByTestId('main-heading')
    this.addOrganisationLink = page.getByTestId('add-organisation-card').getByRole('link')
  }

  static async verifyOnPage(page: Page): Promise<HomePage> {
    const homePage = new HomePage(page)
    await expect(homePage.header).toHaveText('Organisations')
    await homePage.verifyNoAccessViolationsOnPage()
    return homePage
  }
}
