import { test, expect } from "@playwright/test";

import { LoginPage } from "../../e2e/page-objects/loginPage";
import { DashboardPage } from "../../e2e/page-objects/dashboardPage";
import { TasksListPage } from "../../e2e/page-objects/tasksListPage";
import { TaskFormPage } from "../../e2e/page-objects/taskFormPage";

import {
  testUserEmail,
  testUserPassword,
  getTestUser,
  generateRandomTaskData,
  findTaskByTitle,
  deleteTask,
} from "./helpers/test-setup";

test("user can create a new task via form", async ({ page }) => {
  // Arrange: Generate random task data
  const taskData = generateRandomTaskData();
  const user = await getTestUser();
  let createdTaskId: string | null = null;

  try {
    // Arrange: Login
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testUserEmail, testUserPassword);

    // Arrange: Navigate to tasks list
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.waitForLoad();
    await dashboardPage.navigateToTasks();

    // Arrange: Navigate to add new task form
    const tasksListPage = new TasksListPage(page);
    await tasksListPage.waitForLoad();
    await tasksListPage.openAddNewForm();

    // Act: Fill and submit the task form
    const taskFormPage = new TaskFormPage(page);
    await taskFormPage.expectVisible();
    await taskFormPage.fillTitle(taskData.title);
    await taskFormPage.fillDescription(taskData.description);
    await taskFormPage.setIntervalValue(taskData.intervalValue);
    await taskFormPage.setIntervalUnit(taskData.intervalUnit);

    // Wait a bit for form to be fully ready
    await page.waitForTimeout(500);

    await taskFormPage.submit();

    // Assert: Form submission successful - wait for success alert and redirect
    await taskFormPage.waitForSuccess();
    await page.waitForURL("/tasks", { timeout: 5000 });

    // Assert: Verify task was created in database first
    // Give it a moment for DB to process
    await page.waitForTimeout(1000);

    const createdTask = await findTaskByTitle(taskData.title, user.id);
    expect(createdTask, `Task "${taskData.title}" should exist in database`).toBeTruthy();
    expect(createdTask?.title).toBe(taskData.title);
    expect(createdTask?.description).toBe(taskData.description);
    expect(createdTask?.interval_value).toBe(taskData.intervalValue);

    createdTaskId = createdTask?.id ?? null;

    // Assert: Task is visible in the list
    await tasksListPage.waitForLoad();
    await tasksListPage.expectTaskWithTitle(taskData.title);
  } finally {
    // Cleanup: Delete the created task
    if (createdTaskId) {
      await deleteTask({ id: createdTaskId, user_id: user.id });
    } else {
      // Fallback: try to find and delete by title
      const task = await findTaskByTitle(taskData.title, user.id);
      if (task) {
        await deleteTask(task);
      }
    }
  }
});
