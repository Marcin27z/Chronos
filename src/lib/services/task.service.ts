import type { SupabaseClient } from "../../db/supabase.client";
import type { CreateTaskCommand, TaskDTO, TaskListDTO, PaginationDTO } from "../../types";

/**
 * Task Service
 *
 * Handles business logic for task operations including:
 * - Task creation with automatic next_due_date calculation
 * - Date calculations based on interval and preferences
 */
export class TaskService {
  constructor(private supabase: SupabaseClient) {}

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
}
