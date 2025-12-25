import type { APIRoute } from "astro";
import { z } from "zod";
import type { NextDueDateResponseDTO, ValidationErrorDTO, ErrorDTO } from "../../../types";
import { authenticateUser } from "../../../lib/utils/auth.utils";
import { TaskService } from "../../../lib/services/task.service";

export const prerender = false;

/**
 * Zod validation schema for calculate next due date request
 */
const CalculateNextDueDateSchema = z.object({
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
    .min(0, "Preferred day of week must be between 0 and 6")
    .max(6, "Preferred day of week must be between 0 and 6")
    .nullable()
    .optional(),
});

/**
 * POST /api/tasks/calculate-next-due-date
 *
 * Calculates the next due date based on interval and preferred day of week.
 * This is a utility endpoint that doesn't create or modify any data.
 *
 * @requires Authentication via Bearer token
 * @requires Content-Type: application/json
 *
 * @param request - Astro API request containing calculation parameters
 * @returns 200 OK with NextDueDateResponseDTO on success
 * @returns 400 Bad Request on validation error
 * @returns 401 Unauthorized on authentication failure
 * @returns 500 Internal Server Error on unexpected errors
 *
 * @example
 * // Request
 * POST /api/tasks/calculate-next-due-date
 * {
 *   "interval_value": 6,
 *   "interval_unit": "months",
 *   "preferred_day_of_week": 6
 * }
 *
 * // Response (200 OK)
 * {
 *   "next_due_date": "2026-06-27"
 * }
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Content-Type Validation
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

    // 2. Authentication
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

    // 3. Request Body Parsing
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

    // 4. Input Validation
    const validationResult = CalculateNextDueDateSchema.safeParse(requestBody);

    if (!validationResult.success) {
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

    const validatedData = validationResult.data;

    // 5. Business Logic - Date Calculation
    const taskService = new TaskService(supabase);
    const nextDueDate: string = taskService.calculateNextDueDate(
      validatedData.interval_value,
      validatedData.interval_unit,
      validatedData.preferred_day_of_week ?? null
    );

    // 6. Success Response
    const response: NextDueDateResponseDTO = {
      next_due_date: nextDueDate,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // 7. Error Handling - Unexpected Errors
    // eslint-disable-next-line no-console
    console.error("Error calculating next due date:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: "An unexpected error occurred while calculating next due date",
      } satisfies ErrorDTO),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
