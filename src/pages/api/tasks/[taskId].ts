import type { APIRoute } from "astro";

import { TaskService } from "../../../lib/services/task.service";
import { authenticateUser } from "../../../lib/utils/auth.utils";
import { taskIdParamSchema } from "../../../lib/utils/validation.utils";
import type { ErrorDTO, TaskDTO } from "../../../types";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals, request }) => {
  try {
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

    const taskIdValidation = taskIdParamSchema.safeParse({ taskId: params.taskId ?? "" });

    if (!taskIdValidation.success) {
      const firstError = taskIdValidation.error.errors[0];

      return new Response(
        JSON.stringify({
          error: "Invalid task ID format",
          ...(import.meta.env.DEV ? { details: firstError?.message ?? "taskId must be a valid UUID" } : {}),
        } satisfies ErrorDTO),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const taskService = new TaskService(supabase);

    let task: TaskDTO;
    try {
      task = await taskService.getTaskById(user.id, taskIdValidation.data.taskId);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return new Response(
          JSON.stringify({
            error: "Task not found",
          } satisfies ErrorDTO),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      throw error;
    }

    return new Response(JSON.stringify(task satisfies TaskDTO), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[GetTaskById] Unexpected error:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        ...(import.meta.env.DEV && error instanceof Error ? { details: error.message } : {}),
      } satisfies ErrorDTO),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
