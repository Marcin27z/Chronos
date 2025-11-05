import type { APIRoute } from "astro";
import { TaskService } from "../../../../lib/services/task.service";
import type { TaskDTO, ErrorDTO } from "../../../../types";
import { authenticateUser } from "../../../../lib/utils/auth.utils";
import { validateUUIDOrError } from "../../../../lib/utils/validation.utils";

// Disable prerendering for API route
export const prerender = false;

/**
 * POST /api/tasks/{taskId}/skip
 * Marks task as skipped and calculates next due date
 */
export const POST: APIRoute = async (context) => {
  try {
    // Step 1: Verify authentication (handled by authenticateUser helper)
    const supabase = context.locals.supabase;
    if (!supabase) {
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          details: "Database connection not available",
        } satisfies ErrorDTO),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { user, errorResponse: authErrorResponse } = await authenticateUser(context.request, supabase);

    if (authErrorResponse) {
      return authErrorResponse;
    }

    if (!user) {
      // This shouldn't happen if errorResponse is null, but TypeScript requires it
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          details: "Missing or invalid authentication token",
        } satisfies ErrorDTO),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 2: Extract and validate taskId from URL params
    const taskId = context.params.taskId;
    const validationError = validateUUIDOrError(taskId, "Task ID");
    if (validationError) {
      return validationError;
    }
    // taskId is now guaranteed to be a valid UUID

    // Step 3: Initialize service and skip task
    const taskService = new TaskService(supabase);

    let skippedTask: TaskDTO;
    try {
      skippedTask = await taskService.performTaskAction(user.id, taskId as string, "skipped");
    } catch (error) {
      // Check if it's a "not found" error
      if (error instanceof Error && error.message.includes("not found")) {
        return new Response(
          JSON.stringify({
            error: "Task not found",
            details: "Task does not exist or does not belong to the authenticated user",
          } satisfies ErrorDTO),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Re-throw for general error handler
      throw error;
    }

    // Step 4: Return success response
    return new Response(JSON.stringify(skippedTask satisfies TaskDTO), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Step 5: Handle unexpected errors
    console.error("[SkipTask] Unexpected error:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: "Failed to skip task",
      } satisfies ErrorDTO),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
