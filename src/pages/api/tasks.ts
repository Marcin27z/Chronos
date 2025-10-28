import type { APIRoute } from "astro";
import { z } from "zod";
import type { CreateTaskCommand, TaskDTO, ValidationErrorDTO, ErrorDTO } from "../../types";
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

    // // ==========================================
    // // 2. Authentication
    // // ==========================================
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: "Authentication required",
          details: "Authorization header is missing",
        } satisfies ErrorDTO),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // // Extract Bearer token
    const token = authHeader.replace(/^Bearer\s+/i, "");

    if (!token || token === authHeader) {
      return new Response(
        JSON.stringify({
          error: "Invalid authentication",
          details: "Authorization header must use Bearer token format",
        } satisfies ErrorDTO),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // // Validate token with Supabase
    const supabase = locals.supabase;
    if (!supabase) {
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          details: "Database client not available",
        } satisfies ErrorDTO),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "Authentication failed",
          details: "Invalid or expired token",
        } satisfies ErrorDTO),
        {
          status: 401,
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
    } catch (error) {
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
