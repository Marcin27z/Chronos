import type { SupabaseServerClient } from "../../db/supabase.client";
import type {
  CreateTaskCommand,
  TaskDTO,
  TaskListDTO,
  PaginationDTO,
  DashboardDTO,
  TaskWithDaysOverdueDTO,
  TaskWithDaysUntilDueDTO,
  NextTaskDTO,
  DashboardSummaryDTO,
  ActionType,
  UpdateTaskCommand,
} from "../../types";

/**
 * Task Service
 *
 * Handles business logic for task operations including:
 * - Task creation with automatic next_due_date calculation
 * - Date calculations based on interval and preferences
 */
export class TaskService {
  constructor(private supabase: SupabaseServerClient) {}

  /**
   * Creates a new task for the authenticated user
   *
   * @param userId - ID of the authenticated user
   * @param command - Task creation command with user input
   * @returns Created task with all generated fields
   * @throws Error if date calculation fails or database operation fails
   */
  async createTask(userId: string, command: CreateTaskCommand): Promise<TaskDTO> {
    // Calculate the initial next_due_date
    const nextDueDate = this.calculateNextDueDate(
      command.interval_value,
      command.interval_unit,
      command.preferred_day_of_week ?? null
    );

    // Prepare database insert payload
    const taskInsert = {
      user_id: userId,
      title: command.title,
      description: command.description ?? null,
      interval_value: command.interval_value,
      interval_unit: command.interval_unit,
      preferred_day_of_week: command.preferred_day_of_week ?? null,
      next_due_date: nextDueDate,
      last_action_date: null,
      last_action_type: null,
    };

    // Insert task and retrieve created record in single query
    const { data, error } = await this.supabase.from("tasks").insert(taskInsert).select().single();

    if (error) {
      throw new Error(`Failed to create task: ${error.message}`);
    }

    if (!data) {
      throw new Error("Failed to create task: No data returned");
    }

    return data as TaskDTO;
  }

  /**
   * Retrieves a paginated list of tasks for the authenticated user with optional sorting
   *
   * @param userId - ID of the authenticated user
   * @param sort - Sort field and direction ('next_due_date', '-next_due_date', 'title', '-title')
   * @param limit - Maximum number of tasks to return (1-100)
   * @param offset - Number of tasks to skip (≥0)
   * @returns TaskListDTO with tasks data and pagination metadata
   * @throws Error if database query fails
   */
  async getTasks(
    userId: string,
    sort: "next_due_date" | "-next_due_date" | "title" | "-title",
    limit: number,
    offset: number
  ): Promise<TaskListDTO> {
    // Parse sort parameter to determine column and direction
    const { column, ascending } = this.parseSortParam(sort);

    // Query 1: Fetch tasks with sorting and pagination
    const query = this.supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .order(column, { ascending })
      .range(offset, offset + limit - 1);

    const { data: tasks, error: tasksError } = await query;

    if (tasksError) {
      throw new Error(`Failed to retrieve tasks: ${tasksError.message}`);
    }

    // Query 2: Count total tasks for pagination metadata
    const { count, error: countError } = await this.supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) {
      throw new Error(`Failed to count tasks: ${countError.message}`);
    }

    const total = count ?? 0;

    // Calculate has_more flag
    const hasMore = offset + limit < total;

    // Construct pagination metadata
    const pagination: PaginationDTO = {
      total,
      limit,
      offset,
      has_more: hasMore,
    };

    // Return TaskListDTO with data and pagination
    return {
      data: (tasks as TaskDTO[]) ?? [],
      pagination,
    };
  }

  /**
   * Retrieves a single task ensuring it belongs to the authenticated user
   *
   * @param userId - ID of the authenticated user requesting the task
   * @param taskId - ID of the task to retrieve (UUID)
   * @returns TaskDTO representing the requested task
   * @throws Error when the task does not exist, belongs to another user, or the query fails
   */
  async getTaskById(userId: string, taskId: string): Promise<TaskDTO> {
    const { data, error } = await this.supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      throw new Error("Task not found or does not belong to user");
    }

    return data as TaskDTO;
  }

  /**
   * Updates a task ensuring ownership and recalculating next_due_date when needed
   *
   * @param userId - ID of the authenticated user
   * @param taskId - ID of the task to update
   * @param command - Update payload with optional fields
   * @returns Updated task record
   * @throws Error when task not found or database update fails
   */
  async updateTask(userId: string, taskId: string, command: UpdateTaskCommand): Promise<TaskDTO> {
    const { data: existingTask, error: fetchError } = await this.supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !existingTask) {
      throw new Error("Task not found or does not belong to user");
    }

    const updates: Record<string, unknown> = {};

    if (command.title !== undefined) {
      updates.title = command.title;
    }

    if (command.description !== undefined) {
      updates.description = command.description;
    }

    if (command.interval_value !== undefined) {
      updates.interval_value = command.interval_value;
    }

    if (command.interval_unit !== undefined) {
      updates.interval_unit = command.interval_unit;
    }

    if (command.preferred_day_of_week !== undefined) {
      updates.preferred_day_of_week = command.preferred_day_of_week;
    }

    const intervalFieldUpdated =
      command.interval_value !== undefined ||
      command.interval_unit !== undefined ||
      command.preferred_day_of_week !== undefined;

    if (intervalFieldUpdated) {
      const intervalValue = command.interval_value ?? existingTask.interval_value;
      const intervalUnit = command.interval_unit ?? existingTask.interval_unit;
      const preferredDay =
        command.preferred_day_of_week !== undefined
          ? command.preferred_day_of_week
          : (existingTask.preferred_day_of_week ?? null);

      updates.next_due_date = this.calculateNextDueDate(intervalValue, intervalUnit, preferredDay);
    }

    if (Object.keys(updates).length === 0) {
      return existingTask as TaskDTO;
    }

    const { data: updatedTask, error: updateError } = await this.supabase
      .from("tasks")
      .update(updates)
      .eq("id", taskId)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError || !updatedTask) {
      throw new Error(`Failed to update task: ${updateError?.message ?? "Unknown error"}`);
    }

    return updatedTask as TaskDTO;
  }

  /**
   * Calculates the next due date for a task based on interval and preferences
   *
   * Algorithm:
   * 1. Start with current date (UTC)
   * 2. Add interval based on unit (days, weeks, months, years)
   * 3. If preferred day of week is specified, adjust to next occurrence of that day
   * 4. Return as ISO date string (YYYY-MM-DD)
   *
   * @param intervalValue - Numeric part of interval (1-999)
   * @param intervalUnit - Time unit (days, weeks, months, years)
   * @param preferredDayOfWeek - Optional preferred day (0=Sunday, 6=Saturday)
   * @returns ISO date string for next due date
   */
  private calculateNextDueDate(
    intervalValue: number,
    intervalUnit: "days" | "weeks" | "months" | "years",
    preferredDayOfWeek: number | null
  ): string {
    // Start with current date in UTC to avoid timezone issues
    const now = new Date();
    const baseDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    let nextDate: Date;

    // Calculate next date based on interval unit
    switch (intervalUnit) {
      case "days":
        nextDate = new Date(baseDate);
        nextDate.setUTCDate(baseDate.getUTCDate() + intervalValue);
        break;

      case "weeks":
        nextDate = new Date(baseDate);
        nextDate.setUTCDate(baseDate.getUTCDate() + intervalValue * 7);
        break;

      case "months":
        nextDate = new Date(baseDate);
        nextDate.setUTCMonth(baseDate.getUTCMonth() + intervalValue);
        // Handle month overflow (e.g., Jan 31 + 1 month = Feb 28/29)
        // JavaScript Date automatically handles this correctly
        break;

      case "years":
        nextDate = new Date(baseDate);
        nextDate.setUTCFullYear(baseDate.getUTCFullYear() + intervalValue);
        // Handle leap year edge cases automatically
        break;

      default:
        // TypeScript ensures this can't happen, but include for safety
        throw new Error(`Invalid interval unit: ${intervalUnit}`);
    }

    // Adjust to preferred day of week if specified
    if (preferredDayOfWeek !== null) {
      nextDate = this.adjustToPreferredDay(nextDate, preferredDayOfWeek);
    }

    // Format as ISO date string (YYYY-MM-DD)
    return this.formatDateToISO(nextDate);
  }

  /**
   * Adjusts a date to the next occurrence of the preferred day of week
   *
   * If the date already falls on the preferred day, it is returned unchanged.
   * Otherwise, the date is advanced to the next occurrence of that day.
   *
   * @param date - Date to adjust
   * @param preferredDay - Target day of week (0=Sunday, 6=Saturday)
   * @returns Adjusted date
   */
  private adjustToPreferredDay(date: Date, preferredDay: number): Date {
    const currentDay = date.getUTCDay();

    // If already on preferred day, no adjustment needed
    if (currentDay === preferredDay) {
      return date;
    }

    // Calculate days until next occurrence of preferred day
    let daysUntilPreferred = preferredDay - currentDay;

    // If preferred day is earlier in the week, add 7 to move to next week
    if (daysUntilPreferred < 0) {
      daysUntilPreferred += 7;
    }

    // Create new date with adjustment
    const adjustedDate = new Date(date);
    adjustedDate.setUTCDate(date.getUTCDate() + daysUntilPreferred);

    return adjustedDate;
  }

  /**
   * Formats a Date object as ISO date string (YYYY-MM-DD)
   *
   * @param date - Date to format
   * @returns ISO date string
   */
  private formatDateToISO(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  /**
   * Parses the sort parameter to extract column name and sort direction
   *
   * @param sort - Sort parameter ('next_due_date', '-next_due_date', 'title', '-title')
   * @returns Object with column name and ascending boolean flag
   */
  private parseSortParam(sort: "next_due_date" | "-next_due_date" | "title" | "-title"): {
    column: string;
    ascending: boolean;
  } {
    // Check if sort parameter starts with '-' (descending order)
    const isDescending = sort.startsWith("-");

    // Remove '-' prefix to get the actual column name
    const column = isDescending ? sort.substring(1) : sort;

    // Map API field names to database column names if needed
    const columnMap: Record<string, string> = {
      next_due_date: "next_due_date",
      title: "title",
    };

    const dbColumn = columnMap[column] ?? "next_due_date"; // fallback to default

    return {
      column: dbColumn,
      ascending: !isDescending,
    };
  }

  /**
   * Retrieves dashboard data for the authenticated user
   *
   * Includes:
   * - Overdue tasks (next_due_date < CURRENT_DATE)
   * - Upcoming tasks (next_due_date between CURRENT_DATE and CURRENT_DATE + 7 days)
   * - Next task in the future (if no overdue or upcoming tasks exist)
   * - Summary statistics
   *
   * @param userId - ID of the authenticated user
   * @returns DashboardDTO with all dashboard sections
   * @throws Error if database queries fail
   */
  async getDashboardData(userId: string): Promise<DashboardDTO> {
    // Get current date in YYYY-MM-DD format
    const currentDate = this.getCurrentDateISO();
    const sevenDaysLater = this.getDatePlusDaysISO(currentDate, 7);

    // Query overdue tasks
    const { data: overdueData, error: overdueError } = await this.supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .lt("next_due_date", currentDate)
      .order("next_due_date", { ascending: true });

    if (overdueError) {
      throw new Error(`Failed to retrieve overdue tasks: ${overdueError.message}`);
    }

    const overdue: TaskWithDaysOverdueDTO[] = (overdueData ?? []).map((task) => ({
      ...task,
      days_overdue: this.getDaysDifference(currentDate, task.next_due_date),
    }));

    // Query upcoming tasks
    const { data: upcomingData, error: upcomingError } = await this.supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .gte("next_due_date", currentDate)
      .lte("next_due_date", sevenDaysLater)
      .order("next_due_date", { ascending: true });

    if (upcomingError) {
      throw new Error(`Failed to retrieve upcoming tasks: ${upcomingError.message}`);
    }

    const upcoming: TaskWithDaysUntilDueDTO[] = (upcomingData ?? []).map((task) => ({
      ...task,
      days_until_due: this.getDaysDifference(task.next_due_date, currentDate),
    }));

    let next_task: NextTaskDTO | null = null;

    // Conditionally query next_task (only if overdue and upcoming are empty)
    if (overdue.length === 0 && upcoming.length === 0) {
      const { data: nextTaskData, error: nextTaskError } = await this.supabase
        .from("tasks")
        .select("id, title, next_due_date")
        .eq("user_id", userId)
        .gt("next_due_date", sevenDaysLater)
        .order("next_due_date", { ascending: true })
        .limit(1);

      if (nextTaskError) {
        throw new Error(`Failed to retrieve next task: ${nextTaskError.message}`);
      }

      if (nextTaskData && nextTaskData.length > 0) {
        const task = nextTaskData[0];
        next_task = {
          id: task.id,
          title: task.title,
          next_due_date: task.next_due_date,
          days_until_due: this.getDaysDifference(task.next_due_date, currentDate),
        };
      }
    }

    // Count total tasks
    const { count, error: countError } = await this.supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) {
      throw new Error(`Failed to count total tasks: ${countError.message}`);
    }

    const total_tasks = count ?? 0;

    // Construct DashboardDTO
    const summary: DashboardSummaryDTO = {
      total_overdue: overdue.length,
      total_upcoming: upcoming.length,
      total_tasks,
    };

    return {
      overdue,
      upcoming,
      next_task,
      summary,
    };
  }

  /**
   * Gets current date as ISO string (YYYY-MM-DD)
   */
  private getCurrentDateISO(): string {
    const now = new Date();
    return this.formatDateToISO(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
  }

  /**
   * Adds days to a date and returns ISO string
   */
  private getDatePlusDaysISO(isoDate: string, days: number): string {
    const date = new Date(isoDate);
    date.setUTCDate(date.getUTCDate() + days);
    return this.formatDateToISO(date);
  }

  /**
   * Calculates difference in days between two dates
   */
  private getDaysDifference(laterDate: string, earlierDate: string): number {
    const later = new Date(laterDate);
    const earlier = new Date(earlierDate);
    const diffTime = later.getTime() - earlier.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Performs a task action (complete or skip) and calculates next due date
   *
   * @param userId - ID of the authenticated user
   * @param taskId - ID of the task to act upon
   * @param actionType - Type of action to perform ("completed" | "skipped")
   * @returns Updated task with new next_due_date and action details
   * @throws Error if task not found, doesn't belong to user, or update fails
   */
  async performTaskAction(userId: string, taskId: string, actionType: ActionType): Promise<TaskDTO> {
    // Step 1: Fetch task and verify ownership in single query
    const { data: task, error: fetchError } = await this.supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("user_id", userId)
      .single();

    // Step 2: Handle not found (either doesn't exist or wrong user)
    if (fetchError || !task) {
      throw new Error("Task not found or does not belong to user");
    }

    // Step 3: Get current date
    const currentDate = this.getCurrentDateISO();

    // Step 4: Calculate next due date from current date
    const nextDueDate = this.calculateNextDueDate(task.interval_value, task.interval_unit, task.preferred_day_of_week);

    // Step 5: Update task with atomic operation
    const { data: updatedTask, error: updateError } = await this.supabase
      .from("tasks")
      .update({
        last_action_date: currentDate,
        last_action_type: actionType,
        next_due_date: nextDueDate,
      })
      .eq("id", taskId)
      .eq("user_id", userId)
      .select()
      .single();

    // Step 6: Handle update errors
    if (updateError || !updatedTask) {
      throw new Error(`Failed to update task: ${updateError?.message || "Unknown error"}`);
    }

    // Step 7: Return updated task
    return updatedTask as TaskDTO;
  }

  /**
   * Permanently deletes a task ensuring it belongs to the authenticated user
   *
   * @param userId - ID of the authenticated user
   * @param taskId - ID of the task to delete
   * @returns Promise<void> that resolves on successful deletion
   * @throws Error if task not found, doesn't belong to user, or deletion fails
   */
  async deleteTask(userId: string, taskId: string): Promise<void> {
    // Execute DELETE query with ownership verification
    // Using count: "exact" to check if any rows were deleted
    const { error, count } = await this.supabase
      .from("tasks")
      .delete({ count: "exact" })
      .eq("id", taskId)
      .eq("user_id", userId);

    // Handle database errors
    if (error) {
      throw new Error(`Failed to delete task: ${error.message}`);
    }

    // Check if task was found and deleted (count should be 1)
    // count === 0 means task doesn't exist or belongs to another user
    if (count === 0) {
      throw new Error("Task not found or does not belong to user");
    }

    // Success - task deleted, no return value needed
  }
}
