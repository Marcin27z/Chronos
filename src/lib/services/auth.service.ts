import type { SupabaseServerClient } from "../../db/supabase.client";

export async function signInWithEmailPassword(
  supabase: SupabaseServerClient,
  email: string,
  password: string
): Promise<Awaited<ReturnType<SupabaseServerClient["auth"]["signInWithPassword"]>>> {
  return supabase.auth.signInWithPassword({
    email,
    password,
  });
}
