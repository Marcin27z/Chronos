import type { APIRoute } from "astro";

import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { signInWithEmailPassword } from "../../../lib/services/auth.service";
import { loginSchema } from "../../../lib/utils/auth.validation";
import { getAuthErrorMessage } from "../../../lib/utils/auth-errors.utils";

const jsonHeaders = { "Content-Type": "application/json" };

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    console.error("Login payload parse error:", error);
    return new Response(JSON.stringify({ error: "Nieprawidłowe dane" }), { status: 400, headers: jsonHeaders });
  }

  const parseResult = loginSchema.safeParse(payload);
  if (!parseResult.success) {
    return new Response(JSON.stringify({ error: parseResult.error.errors[0]?.message ?? "Nieprawidłowe dane" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const { email, password } = parseResult.data;
  const { data, error } = await signInWithEmailPassword(supabase, email, password);

  if (error || !data?.session) {
    const errorMessage = getAuthErrorMessage(error ?? null);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: error?.status ?? 400,
      headers: jsonHeaders,
    });
  }

  return new Response(JSON.stringify({ success: true, redirectTo: "/" }), {
    status: 200,
    headers: jsonHeaders,
  });
};
