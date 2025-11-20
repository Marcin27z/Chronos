import type { APIRoute } from "astro";

import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { signUpWithEmailPassword } from "../../../lib/services/auth.service";
import { registerSchema } from "../../../lib/utils/auth.validation";
import { getAuthErrorMessage } from "../../../lib/utils/auth-errors.utils";

const jsonHeaders = { "Content-Type": "application/json" };

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    console.error("Register payload parse error:", error);
    return new Response(JSON.stringify({ error: "Nieprawidłowe dane" }), { status: 400, headers: jsonHeaders });
  }

  const parseResult = registerSchema.safeParse(payload);
  if (!parseResult.success) {
    return new Response(JSON.stringify({ error: parseResult.error.errors[0]?.message ?? "Nieprawidłowe dane" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const { email, password } = parseResult.data;
  const origin = new URL(request.url).origin;
  const redirectTo = `${origin}/verify-email`;

  const { error } = await signUpWithEmailPassword(supabase, email, password, { emailRedirectTo: redirectTo });

  if (error) {
    const errorMessage = getAuthErrorMessage(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: error.status ?? 400,
      headers: jsonHeaders,
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: `Na adres ${email} wysłaliśmy link weryfikacyjny. Sprawdź swoją skrzynkę pocztową.`,
    }),
    {
      status: 200,
      headers: jsonHeaders,
    }
  );
};
