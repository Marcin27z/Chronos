import { z } from "zod";
import type { IntervalUnit } from "../../types";

/**
 * URL parameter schema for taskId validation
 */
export const taskIdParamSchema = z.object({
  taskId: z.string().uuid("Invalid task ID format. Must be a valid UUID."),
});

export type TaskIdParam = z.infer<typeof taskIdParamSchema>;

const INTERVAL_UNITS = ["days", "weeks", "months", "years"] as const satisfies readonly IntervalUnit[];

/**
 * Schema for validating update task payload
 * Ensures at least one field is provided and values match database constraints
 */
export const updateTaskBodySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title cannot be empty")
      .max(256, "Title must be at most 256 characters long")
      .optional(),
    description: z.string().max(5000, "Description must be at most 5000 characters long").nullable().optional(),
    interval_value: z
      .number({
        invalid_type_error: "interval_value must be a number",
      })
      .int("interval_value must be an integer")
      .min(1, "interval_value must be at least 1")
      .max(999, "interval_value must be less than 1000")
      .optional(),
    interval_unit: z
      .enum(INTERVAL_UNITS, {
        errorMap: () => ({ message: "interval_unit must be one of days, weeks, months, or years" }),
      })
      .optional(),
    preferred_day_of_week: z
      .number({
        invalid_type_error: "preferred_day_of_week must be a number",
      })
      .int("preferred_day_of_week must be an integer")
      .min(0, "preferred_day_of_week must be between 0 and 6")
      .max(6, "preferred_day_of_week must be between 0 and 6")
      .nullable()
      .optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.interval_value !== undefined ||
      data.interval_unit !== undefined ||
      data.preferred_day_of_week !== undefined,
    {
      message: "At least one field must be provided for update",
      path: [],
    }
  );

export type UpdateTaskBodyInput = z.infer<typeof updateTaskBodySchema>;

/**
 * Validates if a string is a valid UUID v4
 *
 * @param value - String to validate
 * @returns true if valid UUID v4, false otherwise
 */
export function isValidUUID(value: string): boolean {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return UUID_REGEX.test(value);
}

/**
 * Validates UUID and returns error response if invalid
 * Utility for API endpoints
 *
 * @param value - UUID string to validate
 * @param fieldName - Name of the field for error message
 * @returns Response object if invalid, null if valid
 */
export function validateUUIDOrError(value: string | undefined, fieldName = "ID"): Response | null {
  if (!value) {
    return new Response(
      JSON.stringify({
        error: "Invalid request",
        details: `${fieldName} is required`,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (!isValidUUID(value)) {
    return new Response(
      JSON.stringify({
        error: `Invalid ${fieldName.toLowerCase()} format`,
        details: `${fieldName} must be a valid UUID`,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return null;
}
