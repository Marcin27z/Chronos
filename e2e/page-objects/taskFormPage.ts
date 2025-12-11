import { expect, type Locator, type Page } from "@playwright/test";

export class TaskFormPage {
  readonly page: Page;
  readonly form: Locator;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly intervalValueInput: Locator;
  readonly intervalUnitTrigger: Locator;
  readonly nextDuePreview: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly successAlert: Locator;
  readonly errorAlert: Locator;
  readonly status: Locator;

  constructor(page: Page) {
    this.page = page;
    this.form = page.getByTestId("task-form");
    this.titleInput = page.getByTestId("task-title-input");
    this.descriptionInput = page.getByTestId("task-description-input");
    this.intervalValueInput = page.getByTestId("task-interval-value-input");
    this.intervalUnitTrigger = page.getByTestId("task-interval-unit-select");
    this.nextDuePreview = page.getByTestId("task-next-due-preview");
    this.submitButton = page.getByTestId("task-form-submit");
    this.cancelButton = page.getByTestId("task-form-cancel");
    this.successAlert = page.getByTestId("task-form-success-alert");
    this.errorAlert = page.getByTestId("task-form-error-alert");
    this.status = page.getByTestId("task-form-status");
  }

  async expectVisible() {
    await expect(this.form).toBeVisible();
  }

  async fillTitle(title: string) {
    await this.titleInput.fill(title);
  }

  async fillDescription(value: string) {
    await this.descriptionInput.fill(value);
  }

  async setIntervalValue(value: number) {
    await this.intervalValueInput.fill(value.toString());
  }

  async setIntervalUnit(label: string) {
    await this.intervalUnitTrigger.click();
    // Use first() to handle potential duplicates in select dropdown
    await this.page.getByRole("option", { name: label }).first().click();
  }

  async selectPreferredDay(dayValue: number) {
    await this.page.getByTestId(`task-day-button-${dayValue}`).click();
  }

  async submit() {
    await this.submitButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }

  async waitForSuccess() {
    await expect(this.successAlert).toBeVisible();
  }

  async waitForFailure() {
    await expect(this.errorAlert).toBeVisible();
  }

  async expectNextDueDate(text: string) {
    await expect(this.page.getByTestId("task-next-due-date")).toHaveText(text);
  }

  async expectStatus(message: string) {
    await expect(this.status).toHaveText(message);
  }
}
