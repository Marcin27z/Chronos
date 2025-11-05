import type { APIRoute } from "astro";
import type { DashboardDTO, ErrorDTO } from "../../../types";
import { authenticateUser } from "../../../lib/utils/auth.utils";
import { TaskService } from "../../../lib/services/task.service";

export const prerender = false;

/**
 * GET /api/tasks/dashboard
 *
 * Retrieves dashboard data for the authenticated user
 *
 * @requires Authentication via Bearer token
 *
 * @param request - Astro API request containing optional query parameters
 * @returns 200 OK with DashboardDTO on success
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
    // 3. Business Logic - Retrieve Dashboard Data
    // ==========================================
    const taskService = new TaskService(supabase);
    const dashboardData: DashboardDTO = await taskService.getDashboardData(user.id);

    // ==========================================
    // 4. Success Response
    // ==========================================
    return new Response(JSON.stringify(dashboardData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // ==========================================
    // 5. Error Handling - Unexpected Errors
    // ==========================================

    // Log error details for debugging (server-side only)
    console.error("Error retrieving dashboard data:", error);

    // Return generic error to client (don't expose internal details)
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: "An unexpected error occurred while retrieving dashboard data",
      } satisfies ErrorDTO),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
