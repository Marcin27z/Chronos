import { expect, type Locator, type Page } from "@playwright/test";

export class TasksListPage {
  readonly page: Page;
  readonly addNewButton: Locator;
  readonly addFirstButton: Locator;
  readonly totalCount: Locator;
  readonly grid: Locator;
  readonly sortControls: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addNewButton = page.getByTestId("tasks-add-new");
    this.addFirstButton = page.getByTestId("tasks-add-first");
    this.totalCount = page.getByTestId("tasks-total-count");
    this.grid = page.getByTestId("tasks-grid");
    this.sortControls = page.getByTestId("tasks-sort-controls");
  }

  async goto() {
    await this.page.goto("/tasks");
  }

  async waitForLoad() {
    // Wait for either the grid or empty state message
    await this.page.waitForLoadState("networkidle");
    // Grid might not exist if there are no tasks, so we just wait for page to be stable
  }

  async openAddNewForm() {
    // Try to click the regular add button first, if not visible try the empty state button
    const isAddNewVisible = await this.addNewButton.isVisible().catch(() => false);
    const isAddFirstVisible = await this.addFirstButton.isVisible().catch(() => false);

    if (isAddNewVisible) {
      await this.addNewButton.click();
    } else if (isAddFirstVisible) {
      await this.addFirstButton.click();
    } else {
      throw new Error("Neither add new button nor add first button is visible");
    }

    await this.page.waitForURL("/tasks/new");
  }

  async expectTaskWithTitle(title: string) {
    await expect(this.page.getByTestId("task-card-title").filter({ hasText: title })).toBeVisible();
  }

  async getTaskCardLocator(title: string) {
    return this.page.locator('[data-testid="task-card"]').filter({ hasText: title }).first();
  }

  async expectSortControlsVisible() {
    await expect(this.sortControls).toBeVisible();
  }

  async expectTotalCount(count: number) {
    await expect(this.totalCount).toHaveText(new RegExp(`${count}`));
  }
}
