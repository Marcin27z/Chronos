import { test } from "@playwright/test";

import { LoginPage } from "../../e2e/page-objects/loginPage";
import { DashboardPage } from "../../e2e/page-objects/dashboardPage";
import { TasksListPage } from "../../e2e/page-objects/tasksListPage";

import { testUserEmail, testUserPassword, createTestTask, deleteTask } from "./helpers/test-setup";

test("prepped task is visible on the tasks list", async ({ page }) => {
  // Arrange: Create a test task in the database
  const createdTask = await createTestTask();

  try {
    // Arrange: Login
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testUserEmail, testUserPassword);

    // Act: Navigate to tasks list via Dashboard
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.waitForLoad();
    await dashboardPage.navigateToTasks();

    // Assert: Verify task is visible
    const tasksListPage = new TasksListPage(page);
    await tasksListPage.waitForLoad();
    await tasksListPage.expectTaskWithTitle(createdTask.title);
  } finally {
    await deleteTask(createdTask);
  }
});
