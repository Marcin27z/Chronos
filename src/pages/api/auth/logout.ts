import type { APIRoute } from "astro";

import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { signOut } from "../../../lib/services/auth.service";
import { getAuthErrorMessage } from "../../../lib/utils/auth-errors.utils";

const jsonHeaders = { "Content-Type": "application/json" };

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });

  const { error } = await signOut(supabase);

  if (error) {
    const errorMessage = getAuthErrorMessage(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: error.status ?? 400,
      headers: jsonHeaders,
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: jsonHeaders,
  });
};
