import type { User } from "@supabase/supabase-js";
import type { SupabaseServerClient } from "../../db/supabase.client";
import type { ErrorDTO } from "../../types";

/**
 * Authentication helper function for API endpoints
 *
 * @param request - Astro API request object
 * @param supabase - Supabase client instance
 * @returns Promise resolving to either { user, errorResponse: null } on success
 *         or { user: null, errorResponse } on failure
 */
export async function authenticateUser(
  request: Request,
  supabase: SupabaseServerClient
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
