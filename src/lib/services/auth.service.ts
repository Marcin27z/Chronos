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

export async function signUpWithEmailPassword(
  supabase: SupabaseServerClient,
  email: string,
  password: string,
  options?: { emailRedirectTo?: string }
): Promise<Awaited<ReturnType<SupabaseServerClient["auth"]["signUp"]>>> {
  return supabase.auth.signUp({
    email,
    password,
    options: options?.emailRedirectTo ? { emailRedirectTo: options.emailRedirectTo } : undefined,
  });
}

export async function resetPasswordForEmail(
  supabase: SupabaseServerClient,
  email: string,
  options?: { redirectTo?: string }
): Promise<Awaited<ReturnType<SupabaseServerClient["auth"]["resetPasswordForEmail"]>>> {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: options?.redirectTo,
  });
}

export async function signOut(
  supabase: SupabaseServerClient
): Promise<Awaited<ReturnType<SupabaseServerClient["auth"]["signOut"]>>> {
  return supabase.auth.signOut();
}
