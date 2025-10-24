import type { Tables, TablesInsert, TablesUpdate, Enums } from "./db/database.types";

// ============================================================================
// Database Entity Type Aliases
// ============================================================================

/**
 * Task entity from database (complete row)
 */
export type Task = Tables<"tasks">;

/**
 * Task Template entity from database (complete row)
 */
export type TaskTemplate = Tables<"task_templates">;

// ============================================================================
// Enum Type Aliases
// ============================================================================

/**
 * Interval unit type: "days" | "weeks" | "months" | "years"
 */
export type IntervalUnit = Enums<"interval_unit_type">;

/**
 * Action type: "completed" | "skipped"
 */
export type ActionType = Enums<"action_type">;

// ============================================================================
// Command Models (Request DTOs)
// ============================================================================

/**
 * Command to create a new task
 * Based on Tasks Insert, excluding auto-generated and calculated fields
 */
export type CreateTaskCommand = Pick<
  TablesInsert<"tasks">,
  "title" | "description" | "interval_value" | "interval_unit" | "preferred_day_of_week"
>;

/**
 * Command to update an existing task
 * All fields are optional, at least one must be provided
 * Based on Tasks Update, excluding user_id and auto-managed fields
 */
export type UpdateTaskCommand = Partial<
  Pick<TablesUpdate<"tasks">, "title" | "description" | "interval_value" | "interval_unit" | "preferred_day_of_week">
>;

// ============================================================================
// Response DTOs - Tasks
// ============================================================================

/**
 * Standard task data transfer object
 * Complete task representation for API responses
 */
export type TaskDTO = Task;

/**
 * Task with additional calculated field for dashboard overdue section
 */
export type TaskWithDaysOverdueDTO = TaskDTO & {
  /**
   * Number of days the task is overdue (positive integer)
   * Calculated as: CURRENT_DATE - next_due_date
   */
  days_overdue: number;
};

/**
 * Task with additional calculated field for dashboard upcoming section
 */
export type TaskWithDaysUntilDueDTO = TaskDTO & {
  /**
   * Number of days until the task is due (positive integer)
   * Calculated as: next_due_date - CURRENT_DATE
   */
  days_until_due: number;
};

/**
 * Minimal task representation for dashboard "next task" section
 */
export type NextTaskDTO = Pick<Task, "id" | "title" | "next_due_date"> & {
  /**
   * Number of days until the task is due
   */
  days_until_due: number;
};

/**
 * Dashboard summary statistics
 */
export interface DashboardSummaryDTO {
  /**
   * Total number of overdue tasks
   */
  total_overdue: number;

  /**
   * Total number of upcoming tasks (within next 7 days)
   */
  total_upcoming: number;

  /**
   * Total number of all user tasks
   */
  total_tasks: number;
}

/**
 * Complete dashboard data transfer object
 * Includes overdue, upcoming, next task, and summary statistics
 */
export interface DashboardDTO {
  /**
   * Tasks that are overdue (next_due_date < CURRENT_DATE)
   * Sorted by due date (oldest first)
   */
  overdue: TaskWithDaysOverdueDTO[];

  /**
   * Tasks due within the next 7 days
   * Sorted by due date (nearest first)
   */
  upcoming: TaskWithDaysUntilDueDTO[];

  /**
   * The nearest task in the future (if no overdue or upcoming tasks exist)
   * Null if there are overdue or upcoming tasks, or if no tasks exist
   */
  next_task: NextTaskDTO | null;

  /**
   * Summary statistics for the dashboard
   */
  summary: DashboardSummaryDTO;
}

// ============================================================================
// Response DTOs - Pagination
// ============================================================================

/**
 * Pagination metadata for list responses
 */
export interface PaginationDTO {
  /**
   * Total number of items matching the query
   */
  total: number;

  /**
   * Maximum number of items per page
   */
  limit: number;

  /**
   * Number of items skipped (for pagination)
   */
  offset: number;

  /**
   * Whether there are more items available
   */
  has_more: boolean;
}

/**
 * Paginated list of tasks
 */
export interface TaskListDTO {
  /**
   * Array of task objects
   */
  data: TaskDTO[];

  /**
   * Pagination metadata
   */
  pagination: PaginationDTO;
}

// ============================================================================
// Response DTOs - Task Templates
// ============================================================================

/**
 * Task template data transfer object
 * Complete template representation for API responses
 */
export type TaskTemplateDTO = TaskTemplate;

/**
 * List of task templates
 */
export interface TaskTemplatesListDTO {
  /**
   * Array of task template objects
   */
  data: TaskTemplateDTO[];
}

// ============================================================================
// Response DTOs - User Profile
// ============================================================================

/**
 * User task statistics for profile
 */
export interface TaskStatisticsDTO {
  /**
   * Total number of tasks created by user
   */
  total_tasks: number;

  /**
   * Total number of completed actions across all tasks
   */
  completed_count: number;

  /**
   * Total number of skipped actions across all tasks
   */
  skipped_count: number;

  /**
   * Whether user has completed onboarding (has at least 1 task)
   */
  is_onboarding_complete: boolean;
}

/**
 * User profile data transfer object
 * Note: User data comes from Supabase Auth, not from Database types
 */
export interface UserProfileDTO {
  /**
   * User ID (UUID from Supabase Auth)
   */
  id: string;

  /**
   * User email address
   */
  email: string;

  /**
   * Timestamp when email was confirmed (ISO 8601 format)
   * Null if email not yet confirmed
   */
  email_confirmed_at: string | null;

  /**
   * Timestamp when user account was created (ISO 8601 format)
   */
  created_at: string;

  /**
   * User's task-related statistics
   */
  task_statistics: TaskStatisticsDTO;
}

// ============================================================================
// Error Response DTOs
// ============================================================================

/**
 * Validation error detail for a specific field
 */
export interface ValidationErrorDetail {
  /**
   * Name of the field that failed validation
   */
  field: string;

  /**
   * Human-readable error message
   */
  message: string;
}

/**
 * Validation error response
 */
export interface ValidationErrorDTO {
  /**
   * Error message summary
   */
  error: string;

  /**
   * Array of field-specific validation errors
   */
  details: ValidationErrorDetail[];
}

/**
 * Generic error response
 */
export interface ErrorDTO {
  /**
   * Error message
   */
  error: string;

  /**
   * Optional additional error details
   */
  details?: string;
}
