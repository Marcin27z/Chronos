import type { APIRoute } from "astro";

import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { resetPasswordForEmail } from "../../../lib/services/auth.service";
import { forgotPasswordSchema } from "../../../lib/utils/auth.validation";
import { getAuthErrorMessage } from "../../../lib/utils/auth-errors.utils";

const jsonHeaders = { "Content-Type": "application/json" };

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Nieprawidłowe dane" }), { status: 400, headers: jsonHeaders });
  }

  const parseResult = forgotPasswordSchema.safeParse(payload);
  if (!parseResult.success) {
    return new Response(JSON.stringify({ error: parseResult.error.errors[0]?.message ?? "Nieprawidłowe dane" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const { email } = parseResult.data;
  const origin = new URL(request.url).origin;
  const redirectTo = `${origin}/reset-password`;

  const { error } = await resetPasswordForEmail(supabase, email, { redirectTo });

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
      message: `Jeśli konto istnieje, wysłaliśmy link resetujący hasło na adres ${email}.`,
    }),
    {
      status: 200,
      headers: jsonHeaders,
    }
  );
};
