import type { Page } from '@playwright/test'
import AbstractPage from './abstractPage'

/** Generic page object for pages that only need the accessibility check */
export default class AxePage extends AbstractPage {
  static on(page: Page): AxePage {
    return new AxePage(page)
  }
}
