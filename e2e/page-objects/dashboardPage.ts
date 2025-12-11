import { expect, type Locator, type Page } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly tasksNavLink: Locator;
  readonly dashboardHeader: Locator;
  readonly overdueSection: Locator;
  readonly upcomingSection: Locator;
  readonly dashboardSummary: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    // Navbar elements - use first() to handle both desktop and mobile navigation
    this.tasksNavLink = page.getByTestId("nav-item-zadania").first();
    // Dashboard sections
    this.dashboardHeader = page.locator("header h1");
    this.overdueSection = page.getByTestId("dashboard-overdue-section");
    this.upcomingSection = page.getByTestId("dashboard-upcoming-section");
    this.dashboardSummary = page.locator('.grid:has([class*="text-3xl"])');
    this.emptyState = page.locator("text=Brak zadań");
  }

  async goto() {
    await this.page.goto("/");
  }

  async waitForLoad() {
    await expect(this.dashboardHeader).toBeVisible();
  }

  async expectHeaderVisible() {
    await expect(this.dashboardHeader).toBeVisible();
  }

  async navigateToTasks() {
    await this.tasksNavLink.click();
    await this.page.waitForURL("/tasks");
  }

  async expectEmptyState() {
    await expect(this.emptyState).toBeVisible();
  }

  async expectOverdueSectionVisible() {
    await expect(this.overdueSection).toBeVisible();
  }

  async expectUpcomingSectionVisible() {
    await expect(this.upcomingSection).toBeVisible();
  }

  async expectSummaryVisible() {
    await expect(this.dashboardSummary).toBeVisible();
  }

  async expectGreeting(userName?: string) {
    const expectedText = userName ? `Witaj, ${userName}!` : "Witaj!";
    await expect(this.dashboardHeader).toHaveText(expectedText);
  }
}
