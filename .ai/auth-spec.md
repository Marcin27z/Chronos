# Specyfikacja Techniczna - Moduł Autentykacji

## Spis treści
1. [Przegląd](#przegląd)
2. [Architektura interfejsu użytkownika](#architektura-interfejsu-użytkownika)
3. [Logika backendowa](#logika-backendowa)
4. [System autentykacji](#system-autentykacji)
5. [Bezpieczeństwo](#bezpieczeństwo)
6. [Walidacja i komunikaty błędów](#walidacja-i-komunikaty-błędów)

---

## Przegląd

### Cel modułu
Moduł autentykacji dostarcza pełną funkcjonalność zarządzania kontami użytkowników, obejmującą:
- Rejestrację nowych użytkowników z weryfikacją e-mail
- Logowanie i wylogowywanie
- Odzyskiwanie hasła
- Usuwanie konta użytkownika
- Ochronę zasobów wymagających autoryzacji
- Zarządzanie sesjami użytkowników

### Technologie
- **Frontend**: Astro 5 (strony), React 19 (komponenty interaktywne), Tailwind 4, Shadcn/ui
- **Backend**: Supabase Auth, Astro SSR endpoints
- **Walidacja**: Zod schemas
- **Sesje**: Supabase session management

### Integracja z istniejącym systemem
Moduł wykorzystuje już skonfigurowane elementy:
- `src/middleware/index.ts` - przekazuje `supabaseClient` przez `context.locals`
- `src/lib/utils/auth.utils.ts` - zawiera helper `authenticateUser()` dla API endpoints
- RLS policies w bazie danych - zabezpieczają dostęp do tabel `tasks` i `task_templates`
- `src/pages/index.astro` - już sprawdza sesję i przekierowuje niezalogowanych użytkowników

---

## Architektura interfejsu użytkownika

### 1. Struktura stron (Astro)

#### 1.1. Strona logowania (`/login`)
**Plik**: `src/pages/login.astro`

**Opis**: Statyczna strona Astro zawierająca formularz logowania jako komponent React.

**Logika server-side**:
```typescript
// W części frontmatter Astro:
const supabase = Astro.locals.supabase;
const { data: { session } } = await supabase.auth.getSession();

// Jeśli użytkownik już zalogowany, przekieruj na dashboard
if (session) {
  return Astro.redirect("/");
}

// Obsługa query params dla komunikatów (np. ?error=expired)
const errorParam = Astro.url.searchParams.get("error");

export const prerender = false;
```

**Elementy UI**:
- Logo aplikacji lub nagłówek "Chronos"
- Komponent React `<LoginForm />` (client:load)
- Link do strony rejestracji: "Nie masz konta? Zarejestruj się"
- Link do odzyskiwania hasła: "Zapomniałeś hasła?"
- Komunikaty błędu na podstawie query params

**Przypadki użycia**:
- Wyświetlenie po przekierowaniu z chronionych stron
- Wyświetlenie błędu z procesu weryfikacji (query param `?error=...`)

---

#### 1.2. Strona rejestracji (`/register`)
**Plik**: `src/pages/register.astro`

**Opis**: Statyczna strona Astro zawierająca formularz rejestracji jako komponent React.

**Logika server-side**:
```typescript
const supabase = Astro.locals.supabase;
const { data: { session } } = await supabase.auth.getSession();

// Jeśli użytkownik już zalogowany, przekieruj na dashboard
if (session) {
  return Astro.redirect("/");
}

export const prerender = false;
```

**Elementy UI**:
- Logo aplikacji lub nagłówek "Chronos"
- Komponent React `<RegisterForm />` (client:load)
- Link do strony logowania

**Przypadki użycia**:
- Rejestracja nowego użytkownika
- Wyświetlenie komunikatu o wysłaniu e-maila weryfikacyjnego po rejestracji

---

#### 1.3. Strona potwierdzenia weryfikacji (`/verify-email`)
**Plik**: `src/pages/verify-email.astro`

**Opis**: Strona docelowa po kliknięciu w link weryfikacyjny w e-mailu. Obsługuje proces weryfikacji e-maila.

**Logika server-side**:
```typescript
const supabase = Astro.locals.supabase;

// Supabase automatycznie obsługuje token z URL (hash fragment)
// i tworzy sesję dla użytkownika
const { data: { session } } = await supabase.auth.getSession();

if (session?.user?.email_confirmed_at) {
  // E-mail zweryfikowany pomyślnie - użytkownik jest automatycznie zalogowany
  // Przekieruj na dashboard z parametrem sukcesu
  return Astro.redirect("/?verified=true");
} else {
  // Problem z weryfikacją
  const error = Astro.url.searchParams.get("error");
  const errorMessage = Astro.url.searchParams.get("error_description");
  
  // Przekieruj na login z informacją o błędzie
  return Astro.redirect(`/login?error=${error || "verification_failed"}`);
}

export const prerender = false;
```

**Elementy UI**:
- Spinner/loader podczas przetwarzania weryfikacji
- Komunikat "Weryfikacja w toku..."

**Uwaga**: Supabase Auth automatycznie loguje użytkownika po weryfikacji email. Jest to standardowe zachowanie zgodne z best practices większości systemów autentykacji i zapewnia lepsze UX (użytkownik nie musi się logować drugi raz).

---

#### 1.4. Strona odzyskiwania hasła (`/forgot-password`)
**Plik**: `src/pages/forgot-password.astro`

**Opis**: Strona z formularzem do wysłania linku resetującego hasło.

**Logika server-side**:
```typescript
const supabase = Astro.locals.supabase;
const { data: { session } } = await supabase.auth.getSession();

// Jeśli użytkownik już zalogowany, przekieruj na dashboard
if (session) {
  return Astro.redirect("/");
}

export const prerender = false;
```

**Elementy UI**:
- Logo aplikacji lub nagłówek "Chronos"
- Komponent React `<ForgotPasswordForm />` (client:load)
- Link powrotu do logowania
- Komunikat sukcesu po wysłaniu e-maila

**Przypadki użycia**:
- Użytkownik zapomniał hasła
- Wyświetlenie komunikatu o wysłaniu e-maila z linkiem resetującym

---

#### 1.5. Strona resetowania hasła (`/reset-password`)
**Plik**: `src/pages/reset-password.astro`

**Opis**: Strona docelowa po kliknięciu w link resetujący hasło. Zawiera formularz do ustawienia nowego hasła.

**Logika server-side**:
```typescript
const supabase = Astro.locals.supabase;

// Sprawdzenie, czy w URL jest token resetu hasła (hash fragment)
// Supabase automatycznie go obsługuje
const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  // Brak ważnego tokenu lub token wygasł
  return Astro.redirect("/login?error=invalid_token");
}

export const prerender = false;
```

**Elementy UI**:
- Logo aplikacji lub nagłówek "Chronos"
- Komponent React `<ResetPasswordForm />` (client:load)
- Komunikat o konieczności podania nowego hasła

**Przypadki użycia**:
- Użytkownik kliknął w link z e-maila resetującego hasło
- Ustawienie nowego hasła
- Przekierowanie na dashboard po pomyślnej zmianie hasła

---

#### 1.6. Strona ustawień konta (`/settings`)
**Plik**: `src/pages/settings.astro`

**Opis**: Strona z ustawieniami konta użytkownika, w tym opcją usunięcia konta.

**Logika server-side**:
```typescript
const supabase = Astro.locals.supabase;
const {
  data: { session },
} = await supabase.auth.getSession();

if (!session) {
  return Astro.redirect("/login");
}

const {
  data: { user },
} = await supabase.auth.getUser();

const token = session.access_token;

export const prerender = false;
```

**Elementy UI**:
- Logo aplikacji lub nagłówek "Chronos"
- Sekcja "Informacje o koncie":
  - Email użytkownika (tylko do odczytu)
  - Data utworzenia konta
- Sekcja "Zarządzanie kontem":
  - Komponent React `<DeleteAccountSection token={token} />` (client:load)

**Przypadki użycia**:
- Użytkownik chce zobaczyć informacje o swoim koncie
- Użytkownik chce usunąć swoje konto (US-015)

---

#### 1.7. Strona informacyjna po usunięciu konta (`/account-deleted`)
**Plik**: `src/pages/account-deleted.astro`

**Opis**: Strona informacyjna wyświetlana po pomyślnym usunięciu konta.

**Logika server-side**:
```typescript
// Brak sprawdzenia sesji - strona publiczna

export const prerender = false;
```

**Elementy UI**:
- Logo aplikacji lub nagłówek "Chronos"
- Komunikat: "Twoje konto zostało usunięte"
- Tekst: "Wszystkie Twoje dane zostały trwale usunięte z naszej bazy danych. Dziękujemy za korzystanie z Chronos."
- Link: "Powrót do strony głównej" → `/login`

**Przypadki użycia**:
- Wyświetlenie po pomyślnym usunięciu konta
- Potwierdzenie dla użytkownika że operacja się powiodła

---

### 2. Komponenty React (Interaktywne formularze)

Wszystkie komponenty React znajdują się w: `src/components/auth/`

#### 2.1. LoginForm
**Plik**: `src/components/auth/LoginForm.tsx`

**Odpowiedzialności**:
- Renderowanie formularza z polami: email, hasło
- Walidacja danych wejściowych po stronie klienta (Zod)
- Obsługa submitu formularza
- Wywołanie `supabase.auth.signInWithPassword()`
- Wyświetlanie komunikatów błędów
- Obsługa stanu ładowania (disabled inputs, loading spinner)
- Przekierowanie na dashboard po pomyślnym logowaniu

**Stan komponentu**:
```typescript
interface LoginFormState {
  email: string;
  password: string;
  isLoading: boolean;
  error: string | null;
}
```

**Walidacja (Zod schema)**:
```typescript
const loginSchema = z.object({
  email: z.string().email("Nieprawidłowy format adresu e-mail"),
  password: z.string().min(1, "Hasło jest wymagane")
});
```

**Komunikaty błędów**:
- "Nieprawidłowy format adresu e-mail" - walidacja klienta
- "Hasło jest wymagane" - walidacja klienta
- "Nieprawidłowy e-mail lub hasło" - błąd z Supabase Auth
- "Konto nie zostało jeszcze zweryfikowane. Sprawdź swoją skrzynkę e-mail" - email_not_confirmed
- "Wystąpił błąd. Spróbuj ponownie" - błąd sieciowy

**Flow logowania**:
1. Użytkownik wypełnia formularz
2. Walidacja po stronie klienta (Zod)
3. `supabase.auth.signInWithPassword({ email, password })`
4. Przy sukcesie: `window.location.href = "/"` (pełne przeładowanie dla SSR)
5. Przy błędzie: wyświetlenie komunikatu

---

#### 2.2. RegisterForm
**Plik**: `src/components/auth/RegisterForm.tsx`

**Odpowiedzialności**:
- Renderowanie formularza z polami: email, hasło, potwierdź hasło
- Walidacja danych wejściowych (Zod)
- Sprawdzanie zgodności haseł
- Obsługa submitu formularza
- Wywołanie `supabase.auth.signUp()`
- Wyświetlanie komunikatu o wysłaniu e-maila weryfikacyjnego
- Obsługa stanu ładowania

**Stan komponentu**:
```typescript
interface RegisterFormState {
  email: string;
  password: string;
  confirmPassword: string;
  isLoading: boolean;
  error: string | null;
  success: boolean; // Do wyświetlenia komunikatu o wysłaniu e-maila
}
```

**Walidacja (Zod schema)**:
```typescript
const registerSchema = z.object({
  email: z.string().email("Nieprawidłowy format adresu e-mail"),
  password: z
    .string()
    .min(8, "Hasło musi mieć co najmniej 8 znaków")
    .regex(/[A-Z]/, "Hasło musi zawierać co najmniej jedną wielką literę")
    .regex(/[a-z]/, "Hasło musi zawierać co najmniej jedną małą literę")
    .regex(/[0-9]/, "Hasło musi zawierać co najmniej jedną cyfrę"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Hasła muszą być identyczne",
  path: ["confirmPassword"]
});
```

**Komunikaty błędów i sukcesów**:
- Komunikaty walidacji (jw.)
- "Ten adres e-mail jest już zarejestrowany" - user_already_exists
- "Na adres {email} wysłaliśmy link weryfikacyjny. Sprawdź swoją skrzynkę pocztową" - sukces
- "Wystąpił błąd. Spróbuj ponownie" - błąd sieciowy

**Flow rejestracji**:
1. Użytkownik wypełnia formularz
2. Walidacja po stronie klienta (Zod)
3. `supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/verify-email" } })`
4. Wyświetlenie komunikatu o wysłaniu e-maila
5. Użytkownik nie jest jeszcze zalogowany - musi kliknąć w link w e-mailu

---

#### 2.3. ForgotPasswordForm
**Plik**: `src/components/auth/ForgotPasswordForm.tsx`

**Odpowiedzialności**:
- Renderowanie formularza z polem: email
- Walidacja adresu e-mail
- Obsługa submitu formularza
- Wywołanie `supabase.auth.resetPasswordForEmail()`
- Wyświetlanie komunikatu o wysłaniu e-maila

**Stan komponentu**:
```typescript
interface ForgotPasswordFormState {
  email: string;
  isLoading: boolean;
  error: string | null;
  success: boolean;
}
```

**Walidacja (Zod schema)**:
```typescript
const forgotPasswordSchema = z.object({
  email: z.string().email("Nieprawidłowy format adresu e-mail")
});
```

**Komunikaty**:
- "Nieprawidłowy format adresu e-mail" - walidacja
- "Jeśli konto z tym adresem e-mail istnieje, wysłaliśmy na nie link do zresetowania hasła" - zawsze pokazujemy ten komunikat (bezpieczeństwo - nie ujawniamy, czy e-mail istnieje)
- "Wystąpił błąd. Spróbuj ponownie" - błąd sieciowy

**Flow odzyskiwania hasła**:
1. Użytkownik podaje e-mail
2. Walidacja po stronie klienta
3. `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" })`
4. Wyświetlenie komunikatu (zawsze sukces dla bezpieczeństwa)

---

#### 2.4. ResetPasswordForm
**Plik**: `src/components/auth/ResetPasswordForm.tsx`

**Odpowiedzialności**:
- Renderowanie formularza z polami: nowe hasło, potwierdź nowe hasło
- Walidacja siły hasła
- Sprawdzanie zgodności haseł
- Obsługa submitu formularza
- Wywołanie `supabase.auth.updateUser({ password: newPassword })`
- Przekierowanie na dashboard po sukcesie

**Stan komponentu**:
```typescript
interface ResetPasswordFormState {
  password: string;
  confirmPassword: string;
  isLoading: boolean;
  error: string | null;
}
```

**Walidacja (Zod schema)**:
```typescript
const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Hasło musi mieć co najmniej 8 znaków")
    .regex(/[A-Z]/, "Hasło musi zawierać co najmniej jedną wielką literę")
    .regex(/[a-z]/, "Hasło musi zawierać co najmniej jedną małą literę")
    .regex(/[0-9]/, "Hasło musi zawierać co najmniej jedną cyfrę"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Hasła muszą być identyczne",
  path: ["confirmPassword"]
});
```

**Komunikaty**:
- Komunikaty walidacji (jw.)
- "Hasło zostało zmienione. Przekierowujemy..." - sukces
- "Link do resetu hasła wygasł. Poproś o nowy" - invalid_token
- "Wystąpił błąd. Spróbuj ponownie" - błąd sieciowy

**Flow resetowania hasła**:
1. Użytkownik trafia na stronę z tokenem w URL
2. Supabase automatycznie obsługuje token i tworzy sesję
3. Użytkownik wypełnia formularz nowego hasła
4. Walidacja po stronie klienta
5. `supabase.auth.updateUser({ password: newPassword })`
6. Przekierowanie na dashboard: `window.location.href = "/?password_updated=true"`

---

#### 2.5. DeleteAccountSection
**Plik**: `src/components/auth/DeleteAccountSection.tsx`

**Odpowiedzialności**:
- Renderowanie sekcji z ostrzeżeniem o usunięciu konta
- Obsługa dialogu potwierdzenia (używając Shadcn/ui Dialog)
- Walidacja hasła przed usunięciem
- Wywołanie API endpoint do usunięcia konta
- Przekierowanie na stronę informacyjną po usunięciu

**Stan komponentu**:
```typescript
interface DeleteAccountSectionState {
  isDialogOpen: boolean;
  password: string;
  isLoading: boolean;
  error: string | null;
}
```

**Walidacja (Zod schema)**:
```typescript
const deleteAccountSchema = z.object({
  password: z.string().min(1, "Hasło jest wymagane do potwierdzenia"),
});
```

**Komunikaty**:
- **Ostrzeżenie** (przed otwarciem dialogu):
  - "Usunięcie konta jest nieodwracalne"
  - "Wszystkie Twoje dane, w tym zadania, zostaną trwale usunięte"
- **W dialogu**:
  - Nagłówek: "Czy na pewno chcesz usunąć konto?"
  - Tekst: "Ta operacja jest nieodwracalna. Wszystkie dane zostaną trwale usunięte."
  - Pole: "Wpisz hasło aby potwierdzić"
  - Przyciski: "Anuluj" i "Usuń konto" (czerwony, destruktywny)
- **Błędy**:
  - "Hasło jest wymagane do potwierdzenia" - walidacja
  - "Nieprawidłowe hasło" - błąd z API
  - "Wystąpił błąd. Spróbuj ponownie" - błąd sieciowy

**Flow usuwania konta**:
1. Użytkownik klika przycisk "Usuń konto" w sekcji
2. Otwiera się dialog z ostrzeżeniem
3. Użytkownik wpisuje hasło
4. Kliknięcie "Usuń konto"
5. Walidacja po stronie klienta
6. Wywołanie `fetch('/api/auth/delete-account', { method: 'DELETE', body: { password } })`
7. API weryfikuje hasło i usuwa użytkownika
8. Przekierowanie na `/account-deleted` (strona informacyjna)

**Props**:
```typescript
interface DeleteAccountSectionProps {
  token: string; // Access token dla API call
}
```

---

### 3. Komponenty pomocnicze

#### 3.1. AuthCard
**Plik**: `src/components/auth/AuthCard.tsx`

**Opis**: Wrapper UI dla wszystkich formularzy autentykacji. Zapewnia spójny wygląd.

**Props**:
```typescript
interface AuthCardProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}
```

**Funkcje**:
- Wycentrowanie formularza na stronie
- Stylizacja kontenera (Tailwind + Shadcn/ui)
- Nagłówek i opcjonalny opis

---

#### 3.2. AuthInput
**Plik**: `src/components/auth/AuthInput.tsx`

**Opis**: Komponent input z obsługą błędów walidacji.

**Props**:
```typescript
interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  id: string;
}
```

**Funkcje**:
- Label z powiązaniem przez htmlFor
- Wyświetlanie komunikatu błędu pod inputem
- Styl errorowy dla błędnych pól (czerwona ramka)
- Wykorzystanie Shadcn/ui input

---

#### 3.3. AuthButton
**Plik**: `src/components/auth/AuthButton.tsx`

**Opis**: Przycisk submit z obsługą stanu ładowania.

**Props**:
```typescript
interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  children: React.ReactNode;
}
```

**Funkcje**:
- Disabled podczas ładowania
- Wyświetlanie spinnera podczas ładowania
- Wykorzystanie Shadcn/ui button

---

### 4. Zmiany w istniejących komponentach i layoutach

#### 4.1. Layout.astro
**Plik**: `src/layouts/Layout.astro`

**Zmiany**:
- Dodanie opcjonalnego `showNavigation` prop (boolean)
- Warunkowe renderowanie nawigacji głównej z przyciskiem "Wyloguj" dla zalogowanych użytkowników

**Kod**:
```astro
---
interface Props {
  title?: string;
  showNavigation?: boolean; // Nowy prop
}

const { 
  title = "Chronos",
  showNavigation = false 
} = Astro.props;

// Jeśli showNavigation === true, pobierz dane sesji
let userName: string | undefined;
if (showNavigation) {
  const supabase = Astro.locals.supabase;
  const { data: { user } } = await supabase.auth.getUser();
  userName = user?.user_metadata?.name || user?.email?.split("@")[0];
}
---

<html>
  <head>...</head>
  <body>
    {showNavigation && (
      <nav class="border-b">
        <div class="container mx-auto px-4 py-3 flex justify-between items-center">
          <a href="/" class="text-xl font-bold">Chronos</a>
          <div class="flex gap-4 items-center">
            <span class="text-sm text-gray-600">
              {userName}
            </span>
            <a href="/tasks" class="text-sm hover:underline">
              Zadania
            </a>
            <a href="/settings" class="text-sm hover:underline">
              Ustawienia
            </a>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" class="text-sm hover:underline">
                Wyloguj
              </button>
            </form>
          </div>
        </div>
      </nav>
    )}
    <slot />
  </body>
</html>
```

**Użycie**:
```astro
<!-- Strona z nawigacją (zalogowany użytkownik) -->
<Layout title="Dashboard" showNavigation={true}>
  ...
</Layout>

<!-- Strona bez nawigacji (niezalogowany) -->
<Layout title="Logowanie">
  ...
</Layout>
```

---

#### 4.2. src/pages/index.astro
**Plik**: `src/pages/index.astro`

**Obecna logika**: Już sprawdza sesję i przekierowuje na `/login`

**Zmiany**:
- Dodanie `showNavigation={true}` w Layout
- Obsługa query params dla komunikatów (np. `?verified=true`, `?password_updated=true`)
- Przekazanie komunikatu do komponentu Dashboard

**Kod**:
```astro
---
import Layout from "../layouts/Layout.astro";
import { Dashboard } from "../components/dashboard/Dashboard";

const supabase = Astro.locals.supabase;
const {
  data: { session },
} = await supabase.auth.getSession();

if (!session) {
  return Astro.redirect("/login");
}

const token = session.access_token;
const {
  data: { user },
} = await supabase.auth.getUser();
const userName = user?.user_metadata?.name || user?.email?.split("@")[0];

// Obsługa komunikatów z query params
const verified = Astro.url.searchParams.get("verified");
const passwordUpdated = Astro.url.searchParams.get("password_updated");

let successMessage: string | undefined;
if (verified === "true") {
  successMessage = "E-mail został zweryfikowany. Witaj w Chronos!";
} else if (passwordUpdated === "true") {
  successMessage = "Hasło zostało pomyślnie zmienione.";
}

export const prerender = false;
---

<Layout title="Dashboard - Chronos" showNavigation={true}>
  {successMessage && (
    <div class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
      {successMessage}
    </div>
  )}
  <Dashboard client:load token={token} userName={userName} />
</Layout>
```

---

#### 4.3. src/pages/tasks.astro
**Plik**: `src/pages/tasks.astro`

**Zmiany**:
- Dodanie sprawdzenia sesji (podobnie jak index.astro)
- Dodanie `showNavigation={true}` w Layout

**Kod**:
```astro
---
import Layout from "../layouts/Layout.astro";
import { TaskList } from "../components/task-list/TaskList";

const supabase = Astro.locals.supabase;
const {
  data: { session },
} = await supabase.auth.getSession();

if (!session) {
  return Astro.redirect("/login");
}

const token = session.access_token;

export const prerender = false;
---

<Layout title="Zadania - Chronos" showNavigation={true}>
  <TaskList client:load token={token} />
</Layout>
```

---

### 5. Nawigacja i przekierowania

#### 5.1. Przekierowania dla niezalogowanych użytkowników

**Strony wymagające autoryzacji**:
- `/` (dashboard)
- `/tasks`
- `/dashboard-test` (strona testowa)

**Implementacja**: W części frontmatter każdej strony:
```typescript
const supabase = Astro.locals.supabase;
const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  return Astro.redirect("/login");
}
```

---

#### 5.2. Przekierowania dla zalogowanych użytkowników

**Strony, których zalogowani nie powinni widzieć**:
- `/login`
- `/register`
- `/forgot-password`

**Implementacja**: W części frontmatter każdej strony:
```typescript
const supabase = Astro.locals.supabase;
const { data: { session } } = await supabase.auth.getSession();

if (session) {
  return Astro.redirect("/");
}
```

---

### 6. Przypadki użycia i scenariusze

#### 6.1. Scenariusz: Pomyślna rejestracja (US-001)
1. Użytkownik wchodzi na `/register`
2. Wypełnia formularz: email, hasło, potwierdź hasło
3. Kliknięcie "Zarejestruj się"
4. Walidacja po stronie klienta (Zod)
5. Wywołanie `supabase.auth.signUp()`
6. Wyświetlenie komunikatu: "Na adres {email} wysłaliśmy link weryfikacyjny..."
7. Użytkownik sprawdza e-mail i klika w link
8. Przekierowanie na `/verify-email`
9. Supabase weryfikuje token i automatycznie tworzy sesję (loguje użytkownika)
10. Przekierowanie na `/?verified=true` (dashboard)
11. Wyświetlenie komunikatu powitalnego: "E-mail został zweryfikowany. Witaj w Chronos!"

---

#### 6.2. Scenariusz: Weryfikacja e-maila (US-002)
1. Użytkownik klika w link weryfikacyjny w e-mailu
2. Link kieruje na `/verify-email?token=...` (Supabase dodaje token w hash fragment)
3. Strona `/verify-email` sprawdza sesję
4. Jeśli weryfikacja OK → Supabase automatycznie tworzy sesję i przekierowanie na `/?verified=true`
5. Jeśli błąd → przekierowanie na `/login?error=verification_failed`

---

#### 6.3. Scenariusz: Logowanie (US-004)
1. Użytkownik wchodzi na `/login`
2. Wypełnia formularz: email, hasło
3. Kliknięcie "Zaloguj się"
4. Walidacja po stronie klienta
5. Wywołanie `supabase.auth.signInWithPassword()`
6. Przy sukcesie:
   - Supabase tworzy sesję
   - Przekierowanie na `/` (dashboard)
7. Przy błędzie:
   - "Nieprawidłowy e-mail lub hasło" - błędne dane
   - "Konto nie zostało zweryfikowane" - email_not_confirmed

---

#### 6.4. Scenariusz: Odzyskiwanie hasła (US-005)
1. Użytkownik wchodzi na `/forgot-password`
2. Wypełnia formularz: email
3. Kliknięcie "Wyślij link"
4. Wywołanie `supabase.auth.resetPasswordForEmail()`
5. Wyświetlenie komunikatu: "Jeśli konto istnieje, wysłaliśmy link..."
6. Użytkownik sprawdza e-mail i klika w link
7. Link kieruje na `/reset-password?token=...`
8. Strona `/reset-password` sprawdza token
9. Jeśli token OK → wyświetlenie formularza nowego hasła
10. Jeśli token wygasł → przekierowanie na `/login?error=invalid_token`

---

#### 6.5. Scenariusz: Resetowanie hasła
1. Użytkownik jest na `/reset-password` (po kliknięciu w link z e-maila)
2. Wypełnia formularz: nowe hasło, potwierdź hasło
3. Kliknięcie "Zmień hasło"
4. Walidacja po stronie klienta
5. Wywołanie `supabase.auth.updateUser({ password })`
6. Przy sukcesie:
   - Wyświetlenie komunikatu "Hasło zmienione"
   - Przekierowanie na `/?password_updated=true`
7. Przy błędzie:
   - Wyświetlenie komunikatu błędu

---

#### 6.6. Scenariusz: Wylogowanie (US-006)
1. Zalogowany użytkownik klika "Wyloguj" w nawigacji
2. Formularz POST na `/api/auth/logout`
3. Endpoint wywołuje `supabase.auth.signOut()`
4. Przekierowanie na `/login`

---

#### 6.7. Scenariusz: Usuwanie konta (US-015)
1. Zalogowany użytkownik klika "Ustawienia" w nawigacji
2. Przechodzi na stronę `/settings`
3. Widzi sekcję "Zarządzanie kontem" z ostrzeżeniem o nieodwracalności operacji
4. Klika przycisk "Usuń konto"
5. Otwiera się dialog z potwierdzeniem
6. Użytkownik wpisuje swoje hasło
7. Klika "Usuń konto" w dialogu
8. Walidacja po stronie klienta
9. Wywołanie `DELETE /api/auth/delete-account` z hasłem
10. Endpoint:
    - Weryfikuje hasło przez ponowne logowanie
    - Usuwa użytkownika przez `supabase.auth.admin.deleteUser()`
    - RLS automatycznie usuwa wszystkie powiązane dane (zadania)
    - Wylogowuje użytkownika
11. Przekierowanie na `/account-deleted`
12. Wyświetlenie strony z potwierdzeniem usunięcia

---

## Logika backendowa

### 1. Endpointy API

#### 1.1. Logout Endpoint
**Plik**: `src/pages/api/auth/logout.ts`

**Metoda**: POST

**Opis**: Endpoint do wylogowania użytkownika. Niszczy sesję Supabase.

**Implementacja**:
```typescript
import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ locals, redirect }) => {
  const supabase = locals.supabase;
  
  // Wylogowanie użytkownika
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error("Logout error:", error);
    // Mimo błędu, przekieruj na login
  }
  
  // Przekierowanie na stronę logowania
  return redirect("/login", 303);
};
```

**Response codes**:
- 303 See Other - przekierowanie na `/login`

---

#### 1.2. Delete Account Endpoint (US-015)
**Plik**: `src/pages/api/auth/delete-account.ts`

**Metoda**: DELETE

**Opis**: Endpoint do trwałego usunięcia konta użytkownika wraz ze wszystkimi danymi.

**Request Body**:
```typescript
{
  password: string; // Hasło użytkownika do potwierdzenia
}
```

**Implementacja**:
```typescript
import type { APIRoute } from "astro";
import { authenticateUser } from "../../../lib/utils/auth.utils";

export const prerender = false;

export const DELETE: APIRoute = async ({ request, locals }) => {
  const supabase = locals.supabase;

  // Autoryzacja
  const { user, errorResponse } = await authenticateUser(request, supabase);
  if (errorResponse) return errorResponse;

  try {
    // Pobierz hasło z body
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return new Response(
        JSON.stringify({ error: "Hasło jest wymagane" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Weryfikacja hasła przez ponowne logowanie
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: password,
    });

    if (signInError) {
      return new Response(
        JSON.stringify({ error: "Nieprawidłowe hasło" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Usunięcie użytkownika (RLS automatycznie usunie powiązane dane)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(
      user.id
    );

    if (deleteError) {
      console.error("Delete account error:", deleteError);
      return new Response(
        JSON.stringify({ error: "Nie udało się usunąć konta" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Wylogowanie
    await supabase.auth.signOut();

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Delete account error:", error);
    return new Response(
      JSON.stringify({ error: "Wystąpił błąd serwera" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

**Response codes**:
- 200 OK - konto zostało usunięte
- 400 Bad Request - brak hasła w request body
- 401 Unauthorized - nieprawidłowe hasło lub brak autoryzacji
- 500 Internal Server Error - błąd serwera

**Uwaga**: 
- Endpoint używa `supabase.auth.admin.deleteUser()` który wymaga service role key (nie anon key)
- RLS policies automatycznie usuną wszystkie powiązane dane użytkownika (zadania) dzięki `ON DELETE CASCADE`
- Alternatywnie można użyć `supabase.rpc('delete_user')` z custom funkcją PostgreSQL

**Uwaga 2**: Wszystkie inne operacje autentykacji (login, register, reset password) są obsługiwane bezpośrednio przez Supabase Auth SDK po stronie klienta. Nie wymagają dodatkowych endpointów API.

---

### 2. Middleware

#### 2.1. Obecna implementacja
**Plik**: `src/middleware/index.ts`

**Obecna funkcjonalność**:
- Udostępnienie `supabaseClient` przez `context.locals.supabase`

**Status**: Nie wymaga zmian. Obecna implementacja jest wystarczająca.

**Kod**:
```typescript
import { defineMiddleware } from "astro:middleware";
import { supabaseClient } from "../db/supabase.client";

export const onRequest = defineMiddleware((context, next) => {
  context.locals.supabase = supabaseClient;
  return next();
});
```

---

#### 2.2. Opcjonalne rozszerzenie (nie wymagane w MVP)

**Możliwe rozszerzenie**: Automatyczne przekierowanie na `/login` dla niezalogowanych użytkowników próbujących dostać się na chronione strony.

**Implementacja** (przykładowa, NIE implementować w MVP):
```typescript
import { defineMiddleware } from "astro:middleware";
import { supabaseClient } from "../db/supabase.client";

const protectedPaths = ["/", "/tasks", "/dashboard-test"];

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.supabase = supabaseClient;
  
  const pathname = context.url.pathname;
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  
  if (isProtectedPath) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      return context.redirect("/login");
    }
  }
  
  return next();
});
```

**Uwaga**: W MVP zachowujemy obecną implementację i sprawdzamy sesję w każdej chronionej stronie osobno. To daje większą kontrolę i przejrzystość.

---

### 3. Walidacja danych

#### 3.1. Schematy Zod dla autentykacji
**Plik**: `src/lib/utils/auth.validation.ts`

**Opis**: Centralne miejsce dla schematów walidacji używanych w formularzach autentykacji.

**Implementacja**:
```typescript
import { z } from "zod";

/**
 * Schema walidacji dla logowania
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "E-mail jest wymagany")
    .email("Nieprawidłowy format adresu e-mail"),
  password: z
    .string()
    .min(1, "Hasło jest wymagane"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Schema walidacji dla rejestracji
 */
export const registerSchema = z.object({
  email: z
    .string()
    .min(1, "E-mail jest wymagany")
    .email("Nieprawidłowy format adresu e-mail"),
  password: z
    .string()
    .min(8, "Hasło musi mieć co najmniej 8 znaków")
    .regex(/[A-Z]/, "Hasło musi zawierać co najmniej jedną wielką literę")
    .regex(/[a-z]/, "Hasło musi zawierać co najmniej jedną małą literę")
    .regex(/[0-9]/, "Hasło musi zawierać co najmniej jedną cyfrę"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Hasła muszą być identyczne",
  path: ["confirmPassword"],
});

export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Schema walidacji dla odzyskiwania hasła
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "E-mail jest wymagany")
    .email("Nieprawidłowy format adresu e-mail"),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/**
 * Schema walidacji dla resetowania hasła
 */
export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Hasło musi mieć co najmniej 8 znaków")
    .regex(/[A-Z]/, "Hasło musi zawierać co najmniej jedną wielką literę")
    .regex(/[a-z]/, "Hasło musi zawierać co najmniej jedną małą literę")
    .regex(/[0-9]/, "Hasło musi zawierać co najmniej jedną cyfrę"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Hasła muszą być identyczne",
  path: ["confirmPassword"],
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

/**
 * Schema walidacji dla usuwania konta (US-015)
 */
export const deleteAccountSchema = z.object({
  password: z
    .string()
    .min(1, "Hasło jest wymagane do potwierdzenia"),
});

export type DeleteAccountFormData = z.infer<typeof deleteAccountSchema>;
```

---

### 4. Obsługa błędów

#### 4.1. Mapowanie błędów Supabase Auth
**Plik**: `src/lib/utils/auth-errors.utils.ts`

**Opis**: Helper do konwersji błędów Supabase Auth na przyjazne komunikaty po polsku.

**Implementacja**:
```typescript
import type { AuthError } from "@supabase/supabase-js";

/**
 * Mapuje błędy Supabase Auth na przyjazne komunikaty w języku polskim
 */
export function getAuthErrorMessage(error: AuthError | null): string {
  if (!error) {
    return "Wystąpił nieznany błąd";
  }

  const errorCode = error.message || error.status?.toString();

  // Błędy logowania
  if (errorCode?.includes("Invalid login credentials")) {
    return "Nieprawidłowy e-mail lub hasło";
  }
  
  if (errorCode?.includes("Email not confirmed")) {
    return "Konto nie zostało jeszcze zweryfikowane. Sprawdź swoją skrzynkę e-mail";
  }

  // Błędy rejestracji
  if (errorCode?.includes("User already registered")) {
    return "Ten adres e-mail jest już zarejestrowany";
  }

  if (errorCode?.includes("Password should be at least")) {
    return "Hasło jest za słabe. Użyj co najmniej 8 znaków";
  }

  // Błędy resetu hasła
  if (errorCode?.includes("Invalid token")) {
    return "Link do resetu hasła wygasł lub jest nieprawidłowy. Poproś o nowy";
  }

  if (errorCode?.includes("Token expired")) {
    return "Link weryfikacyjny wygasł. Poproś o nowy";
  }

  // Błędy rate limiting
  if (errorCode?.includes("Email rate limit exceeded")) {
    return "Zbyt wiele prób. Spróbuj ponownie za kilka minut";
  }

  // Błędy sieciowe
  if (errorCode?.includes("Failed to fetch") || errorCode?.includes("Network")) {
    return "Problem z połączeniem. Sprawdź internet i spróbuj ponownie";
  }

  // Domyślny komunikat
  return "Wystąpił błąd. Spróbuj ponownie";
}
```

---

### 5. Typy TypeScript

#### 5.1. Rozszerzenie istniejących typów
**Plik**: `src/types.ts`

**Zmiany**: Dodanie typów związanych z autentykacją (opcjonalne, Supabase dostarcza własne typy).

**Kod**:
```typescript
// Import typów z Supabase
import type { User, Session } from "@supabase/supabase-js";

// Re-export dla wygody
export type { User, Session };
```

**Uwaga**: Typy `User` i `Session` są już dostarczone przez Supabase JS SDK. Nie ma potrzeby definiować własnych.

---

#### 5.2. Rozszerzenie Astro.locals
**Plik**: `src/env.d.ts`

**Opis**: Definicja typów dla `Astro.locals.supabase`.

**Kod** (sprawdzić, czy już istnieje):
```typescript
/// <reference types="astro/client" />

import type { SupabaseClient } from "./db/supabase.client";

declare namespace App {
  interface Locals {
    supabase: SupabaseClient;
  }
}
```

---

## System autentykacji

### 1. Supabase Auth - Konfiguracja

#### 1.1. Zmienne środowiskowe
**Plik**: `.env` (lokalnie) lub konfiguracja środowiska produkcyjnego

**Wymagane zmienne**:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

**Status**: Już skonfigurowane (obecny kod używa `import.meta.env.SUPABASE_URL` i `SUPABASE_KEY`).

---

#### 1.2. Konfiguracja Supabase Auth w dashboardzie Supabase

**URL Configuration**:
- **Site URL**: `https://your-domain.com` (produkcja) lub `http://localhost:3000` (dev)
- **Redirect URLs**: 
  - `https://your-domain.com/verify-email`
  - `https://your-domain.com/reset-password`
  - `http://localhost:3000/verify-email`
  - `http://localhost:3000/reset-password`

**Email Templates**:

1. **Confirm signup** (weryfikacja e-maila):
   ```html
   <h2>Potwierdź swój adres e-mail</h2>
   <p>Dziękujemy za rejestrację w Chronos!</p>
   <p>Kliknij w poniższy link, aby zweryfikować swój adres e-mail:</p>
   <p><a href="{{ .ConfirmationURL }}">Zweryfikuj e-mail</a></p>
   <p>Jeśli nie rejestrowałeś się w Chronos, zignoruj tę wiadomość.</p>
   ```

2. **Reset password**:
   ```html
   <h2>Zresetuj hasło</h2>
   <p>Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta w Chronos.</p>
   <p>Kliknij w poniższy link, aby ustawić nowe hasło:</p>
   <p><a href="{{ .ConfirmationURL }}">Ustaw nowe hasło</a></p>
   <p>Link jest ważny przez 1 godzinę.</p>
   <p>Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.</p>
   ```

**Auth Settings**:
- **Enable Email Confirmations**: Włączone (wymagana weryfikacja e-maila)
- **Secure Email Change**: Włączone (wymaga potwierdzenia obu adresów przy zmianie)
- **Enable Phone Confirmations**: Wyłączone (nie używamy w MVP)
- **Minimum Password Length**: 8 znaków

---

### 2. Flow autentykacji

#### 2.1. Rejestracja i weryfikacja e-mail

```
┌─────────────┐
│   Użytkownik│
│  wypełnia   │
│  formularz  │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ RegisterForm     │
│ .signUp()        │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Supabase Auth    │
│ - Tworzy konto   │
│ - Wysyła e-mail  │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Komunikat:       │
│ "Sprawdź e-mail" │
└──────────────────┘
       │
       ▼ (użytkownik klika link)
┌──────────────────┐
│ /verify-email    │
│ - Sprawdza token │
│ - Auto logowanie │
└──────┬───────────┘
       │
       ├─ Sukces ─────▶ Redirect: /?verified=true (dashboard)
       │
       └─ Błąd ───────▶ Redirect: /login?error=verification_failed
```

---

#### 2.2. Logowanie

```
┌─────────────┐
│  Użytkownik │
│  podaje     │
│  dane       │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ LoginForm        │
│ .signInWith      │
│  Password()      │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Supabase Auth    │
│ - Sprawdza dane  │
│ - Tworzy sesję   │
└──────┬───────────┘
       │
       ├─ Sukces ─────▶ Redirect: / (dashboard)
       │
       └─ Błąd ───────▶ Pokazuje komunikat błędu
```

---

#### 2.3. Odzyskiwanie hasła

```
┌─────────────┐
│  Użytkownik │
│  podaje     │
│  e-mail     │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ ForgotPassword   │
│ Form             │
│ .resetPassword   │
│  ForEmail()      │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Supabase Auth    │
│ - Generuje token │
│ - Wysyła e-mail  │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Komunikat:       │
│ "Sprawdź e-mail" │
└──────────────────┘
       │
       ▼ (użytkownik klika link)
┌──────────────────┐
│ /reset-password  │
│ Sprawdza token   │
└──────┬───────────┘
       │
       ├─ Token OK ────▶ Pokazuje formularz
       │                 
       │                 ↓ (użytkownik ustawia hasło)
       │                 
       │                 ResetPasswordForm
       │                 .updateUser()
       │                 
       │                 ↓
       │                 
       │                 Redirect: /?password_updated=true
       │
       └─ Token wygasł ─▶ Redirect: /login?error=invalid_token
```

---

#### 2.4. Wylogowanie

```
┌─────────────┐
│  Użytkownik │
│  klika      │
│  "Wyloguj"  │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ POST             │
│ /api/auth/logout │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Supabase Auth    │
│ .signOut()       │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Redirect:        │
│ /login           │
└──────────────────┘
```

---

#### 2.5. Usuwanie konta (US-015)

```
┌─────────────┐
│  Użytkownik │
│  w          │
│  ustawieniach│
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ Klika            │
│ "Usuń konto"     │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Dialog           │
│ - Ostrzeżenie    │
│ - Pole: hasło    │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ DELETE           │
│ /api/auth/       │
│ delete-account   │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ API Endpoint:    │
│ - Weryfikuje     │
│   hasło          │
│ - Usuwa          │
│   użytkownika    │
│ - RLS usuwa dane │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Redirect:        │
│ /account-deleted │
└──────────────────┘
```

---

### 3. Zarządzanie sesjami

#### 3.1. Przechowywanie sesji
- **Mechanizm**: Supabase Auth automatycznie zarządza sesjami używając cookies i localStorage
- **Cookie name**: `sb-<project-ref>-auth-token`
- **Czas życia**: Domyślnie 1 godzina (access token) + 30 dni (refresh token)
- **Odświeżanie**: Supabase SDK automatycznie odświeża token przed wygaśnięciem

#### 3.2. Sprawdzanie sesji
W każdej chronionej stronie Astro:
```typescript
const supabase = Astro.locals.supabase;
const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  return Astro.redirect("/login");
}
```

#### 3.3. Pobieranie aktualnego użytkownika
```typescript
const { data: { user } } = await supabase.auth.getUser();
```

---

### 4. Zabezpieczenie API endpoints

#### 4.1. Obecna implementacja
**Plik**: `src/lib/utils/auth.utils.ts`

**Funkcja**: `authenticateUser(request, supabase)`

**Opis**: Helper do sprawdzania autoryzacji w API endpoints. Sprawdza nagłówek `Authorization: Bearer <token>`.

**Status**: Już zaimplementowane. Wykorzystywane we wszystkich API endpoints dla zadań.

**Przykład użycia** (nie wymaga zmian):
```typescript
// src/pages/api/tasks.ts
export const GET: APIRoute = async ({ request, locals }) => {
  const supabase = locals.supabase;
  
  // Autoryzacja
  const { user, errorResponse } = await authenticateUser(request, supabase);
  if (errorResponse) return errorResponse;
  
  // ... logika endpointu
};
```

---

## Bezpieczeństwo

### 1. Ochrona przed atakami

#### 1.1. Cross-Site Scripting (XSS)
**Mechanizmy ochrony**:
- React automatycznie escapuje zawartość renderowaną w JSX
- Brak użycia `dangerouslySetInnerHTML`
- Walidacja i sanitizacja danych wejściowych (Zod)

#### 1.2. Cross-Site Request Forgery (CSRF)
**Mechanizmy ochrony**:
- Supabase Auth używa SameSite cookies
- Endpointy API wymagają Bearer token (nie opierają się tylko na cookies)

#### 1.3. SQL Injection
**Mechanizmy ochrony**:
- Supabase SDK używa parametryzowanych zapytań
- Row Level Security (RLS) w bazie danych
- Walidacja danych wejściowych (Zod)

#### 1.4. Brute Force
**Mechanizmy ochrony**:
- Supabase Auth ma wbudowany rate limiting
- Automatyczne blokowanie po wielokrotnych nieudanych próbach logowania
- Konfiguracja w Supabase Dashboard

---

### 2. Bezpieczne praktyki

#### 2.1. Hasła
- **Minimalna długość**: 8 znaków
- **Wymagania**: Duża litera, mała litera, cyfra
- **Haszowanie**: Supabase Auth używa bcrypt
- **Nigdy nie przechowuj**: Hasła w plain text, hasła w localStorage

#### 2.2. Tokeny
- **Access token**: Krótki czas życia (1h)
- **Refresh token**: Dłuższy czas życia (30 dni)
- **Przechowywanie**: HttpOnly cookies (zarządzane przez Supabase)
- **Przekazywanie**: Bearer token w nagłówku Authorization dla API

#### 2.3. E-maile weryfikacyjne i resetu hasła
- **Ważność linków**: 1 godzina (konfiguracja Supabase)
- **Jednorazowe użycie**: Token staje się nieważny po użyciu
- **Bezpieczne URL**: Tokeny w hash fragment (#), nie w query params

---

### 3. Row Level Security (RLS)

**Status**: Już skonfigurowane w migracji bazy danych.

**Polityki dla tabeli `tasks`**:
- `tasks_select_own`: Użytkownik widzi tylko swoje zadania
- `tasks_insert_own`: Użytkownik może tworzyć zadania tylko dla siebie
- `tasks_update_own`: Użytkownik może edytować tylko swoje zadania
- `tasks_delete_own`: Użytkownik może usuwać tylko swoje zadania

**Mechanizm**: Wszystkie polityki sprawdzają `auth.uid() = user_id`

---

## Walidacja i komunikaty błędów

### 1. Walidacja po stronie klienta

#### 1.1. Formularze
**Biblioteka**: Zod

**Strategia**:
- Walidacja przy submicie formularza
- Wyświetlanie błędów pod konkretnymi polami
- Blokowanie submitu przy błędach walidacji
- Real-time walidacja opcjonalna (dla lepszego UX, nie w MVP)

#### 1.2. Przykład walidacji

```typescript
// W komponencie React
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  
  // Walidacja
  const result = loginSchema.safeParse({ email, password });
  
  if (!result.success) {
    // Wyciągnięcie pierwszego błędu
    const firstError = result.error.errors[0];
    setError(firstError.message);
    return;
  }
  
  // Kontynuuj z logowaniem...
};
```

---

### 2. Komunikaty błędów

#### 2.1. Zasady pisania komunikatów
- **Język**: Polski
- **Ton**: Przyjazny, pomocny
- **Jasność**: Konkretnie, co jest nie tak
- **Akcja**: Co użytkownik powinien zrobić
- **Bez żargonu**: Unikaj technicznych terminów

#### 2.2. Katalog komunikatów

**Błędy walidacji**:
```
"E-mail jest wymagany"
"Nieprawidłowy format adresu e-mail"
"Hasło jest wymagane"
"Hasło musi mieć co najmniej 8 znaków"
"Hasło musi zawierać co najmniej jedną wielką literę"
"Hasło musi zawierać co najmniej jedną małą literę"
"Hasło musi zawierać co najmniej jedną cyfrę"
"Hasła muszą być identyczne"
```

**Błędy logowania**:
```
"Nieprawidłowy e-mail lub hasło"
"Konto nie zostało jeszcze zweryfikowane. Sprawdź swoją skrzynkę e-mail"
```

**Błędy rejestracji**:
```
"Ten adres e-mail jest już zarejestrowany"
```

**Błędy resetu hasła**:
```
"Link do resetu hasła wygasł lub jest nieprawidłowy. Poproś o nowy"
"Link weryfikacyjny wygasł. Poproś o nowy"
```

**Błędy sieciowe**:
```
"Problem z połączeniem. Sprawdź internet i spróbuj ponownie"
"Wystąpił błąd. Spróbuj ponownie"
```

**Komunikaty sukcesu**:
```
"Na adres {email} wysłaliśmy link weryfikacyjny. Sprawdź swoją skrzynkę pocztową"
"E-mail został zweryfikowany. Witaj w Chronos!"
"Jeśli konto z tym adresem e-mail istnieje, wysłaliśmy na nie link do zresetowania hasła"
"Hasło zostało pomyślnie zmienione"
"Twoje konto zostało usunięte"
```

---

### 3. Wyświetlanie komunikatów

#### 3.1. Komunikaty inline (przy polach formularza)
**Komponent**: `AuthInput`

**Renderowanie**:
```tsx
{error && (
  <p className="text-sm text-red-600 mt-1" role="alert">
    {error}
  </p>
)}
```

#### 3.2. Komunikaty globalne (na górze formularza)
**Renderowanie**:
```tsx
{error && (
  <div 
    className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4" 
    role="alert"
  >
    {error}
  </div>
)}

{success && (
  <div 
    className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4" 
    role="alert"
  >
    {success}
  </div>
)}
```

#### 3.3. Komunikaty na poziomie strony (query params)
**Implementacja w Astro**:
```astro
---
const verified = Astro.url.searchParams.get("verified");
const error = Astro.url.searchParams.get("error");

let message: string | undefined;
let messageType: "success" | "error" | undefined;

if (verified === "true") {
  message = "E-mail został zweryfikowany. Witaj w Chronos!";
  messageType = "success";
} else if (error) {
  message = getErrorMessageFromParam(error);
  messageType = "error";
}
---

{message && (
  <div class={`px-4 py-3 rounded mb-4 ${
    messageType === "success" 
      ? "bg-green-50 border border-green-200 text-green-800"
      : "bg-red-50 border border-red-200 text-red-800"
  }`}>
    {message}
  </div>
)}
```

---

## Podsumowanie zmian w strukturze projektu

### Nowe pliki do utworzenia

**Strony Astro** (`src/pages/`):
- `login.astro`
- `register.astro`
- `verify-email.astro`
- `forgot-password.astro`
- `reset-password.astro`
- `settings.astro` (US-015)
- `account-deleted.astro` (US-015)

**API Endpoints** (`src/pages/api/auth/`):
- `logout.ts`
- `delete-account.ts` (US-015)

**Komponenty React** (`src/components/auth/`):
- `LoginForm.tsx`
- `RegisterForm.tsx`
- `ForgotPasswordForm.tsx`
- `ResetPasswordForm.tsx`
- `DeleteAccountSection.tsx` (US-015)
- `AuthCard.tsx`
- `AuthInput.tsx`
- `AuthButton.tsx`

**Helpers** (`src/lib/utils/`):
- `auth.validation.ts` (schematy Zod)
- `auth-errors.utils.ts` (mapowanie błędów)

### Pliki do modyfikacji

**Layouts**:
- `src/layouts/Layout.astro` - dodanie nawigacji dla zalogowanych użytkowników

**Strony**:
- `src/pages/index.astro` - dodanie `showNavigation={true}` i obsługa komunikatów
- `src/pages/tasks.astro` - dodanie sprawdzenia sesji i `showNavigation={true}`
- `src/pages/dashboard-test.astro` - dodanie sprawdzenia sesji

**Typy**:
- `src/env.d.ts` - sprawdzenie typów dla `Astro.locals.supabase`

### Pliki bez zmian

**Middleware**:
- `src/middleware/index.ts` - obecna implementacja jest wystarczająca

**Auth utils**:
- `src/lib/utils/auth.utils.ts` - obecny helper `authenticateUser()` jest wystarczający

**Baza danych**:
- Migracje - RLS policies już skonfigurowane
- **Wymagane**: Sprawdzenie czy foreign key `tasks.user_id` ma `ON DELETE CASCADE` (dla US-015)
- Database types - nie wymagają zmian

**Uwaga do bazy danych**: 
Dla prawidłowego działania US-015 (usuwanie konta), klucz obcy `tasks.user_id` musi mieć konfigurację `ON DELETE CASCADE`, aby automatycznie usuwać wszystkie zadania użytkownika gdy jego konto jest usuwane. Sprawdź istniejącą migrację i jeśli to konieczne, dodaj alternatywne rozwiązanie (np. custom PostgreSQL function `delete_user()`)

**API endpoints**:
- Wszystkie istniejące endpointy (`/api/tasks/*`) - bez zmian, już używają `authenticateUser()`

---

## Następne kroki po implementacji

### 1. Testowanie
- **Manualne testy** wszystkich scenariuszy (US-001 do US-006)
- **Testy jednostkowe** dla komponentów React (opcjonalnie)
- **Testy e2e** dla krytycznych ścieżek (opcjonalnie)

### 2. Konfiguracja Supabase Dashboard
- Ustawienie Site URL i Redirect URLs
- Dostosowanie szablonów e-mail
- Konfiguracja polityk haseł
- Włączenie rate limiting

### 3. Dokumentacja
- Aktualizacja README z instrukcjami logowania (dla deweloperów)
- Dokumentacja zmiennych środowiskowych
- Instrukcje konfiguracji Supabase dla nowego środowiska

### 4. Onboarding (kolejna faza, po autentykacji)
- Implementacja US-003 (onboarding dla nowych użytkowników)
- Strona z sugerowanymi zadaniami
- Import zadań z szablonów

---

## Zgodność z wymaganiami PRD

### US-001: Rejestracja nowego konta ✅
- ✅ Formularz rejestracji z polami: email, hasło, potwierdź hasło
- ✅ Walidacja formatu e-mail
- ✅ Sprawdzanie identyczności haseł
- ✅ Sprawdzanie, czy e-mail nie jest już zarejestrowany
- ✅ Wysyłanie e-maila weryfikacyjnego
- ✅ Komunikat o konieczności weryfikacji

### US-002: Weryfikacja adresu e-mail ✅
- ✅ E-mail weryfikacyjny z unikalnym linkiem
- ✅ Aktywacja konta po kliknięciu
- ✅ Automatyczne logowanie po weryfikacji (zgodnie z Supabase Auth)
- ✅ Przekierowanie na dashboard z komunikatem powitalnym
- ✅ Obsługa błędów weryfikacji

**Uwaga**: Implementacja wykorzystuje domyślne zachowanie Supabase Auth, które automatycznie loguje użytkownika po weryfikacji email. Jest to zgodne z best practices i zapewnia lepsze doświadczenie użytkownika.

### US-003: Onboarding po pierwszym logowaniu
- ⏳ Do implementacji w kolejnej fazie (poza zakresem modułu autentykacji)

### US-004: Logowanie do aplikacji ✅
- ✅ Formularz logowania z polami: email, hasło
- ✅ Walidacja danych
- ✅ Komunikat "Nieprawidłowy e-mail lub hasło"
- ✅ Blokada logowania na niezweryfikowane konto
- ✅ Przekierowanie na dashboard po sukcesie

### US-005: Odzyskiwanie zapomnianego hasła ✅
- ✅ Link "Zapomniałem hasła" na stronie logowania
- ✅ Formularz z polem e-mail
- ✅ Wysyłanie e-maila z linkiem
- ✅ Link ważny przez określony czas (1h)
- ✅ Formularz zmiany hasła

### US-006: Wylogowywanie ✅
- ✅ Przycisk "Wyloguj" w interfejsie
- ✅ Zakończenie sesji
- ✅ Przekierowanie na stronę logowania

### US-015: Usuwanie własnego konta ✅
- ✅ Opcja "Usuń konto" w ustawieniach
- ✅ Potwierdzenie przez wpisanie hasła
- ✅ Wyraźne ostrzeżenie o nieodwracalności operacji
- ✅ Trwałe usunięcie wszystkich danych użytkownika

---

## Koniec specyfikacji

Specyfikacja opisuje kompletną architekturę modułu autentykacji zgodną z wymaganiami PRD (US-001, US-002, US-004, US-005, US-006, US-015) i tech stackiem projektu. Moduł w pełni wykorzystuje możliwości Supabase Auth i integruje się z istniejącą architekturą aplikacji bez naruszania obecnej funkcjonalności.

**Uwagi**:
- US-003 (Onboarding po pierwszym logowaniu) jest zaznaczone jako poza zakresem modułu autentykacji i zostanie zaimplementowane w kolejnej fazie jako osobny moduł.
- **US-002**: Implementacja wykorzystuje automatyczne logowanie po weryfikacji email (domyślne zachowanie Supabase Auth), co jest zgodne z best practices i zapewnia lepsze UX.

