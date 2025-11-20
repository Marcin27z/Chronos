import type { AuthError } from "@supabase/supabase-js";

const authErrorMappings: { match: string; message: string }[] = [
  {
    match: "User already registered",
    message: "Ten adres e-mail jest już zarejestrowany",
  },
  {
    match: "Email already exists",
    message: "Ten adres e-mail jest już zarejestrowany",
  },
  { match: "Invalid login credentials", message: "Nieprawidłowy e-mail lub hasło" },
  {
    match: "Email not confirmed",
    message: "Konto nie zostało jeszcze zweryfikowane. Sprawdź swoją skrzynkę e-mail",
  },
  {
    match: "Invalid token",
    message: "Link do resetu hasła wygasł lub jest nieprawidłowy. Poproś o nowy",
  },
  {
    match: "Token expired",
    message: "Link weryfikacyjny wygasł. Poproś o nowy",
  },
  {
    match: "Email rate limit exceeded",
    message: "Zbyt wiele prób. Spróbuj ponownie za kilka minut",
  },
  {
    match: "Failed to fetch",
    message: "Problem z połączeniem. Sprawdź internet i spróbuj ponownie",
  },
  {
    match: "Network",
    message: "Problem z połączeniem. Sprawdź internet i spróbuj ponownie",
  },
];

/**
 * Mapuje błędy Supabase Auth na przyjazny komunikat w języku polskim
 */
export function getAuthErrorMessage(error: AuthError | null | undefined): string {
  if (!error) {
    return "Wystąpił nieznany błąd. Spróbuj ponownie";
  }

  const errorIdentifier = error.message ?? error.status?.toString();

  for (const mapping of authErrorMappings) {
    if (errorIdentifier?.includes(mapping.match)) {
      return mapping.message;
    }
  }

  return "Wystąpił błąd. Spróbuj ponownie";
}

/**
 * Mapuje query param `error` na przyjazny komunikat
 */
export function getErrorMessageFromParam(param: string | null): string | undefined {
  switch (param) {
    case "verification_failed":
      return "Weryfikacja e-maila nie powiodła się. Spróbuj ponownie";
    case "invalid_token":
      return "Link do resetu hasła wygasł lub jest nieprawidłowy. Poproś o nowy";
    case "email_not_confirmed":
      return "Konto nie zostało zweryfikowane. Sprawdź swoją skrzynkę e-mail";
    case "expired":
      return "Link wygasł. Poproś o nowy";
    default:
      return undefined;
  }
}
