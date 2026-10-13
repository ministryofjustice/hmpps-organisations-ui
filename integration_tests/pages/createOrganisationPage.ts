import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class CreateOrganisationPage extends AbstractPage {
  readonly heading: Locator

  readonly caption: Locator

  readonly errorSummary: Locator

  readonly createButton: Locator

  private constructor(page: Page) {
    super(page)
    this.heading = page.getByTestId('main-heading')
    this.caption = page.getByTestId('caption')
    this.errorSummary = page.getByTestId('error-summary')
    this.createButton = page.getByTestId('create-organisation-button')
  }

  static async verifyOnPage(page: Page): Promise<CreateOrganisationPage> {
    const createPage = new CreateOrganisationPage(page)
    await expect(createPage.heading).toHaveText('Add an organisation')
    await expect(createPage.caption).toHaveText('Organisations')
    await createPage.verifyNoAccessViolationsOnPage()
    return createPage
  }

  async fillName(name: string) {
    await this.page.getByLabel('Organisation name').fill(name)
  }

  async selectOrganisationType(label: string) {
    await this.page.getByLabel(label, { exact: true }).check()
  }

  async create() {
    await this.createButton.click()
  }

  async clickAction(name: string) {
    await this.page.getByRole('button', { name }).first().click()
  }
}
