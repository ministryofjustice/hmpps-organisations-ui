import { AxeBuilder } from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

export default class AbstractPage {
  readonly page: Page

  /** user name that appear in header */
  readonly usersName: Locator

  /** phase banner that appear in header */
  readonly phaseBanner: Locator

  /** link to sign out */
  readonly signoutLink: Locator

  /** link to manage user details */
  readonly manageUserDetails: Locator

  protected constructor(page: Page) {
    this.page = page
    this.phaseBanner = page.getByTestId('header-phase-banner')
    this.usersName = page.getByTestId('header-user-name')
    this.signoutLink = page.getByText('Sign out')
    this.manageUserDetails = page.getByTestId('manageDetails')
  }

  async verifyNoAccessViolationsOnPage() {
    const results = await new AxeBuilder({ page: this.page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      // GOV.UK Frontend adds aria-expanded to conditional radios, which axe 4.13 flags as a known false positive
      .exclude('.govuk-radios__input[aria-controls]')
      .analyze()
    expect(results.violations).toEqual([])
  }

  async signOut() {
    await this.signoutLink.first().click()
  }

  async clickManageUserDetails() {
    await this.manageUserDetails.first().click()
  }
}
