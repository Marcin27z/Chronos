import { z } from "zod";

/**
 * URL parameter schema for taskId validation
 */
export const taskIdParamSchema = z.object({
  taskId: z.string().uuid("Invalid task ID format. Must be a valid UUID."),
});

export type TaskIdParam = z.infer<typeof taskIdParamSchema>;

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
