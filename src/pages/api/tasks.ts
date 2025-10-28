import type { APIRoute } from "astro";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";
import type { CreateTaskCommand, TaskDTO, TaskListDTO, ValidationErrorDTO, ErrorDTO } from "../../types";
import type { SupabaseClient } from "../../db/supabase.client";
import { TaskService } from "../../lib/services/task.service";

/**
 * Disable prerendering for this API route
 * Required for server-side request handling
 */
export const prerender = false;

/**
 * Zod validation schema for task creation
 * Mirrors CreateTaskCommand with runtime validation rules
 */
const CreateTaskSchema = z.object({
  title: z
    .string({ required_error: "Title is required" })
    .trim()
    .min(1, "Title cannot be empty")
    .max(256, "Title must not exceed 256 characters"),

  description: z
    .string()
    .max(5000, "Description must not exceed 5000 characters")
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),

  interval_value: z
    .number({ required_error: "Interval value is required" })
    .int("Interval value must be an integer")
    .min(1, "Interval value must be at least 1")
    .max(999, "Interval value must not exceed 999"),

  interval_unit: z.enum(["days", "weeks", "months", "years"], {
    required_error: "Interval unit is required",
    invalid_type_error: "Interval unit must be one of: days, weeks, months, years",
  }),

  preferred_day_of_week: z
    .number()
    .int("Preferred day of week must be an integer")
    .min(0, "Preferred day of week must be between 0 (Sunday) and 6 (Saturday)")
    .max(6, "Preferred day of week must be between 0 (Sunday) and 6 (Saturday)")
    .optional()
    .nullable(),
});

/**
 * Zod validation schema for GET /api/tasks query parameters
 * Mirrors the expected query parameters with runtime validation rules
 */
const GetTasksQuerySchema = z.object({
  sort: z.enum(["next_due_date", "-next_due_date", "title", "-title"]).optional().default("next_due_date"),

  limit: z.coerce
    .number()
    .int()
    .min(1, "Limit must be at least 1")
    .max(100, "Limit must not exceed 100")
    .optional()
    .default(50),

  offset: z.coerce.number().int().min(0, "Offset must be non-negative").optional().default(0),
});

/**
 * Type alias for validated GET /api/tasks query parameters
 * Automatically inferred from the Zod schema for type safety
 */
type GetTasksQuery = z.infer<typeof GetTasksQuerySchema>;

/**
 * Authentication helper function for API endpoints
 *
 * @param request - Astro API request object
 * @param supabase - Supabase client instance
 * @returns Promise resolving to either { user, errorResponse: null } on success
 *         or { user: null, errorResponse } on failure
 */
async function authenticateUser(
  request: Request,
  supabase: SupabaseClient
): Promise<{ user: User | null; errorResponse: Response | null }> {
  // Check for Authorization header
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return {
      user: null,
      errorResponse: new Response(
        JSON.stringify({
          error: "Authorization header is missing",
        } satisfies ErrorDTO),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      ),
    };
  }

  // Extract Bearer token
  const token = authHeader.replace(/^Bearer\s+/i, "");

  if (!token || token === authHeader) {
    return {
      user: null,
      errorResponse: new Response(
        JSON.stringify({
          error: "Authorization header must use Bearer token format",
        } satisfies ErrorDTO),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      ),
    };
  }

  // Validate token with Supabase

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return {
      user: null,
      errorResponse: new Response(
        JSON.stringify({
          error: "Invalid or expired token",
        } satisfies ErrorDTO),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      ),
    };
  }

  // Success case
  return {
    user,
    errorResponse: null,
  };
}

/**
 * POST /api/tasks
 *
 * Creates a new recurring task for the authenticated user
 *
 * @requires Authentication via Bearer token
 * @requires Content-Type: application/json
 *
 * @param request - Astro API request containing task data
 * @returns 201 Created with TaskDTO on success
 * @returns 400 Bad Request on validation error
 * @returns 401 Unauthorized on authentication failure
 * @returns 500 Internal Server Error on unexpected errors
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // ==========================================
    // 1. Content-Type Validation
    // ==========================================
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return new Response(
        JSON.stringify({
          error: "Invalid Content-Type",
          details: "Content-Type must be application/json",
        } satisfies ErrorDTO),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ==========================================
    // 2. Authentication
    // ==========================================
    const supabase = locals.supabase;
    if (!supabase) {
      return new Response(
        JSON.stringify({
          error: "Database client not available",
        } satisfies ErrorDTO),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { user, errorResponse: authErrorResponse } = await authenticateUser(request, supabase);

    if (authErrorResponse) {
      return authErrorResponse;
    }

    if (!user) {
      // This shouldn't happen if errorResponse is null, but TypeScript requires it
      return new Response(
        JSON.stringify({
          error: "Authentication failed",
        } satisfies ErrorDTO),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ==========================================
    // 3. Request Body Parsing
    // ==========================================
    let requestBody: unknown;

    try {
      requestBody = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Invalid JSON",
          details: "Request body must be valid JSON",
        } satisfies ErrorDTO),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ==========================================
    // 4. Input Validation with Zod
    // ==========================================
    const validationResult = CreateTaskSchema.safeParse(requestBody);

    if (!validationResult.success) {
      // Transform Zod errors to ValidationErrorDTO format
      const validationErrors: ValidationErrorDTO = {
        error: "Validation failed",
        details: validationResult.error.errors.map((err) => ({
          field: err.path.join(".") || "unknown",
          message: err.message,
        })),
      };

      return new Response(JSON.stringify(validationErrors), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validatedCommand: CreateTaskCommand = validationResult.data;

    // ==========================================
    // 5. Business Logic - Task Creation
    // ==========================================
    const taskService = new TaskService(supabase);
    const createdTask: TaskDTO = await taskService.createTask(user.id, validatedCommand);

    // ==========================================
    // 6. Success Response
    // ==========================================
    return new Response(JSON.stringify(createdTask), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // ==========================================
    // 7. Error Handling - Unexpected Errors
    // ==========================================
    // Log error details for debugging (in production, use proper logging service)
    console.error("Error creating task:", error);

    // Return generic error to client (don't expose internal details)
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: "An unexpected error occurred while creating the task",
      } satisfies ErrorDTO),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * GET /api/tasks
 *
 * Retrieves a paginated list of recurring tasks for the authenticated user
 *
 * @requires Authentication via Bearer token
 *
 * @param request - Astro API request containing optional query parameters
 * @returns 200 OK with TaskListDTO on success
 * @returns 400 Bad Request on validation error
 * @returns 401 Unauthorized on authentication failure
 * @returns 500 Internal Server Error on unexpected errors
 */
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // ==========================================
    // 1. Authentication
    // ==========================================
    const supabase = locals.supabase;
    if (!supabase) {
      return new Response(
        JSON.stringify({
          error: "Database client not available",
        } satisfies ErrorDTO),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { user, errorResponse: authErrorResponse } = await authenticateUser(request, supabase);

    if (authErrorResponse) {
      return authErrorResponse;
    }

    if (!user) {
      // This shouldn't happen if errorResponse is null, but TypeScript requires it
      return new Response(
        JSON.stringify({
          error: "Authentication failed",
        } satisfies ErrorDTO),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ==========================================
    // 2. Extract and Validate Query Parameters
    // ==========================================
    const url = new URL(request.url);
    const queryParams = {
      sort: url.searchParams.get("sort") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      offset: url.searchParams.get("offset") ?? undefined,
    };

    const validationResult = GetTasksQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      // Transform Zod errors to ValidationErrorDTO format
      const validationErrors: ValidationErrorDTO = {
        error: "Validation failed",
        details: validationResult.error.errors.map((err) => ({
          field: err.path.join(".") || "unknown",
          message: err.message,
        })),
      };

      return new Response(JSON.stringify(validationErrors), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validatedQuery: GetTasksQuery = validationResult.data;

    // ==========================================
    // 3. Business Logic - Retrieve Tasks
    // ==========================================
    const taskService = new TaskService(supabase);
    const taskList: TaskListDTO = await taskService.getTasks(
      user.id,
      validatedQuery.sort,
      validatedQuery.limit,
      validatedQuery.offset
    );

    // ==========================================
    // 4. Success Response
    // ==========================================
    return new Response(JSON.stringify(taskList), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // ==========================================
    // 5. Error Handling - Unexpected Errors
    // ==========================================
    // Log error details for debugging (in production, use proper logging service)
    console.error("Error retrieving tasks:", error);

    // Return generic error to client (don't expose internal details)
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred while retrieving tasks",
      } satisfies ErrorDTO),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
