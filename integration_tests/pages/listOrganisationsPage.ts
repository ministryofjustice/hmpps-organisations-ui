import { expect, type Locator, type Page } from '@playwright/test'
import AbstractPage from './abstractPage'

export default class ListOrganisationsPage extends AbstractPage {
  readonly heading: Locator

  readonly table: Locator

  readonly resultCount: Locator

  private constructor(page: Page) {
    super(page)
    this.heading = page.getByTestId('main-heading')
    this.table = page.getByTestId('organisations-table')
    this.resultCount = page.getByTestId('result-count')
  }

  static async verifyOnPage(page: Page): Promise<ListOrganisationsPage> {
    const listPage = new ListOrganisationsPage(page)
    await expect(listPage.heading).toHaveText('View organisations')
    await listPage.verifyNoAccessViolationsOnPage()
    return listPage
  }
}
