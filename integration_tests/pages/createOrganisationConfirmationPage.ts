import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class CreateOrganisationConfirmationPage extends AbstractPage {
  readonly panel: Locator

  readonly summary: Locator

  private constructor(page: Page) {
    super(page)
    this.panel = page.getByTestId('confirmation-panel')
    this.summary = page.getByTestId('confirmation-summary')
  }

  static async verifyOnPage(page: Page): Promise<CreateOrganisationConfirmationPage> {
    const confirmationPage = new CreateOrganisationConfirmationPage(page)
    await expect(confirmationPage.panel).toContainText('Organisation created')
    await confirmationPage.verifyNoAccessViolationsOnPage()
    return confirmationPage
  }
}
