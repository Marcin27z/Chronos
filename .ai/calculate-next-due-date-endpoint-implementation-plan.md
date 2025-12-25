# API Endpoint Implementation Plan: Calculate Next Due Date

## 1. Przegląd punktu końcowego

**Endpoint:** `POST /api/tasks/calculate-next-due-date`

**Cel:** Endpoint użytkowy (utility) do obliczania następnej daty wykonania zadania na podstawie interwału i preferowanego dnia tygodnia. Ten endpoint nie modyfikuje żadnych danych - służy wyłącznie do obliczeń, które są wykorzystywane w interfejsie użytkownika do podglądu w czasie rzeczywistym (real-time preview) podczas tworzenia lub edycji zadań.

**Charakterystyka:**
- Read-only (brak modyfikacji danych)
- Wymaga uwierzytelnienia użytkownika
- Wykorzystuje ten sam algorytm obliczeniowy co tworzenie i wykonywanie zadań
- Przydatny dla komponentów UI wymagających dynamicznego podglądu dat

---

## 2. Szczegóły żądania

### Metoda HTTP
`POST`

### Struktura URL
```
/api/tasks/calculate-next-due-date
```

### Nagłówki żądania
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

### Request Body

**Struktura JSON:**
```json
{
  "interval_value": 6,
  "interval_unit": "months",
  "preferred_day_of_week": 6
}
```

### Parametry

**Wymagane:**
- `interval_value` (number): Wartość interwału, liczba całkowita od 1 do 999
- `interval_unit` (string): Jednostka interwału, dopuszczalne wartości: "days", "weeks", "months", "years"

**Opcjonalne:**
- `preferred_day_of_week` (number | null): Preferowany dzień tygodnia (0=Niedziela, 6=Sobota), wartość null oznacza brak preferencji

---

## 3. Wykorzystywane typy

### 3.1. Command Model (Request DTO)

**Nowy typ w `src/types.ts`:**

```typescript
/**
 * Command to calculate next due date
 * Used for utility endpoint that provides date preview
 */
export interface CalculateNextDueDateCommand {
  /**
   * Interval value (1-999)
   */
  interval_value: number;
  
  /**
   * Interval unit: days, weeks, months, or years
   */
  interval_unit: IntervalUnit;
  
  /**
   * Preferred day of week (0=Sunday, 6=Saturday), null=no preference
   */
  preferred_day_of_week: number | null;
}
```

### 3.2. Response DTO

**Nowy typ w `src/types.ts`:**

```typescript
/**
 * Response with calculated next due date
 */
export interface NextDueDateResponseDTO {
  /**
   * Calculated next due date in ISO format (YYYY-MM-DD)
   */
  next_due_date: string;
}
```

### 3.3. Istniejące typy wykorzystywane

- `IntervalUnit` - już zdefiniowany enum w `src/types.ts`
- `ValidationErrorDTO` - dla odpowiedzi błędów walidacji
- `ErrorDTO` - dla odpowiedzi błędów ogólnych

---

## 4. Szczegóły odpowiedzi

### Success Response (200 OK)

**Format:**
```json
{
  "next_due_date": "2026-06-27"
}
```

**Typ:** `NextDueDateResponseDTO`

**Headers:**
```
Content-Type: application/json
```

### Error Responses

#### 400 Bad Request - Invalid Content-Type
```json
{
  "error": "Invalid Content-Type",
  "details": "Content-Type must be application/json"
}
```

#### 400 Bad Request - Invalid JSON
```json
{
  "error": "Invalid JSON",
  "details": "Request body must be valid JSON"
}
```

#### 400 Bad Request - Validation Errors
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "interval_value",
      "message": "Interval value must be between 1 and 999"
    },
    {
      "field": "interval_unit",
      "message": "Interval unit must be one of: days, weeks, months, years"
    },
    {
      "field": "preferred_day_of_week",
      "message": "Preferred day of week must be between 0 and 6 or null"
    }
  ]
}
```

#### 401 Unauthorized - Missing Authorization Header
```json
{
  "error": "Authorization header is missing"
}
```

#### 401 Unauthorized - Invalid Token
```json
{
  "error": "Invalid or expired token"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "details": "An unexpected error occurred while calculating next due date"
}
```

---

## 5. Przepływ danych

### Diagram przepływu

```
1. Client Request
   ↓
2. Content-Type Validation
   ↓
3. Authentication (Bearer Token)
   ↓
4. Request Body Parsing (JSON)
   ↓
5. Input Validation (Zod Schema)
   ↓
6. TaskService.calculateNextDueDate()
   │
   ├─ Start with current UTC date
   ├─ Add interval based on unit
   ├─ Adjust to preferred day of week (if specified)
   └─ Format as ISO date (YYYY-MM-DD)
   ↓
7. Success Response (200 OK)
```

### Szczegóły przepływu

**Krok 1: Walidacja Content-Type**
- Sprawdzenie nagłówka `Content-Type: application/json`
- Zwrócenie 400 Bad Request jeśli nieprawidłowy

**Krok 2: Uwierzytelnienie użytkownika**
- Użycie helper function `authenticateUser(request, supabase)`
- Ekstrahowanie i walidacja Bearer token
- Zwrócenie 401 Unauthorized jeśli niepowodzenie

**Krok 3: Parsowanie request body**
- Parsowanie JSON z request body
- Zwrócenie 400 Bad Request jeśli nieprawidłowy JSON

**Krok 4: Walidacja danych wejściowych**
- Walidacja przez Zod schema
- Transformacja błędów Zod do `ValidationErrorDTO`
- Zwrócenie 400 Bad Request z detalami błędów

**Krok 5: Obliczenie daty**
- Wywołanie `TaskService.calculateNextDueDate()` z walidowanymi parametrami
- Metoda obecnie jest private, należy ją uczynić publiczną lub stworzyć public wrapper

**Krok 6: Zwrócenie odpowiedzi**
- Zwrócenie 200 OK z obiektem `NextDueDateResponseDTO`

### Interakcje z zewnętrznymi systemami

**Supabase:**
- Wykorzystywany **tylko** do uwierzytelnienia użytkownika
- Brak operacji bazodanowych (read/write)
- Dostęp przez `context.locals.supabase`

**TaskService:**
- Wykorzystanie istniejącej logiki obliczeniowej
- Metoda `calculateNextDueDate()` wymaga modyfikacji widoczności (private → public)

---

## 6. Względy bezpieczeństwa

### 6.1. Uwierzytelnienie

**Mechanizm:**
- Bearer token w nagłówku `Authorization`
- Walidacja przez `authenticateUser()` helper
- Weryfikacja tokenu z Supabase Auth

**Implementacja:**
```typescript
const { user, errorResponse: authErrorResponse } = await authenticateUser(request, supabase);

if (authErrorResponse) {
  return authErrorResponse;
}
```

### 6.2. Autoryzacja

**Nie dotyczy** - endpoint nie operuje na zasobach należących do użytkownika. Jest to endpoint użytkowy (utility) wykonujący tylko obliczenia matematyczne.

### 6.3. Walidacja danych wejściowych

**Zod Schema:**
```typescript
const CalculateNextDueDateSchema = z.object({
  interval_value: z
    .number({ required_error: "Interval value is required" })
    .int("Interval value must be an integer")
    .min(1, "Interval value must be at least 1")
    .max(999, "Interval value must not exceed 999"),

  interval_unit: z.enum(["days", "weeks", "months", "years"], {
    required_error: "Interval unit is required",
    invalid_type_error: "Interval unit must be one of: days, weeks, months, years",
  }),

  preferred_day_of_week: z
    .number()
    .int("Preferred day of week must be an integer")
    .min(0, "Preferred day of week must be between 0 and 6")
    .max(6, "Preferred day of week must be between 0 and 6")
    .nullable()
    .optional(),
});
```

**Walidowane aspekty:**
- Typy danych (number, string enum)
- Zakresy wartości (1-999, 0-6)
- Wymagalność pól (required vs optional)
- Format enum dla interval_unit

### 6.4. Rate Limiting

**Uwaga:** Endpoint może być wywoływany często podczas edycji formularzy (real-time preview). Warto rozważyć:
- Implementację rate limiting na poziomie middleware
- Throttling/debouncing po stronie klienta
- Monitoring wykorzystania zasobów

### 6.5. Bezpieczeństwo danych

**Brak wrażliwych danych:**
- Endpoint nie zwraca informacji o użytkowniku
- Nie ujawnia struktury bazy danych
- Zwraca tylko wyliczoną datę

**Error Handling:**
- Ukrywanie szczegółów błędów serwera przed klientem
- Logowanie szczegółowych błędów tylko server-side
- Używanie generycznych komunikatów błędów dla 500

---

## 7. Obsługa błędów

### 7.1. Błędy walidacji (400 Bad Request)

**Scenariusze:**

| Warunek | Komunikat błędu |
|---------|----------------|
| Brak Content-Type lub nieprawidłowy | "Invalid Content-Type" |
| Nieprawidłowy JSON | "Invalid JSON" |
| interval_value < 1 lub > 999 | "Interval value must be between 1 and 999" |
| interval_value nie jest liczbą całkowitą | "Interval value must be an integer" |
| interval_unit nie jest jednym z dozwolonych | "Interval unit must be one of: days, weeks, months, years" |
| preferred_day_of_week < 0 lub > 6 | "Preferred day of week must be between 0 and 6" |
| preferred_day_of_week nie jest liczbą całkowitą | "Preferred day of week must be an integer" |

**Implementacja:**
```typescript
if (!validationResult.success) {
  const validationErrors: ValidationErrorDTO = {
    error: "Validation failed",
    details: validationResult.error.errors.map((err) => ({
      field: err.path.join(".") || "unknown",
      message: err.message,
    })),
  };

  return new Response(JSON.stringify(validationErrors), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}
```

### 7.2. Błędy uwierzytelnienia (401 Unauthorized)

**Scenariusze:**

| Warunek | Komunikat błędu |
|---------|----------------|
| Brak nagłówka Authorization | "Authorization header is missing" |
| Nieprawidłowy format tokenu | "Authorization header must use Bearer token format" |
| Token wygasły lub nieprawidłowy | "Invalid or expired token" |

**Implementacja:**
Obsługiwane przez helper `authenticateUser()` - zwraca gotową Response lub null.

### 7.3. Błędy serwera (500 Internal Server Error)

**Scenariusze:**

| Warunek | Komunikat błędu | Działanie |
|---------|----------------|-----------|
| Brak klienta Supabase | "Database client not available" | Zwrócenie 500 |
| Nieoczekiwany błąd podczas obliczeń | "An unexpected error occurred while calculating next due date" | Logowanie błędu + zwrócenie 500 |

**Implementacja:**
```typescript
try {
  // ... endpoint logic
} catch (error) {
  console.error("Error calculating next due date:", error);

  return new Response(
    JSON.stringify({
      error: "Internal server error",
      details: "An unexpected error occurred while calculating next due date",
    } satisfies ErrorDTO),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    }
  );
}
```

### 7.4. Logowanie błędów

**Strategia:**
- `console.error()` dla błędów serwera (500)
- Brak logowania dla błędów walidacji i uwierzytelnienia (4xx)
- W przyszłości: integracja z systemem monitoringu (np. Sentry)

**Nie dotyczy:**
- Brak logowania do tabeli błędów w bazie danych (endpoint nie modyfikuje danych)

---

## 8. Rozważania dotyczące wydajności

### 8.1. Charakterystyka wydajności

**Plusy:**
- ✅ Brak operacji bazodanowych (poza uwierzytelnieniem)
- ✅ Tylko obliczenia matematyczne (bardzo szybkie)
- ✅ Brak I/O operations
- ✅ O(1) złożoność czasowa

**Wyzwania:**
- ⚠️ Może być często wywoływany podczas edycji formularzy
- ⚠️ Uwierzytelnienie wymaga połączenia z Supabase Auth

### 8.2. Potencjalne wąskie gardła

**1. Uwierzytelnienie użytkownika**
- Każde żądanie wymaga walidacji tokenu z Supabase Auth
- Może powodować opóźnienie ~50-200ms

**Mitygacja:**
- Supabase Auth cache po stronie serwera (jeśli dostępne)
- Rozważenie implementacji short-lived cache dla zwalidowanych tokenów

**2. Częstotliwość wywołań**
- UI może wywoływać endpoint przy każdej zmianie w formularzu
- Potencjalnie dziesiątki żądań w krótkim czasie

**Mitygacja:**
- Implementacja debounce/throttle po stronie klienta (np. 300ms)
- Rate limiting per user (np. max 60 requests/minute)

### 8.3. Strategie optymalizacji

**Po stronie serwera:**
1. **Cache uwierzytelnienia** - jeśli możliwe, cache zwalidowanych tokenów na krótki czas (np. 30 sekund)
2. **Monitoring** - śledzenie częstotliwości wywołań per user
3. **Rate limiting** - zabezpieczenie przed nadmiernym wykorzystaniem

**Po stronie klienta:**
1. **Debouncing** - opóźnienie wywołania o 300-500ms po ostatniej zmianie
2. **Local calculation** - rozważenie implementacji obliczeń po stronie klienta (dla podglądu), z walidacją server-side podczas zapisywania
3. **Request cancellation** - anulowanie poprzednich requestów gdy użytkownik szybko zmienia wartości

### 8.4. Monitoring

**Metryki do śledzenia:**
- Średni czas odpowiedzi
- Liczba wywołań per user per minute
- Błędy 500 (niepowodzenia obliczeń)
- Błędy 401 (problemy z uwierzytelnieniem)

---

## 9. Etapy wdrożenia

### Krok 1: Rozszerzenie typów w `src/types.ts`

**Zadanie:** Dodać nowe typy DTO dla request i response

**Akcje:**
1. Dodaj `CalculateNextDueDateCommand` interface
2. Dodaj `NextDueDateResponseDTO` interface
3. Eksportuj oba typy
4. Zaktualizuj dokumentację typów

**Lokalizacja:** `src/types.ts` (sekcja Command Models)

**Rezultat:** Nowe typy dostępne do importu w endpoint i testach

---

### Krok 2: Modyfikacja TaskService

**Zadanie:** Udostępnić metodę `calculateNextDueDate()` publicznie

**Opcja A (preferowana):** Zmiana widoczności metody
```typescript
// Zmiana z:
private calculateNextDueDate(...)
// Na:
public calculateNextDueDate(...)
```

**Opcja B:** Stworzenie public wrapper
```typescript
public calculateNextDueDateForPreview(
  command: CalculateNextDueDateCommand
): string {
  return this.calculateNextDueDate(
    command.interval_value,
    command.interval_unit,
    command.preferred_day_of_week
  );
}
```

**Rekomendacja:** Opcja A - metoda jest już dobrze przetestowana, wystarczy zmiana widoczności

**Lokalizacja:** `src/lib/services/task.service.ts`

**Uwagi:**
- Istniejące testy jednostkowe pozostają aktualne
- Metoda już obsługuje wszystkie wymagane przypadki brzegowe
- Dokumentacja JSDoc jest kompletna

---

### Krok 3: Utworzenie pliku endpointu

**Zadanie:** Utworzyć nowy plik API route

**Lokalizacja:** `src/pages/api/tasks/calculate-next-due-date.ts`

**Struktura pliku:**
```typescript
import type { APIRoute } from "astro";
import { z } from "zod";
import type {
  CalculateNextDueDateCommand,
  NextDueDateResponseDTO,
  ValidationErrorDTO,
  ErrorDTO,
} from "../../../types";
import { authenticateUser } from "../../../lib/utils/auth.utils";
import { TaskService } from "../../../lib/services/task.service";

export const prerender = false;

// Zod validation schema
const CalculateNextDueDateSchema = z.object({
  // ... schema definition
});

// POST handler
export const POST: APIRoute = async ({ request, locals }) => {
  // ... implementation
};
```

**Uwagi:**
- Plik musi być w folderze `src/pages/api/tasks/` aby zapewnić prawidłowy routing
- Nazwa pliku `calculate-next-due-date.ts` mapuje na URL `/api/tasks/calculate-next-due-date`

---

### Krok 4: Implementacja Zod Schema

**Zadanie:** Zdefiniować schemat walidacji dla request body

**Kod:**
```typescript
const CalculateNextDueDateSchema = z.object({
  interval_value: z
    .number({ required_error: "Interval value is required" })
    .int("Interval value must be an integer")
    .min(1, "Interval value must be at least 1")
    .max(999, "Interval value must not exceed 999"),

  interval_unit: z.enum(["days", "weeks", "months", "years"], {
    required_error: "Interval unit is required",
    invalid_type_error: "Interval unit must be one of: days, weeks, months, years",
  }),

  preferred_day_of_week: z
    .number()
    .int("Preferred day of week must be an integer")
    .min(0, "Preferred day of week must be between 0 and 6")
    .max(6, "Preferred day of week must be between 0 and 6")
    .nullable()
    .optional(),
});
```

**Uwagi:**
- Schema jest zgodne z istniejącym `CreateTaskSchema` z `src/pages/api/tasks.ts`
- Komunikaty błędów są spójne z resztą API
- `preferred_day_of_week` jest zarówno nullable jak i optional (zgodnie ze specyfikacją)

---

### Krok 5: Implementacja POST handler

**Zadanie:** Zaimplementować główną logikę endpointu

**Struktura:**
```typescript
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Content-Type Validation
    // 2. Authentication
    // 3. Request Body Parsing
    // 4. Input Validation with Zod
    // 5. Business Logic - Date Calculation
    // 6. Success Response
  } catch (error) {
    // 7. Error Handling - Unexpected Errors
  }
};
```

**Implementacja poszczególnych kroków:**

**1. Content-Type Validation:**
```typescript
const contentType = request.headers.get("content-type");
if (!contentType || !contentType.includes("application/json")) {
  return new Response(
    JSON.stringify({
      error: "Invalid Content-Type",
      details: "Content-Type must be application/json",
    } satisfies ErrorDTO),
    {
      status: 400,
      headers: { "Content-Type": "application/json" },
    }
  );
}
```

**2. Authentication:**
```typescript
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
```

**3. Request Body Parsing:**
```typescript
let requestBody: unknown;

try {
  requestBody = await request.json();
} catch {
  return new Response(
    JSON.stringify({
      error: "Invalid JSON",
      details: "Request body must be valid JSON",
    } satisfies ErrorDTO),
    {
      status: 400,
      headers: { "Content-Type": "application/json" },
    }
  );
}
```

**4. Input Validation:**
```typescript
const validationResult = CalculateNextDueDateSchema.safeParse(requestBody);

if (!validationResult.success) {
  const validationErrors: ValidationErrorDTO = {
    error: "Validation failed",
    details: validationResult.error.errors.map((err) => ({
      field: err.path.join(".") || "unknown",
      message: err.message,
    })),
  };

  return new Response(JSON.stringify(validationErrors), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

const validatedCommand: CalculateNextDueDateCommand = validationResult.data;
```

**5. Business Logic:**
```typescript
const taskService = new TaskService(supabase);
const nextDueDate: string = taskService.calculateNextDueDate(
  validatedCommand.interval_value,
  validatedCommand.interval_unit,
  validatedCommand.preferred_day_of_week ?? null
);
```

**6. Success Response:**
```typescript
const response: NextDueDateResponseDTO = {
  next_due_date: nextDueDate,
};

return new Response(JSON.stringify(response), {
  status: 200,
  headers: { "Content-Type": "application/json" },
});
```

**7. Error Handling:**
```typescript
catch (error) {
  console.error("Error calculating next due date:", error);

  return new Response(
    JSON.stringify({
      error: "Internal server error",
      details: "An unexpected error occurred while calculating next due date",
    } satisfies ErrorDTO),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    }
  );
}
```

---

### Krok 6: Dodanie JSDoc dokumentacji

**Zadanie:** Dodać szczegółową dokumentację do endpointu

**Przykład:**
```typescript
/**
 * POST /api/tasks/calculate-next-due-date
 *
 * Calculates the next due date based on interval and preferred day of week.
 * This is a utility endpoint that doesn't create or modify any data.
 *
 * @requires Authentication via Bearer token
 * @requires Content-Type: application/json
 *
 * @param request - Astro API request containing calculation parameters
 * @returns 200 OK with NextDueDateResponseDTO on success
 * @returns 400 Bad Request on validation error
 * @returns 401 Unauthorized on authentication failure
 * @returns 500 Internal Server Error on unexpected errors
 *
 * @example
 * // Request
 * POST /api/tasks/calculate-next-due-date
 * {
 *   "interval_value": 6,
 *   "interval_unit": "months",
 *   "preferred_day_of_week": 6
 * }
 *
 * // Response (200 OK)
 * {
 *   "next_due_date": "2026-06-27"
 * }
 */
export const POST: APIRoute = async ({ request, locals }) => {
  // ...
};
```

---

### Krok 7: Testy jednostkowe (opcjonalne ale rekomendowane)

**Zadanie:** Utworzyć testy dla endpointu

**Lokalizacja:** `src/pages/api/tasks/calculate-next-due-date.test.ts`

**Scenariusze testowe:**

1. **Sukces - obliczenie daty z preferencją dnia tygodnia**
   - Given: Valid request with all parameters
   - When: POST /api/tasks/calculate-next-due-date
   - Then: 200 OK with next_due_date

2. **Sukces - obliczenie daty bez preferencji dnia tygodnia**
   - Given: Valid request without preferred_day_of_week
   - When: POST /api/tasks/calculate-next-due-date
   - Then: 200 OK with next_due_date

3. **Błąd - brak tokenu uwierzytelnienia**
   - Given: Request without Authorization header
   - When: POST /api/tasks/calculate-next-due-date
   - Then: 401 Unauthorized

4. **Błąd - nieprawidłowy Content-Type**
   - Given: Request with Content-Type: text/plain
   - When: POST /api/tasks/calculate-next-due-date
   - Then: 400 Bad Request

5. **Błąd - nieprawidłowy JSON**
   - Given: Request with malformed JSON
   - When: POST /api/tasks/calculate-next-due-date
   - Then: 400 Bad Request

6. **Błąd - interval_value out of range**
   - Given: Request with interval_value = 1000
   - When: POST /api/tasks/calculate-next-due-date
   - Then: 400 Bad Request with validation details

7. **Błąd - nieprawidłowy interval_unit**
   - Given: Request with interval_unit = "hours"
   - When: POST /api/tasks/calculate-next-due-date
   - Then: 400 Bad Request with validation details

8. **Błąd - preferred_day_of_week out of range**
   - Given: Request with preferred_day_of_week = 7
   - When: POST /api/tasks/calculate-next-due-date
   - Then: 400 Bad Request with validation details

**Framework:** Vitest (zgodnie z tech stack)

**Uwagi:**
- Mockowanie `authenticateUser()` helper
- Mockowanie `TaskService.calculateNextDueDate()`
- Testowanie transformacji błędów Zod do ValidationErrorDTO

---

### Krok 8: Testy integracyjne (opcjonalne)

**Zadanie:** Utworzyć testy end-to-end dla endpointu

**Framework:** Playwright (zgodnie z tech stack)

**Scenariusze:**

1. **Happy path** - pełny flow z autentykacją i obliczeniem
2. **Edge cases** - różne kombinacje interval_unit i preferred_day_of_week
3. **Error handling** - weryfikacja odpowiedzi błędów

**Uwagi:**
- Wymaga działającego dev servera Astro
- Wymaga testowego użytkownika w Supabase

---

### Krok 9: Aktualizacja dokumentacji API

**Zadanie:** Dodać endpoint do dokumentacji API projektu

**Lokalizacja:** `.ai/api-plan.md` (lub odpowiedni plik dokumentacji)

**Zawartość:**
- Pełna specyfikacja endpointu
- Przykłady request/response
- Scenariusze błędów
- Odnośniki do implementacji

---

### Krok 10: Weryfikacja i deployment

**Zadanie:** Finalna weryfikacja przed wdrożeniem

**Checklist:**
- [ ] Kod przechodzi linting (bez błędów)
- [ ] Testy jednostkowe przechodzą (jeśli zaimplementowane)
- [ ] Testy integracyjne przechodzą (jeśli zaimplementowane)
- [ ] Dokumentacja jest kompletna
- [ ] Typy TypeScript są prawidłowe
- [ ] Endpoint działa lokalnie
- [ ] Security review przeprowadzony
- [ ] Performance testing przeprowadzony (opcjonalnie)

**Kroki weryfikacji:**

1. **Local testing:**
```bash
# Start dev server
npm run dev

# Test endpoint manually
curl -X POST http://localhost:4321/api/tasks/calculate-next-due-date \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"interval_value": 6, "interval_unit": "months", "preferred_day_of_week": 6}'
```

2. **Run tests:**
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e
```

3. **Linting:**
```bash
npm run lint
```

4. **Type checking:**
```bash
npm run type-check
```

---

## 10. Podsumowanie

### Kluczowe punkty implementacji

1. **Prostota** - endpoint nie modyfikuje danych, tylko wykonuje obliczenia
2. **Reużycie kodu** - wykorzystanie istniejącej logiki z TaskService
3. **Spójność** - implementacja zgodna z istniejącymi endpointami
4. **Bezpieczeństwo** - pełna walidacja i uwierzytelnienie
5. **Wydajność** - brak operacji bazodanowych (poza auth)

### Potencjalne wyzwania

1. **Częstotliwość wywołań** - wymaga debouncing/throttling po stronie klienta
2. **Widoczność metody** - zmiana private → public w TaskService
3. **Performance monitoring** - śledzenie wykorzystania endpointu

### Następne kroki po implementacji

1. Monitoring wykorzystania endpointu
2. Ewentualna implementacja rate limiting
3. Optymalizacja cache uwierzytelnienia (jeśli potrzebne)
4. Rozważenie client-side calculation jako alternatywy

---

**Estimated effort:** 2-4 godziny (w zależności od zakresu testów)

**Dependencies:**
- Brak - endpoint może być implementowany niezależnie
- Współdziała z istniejącym TaskService

**Risk level:** Niskie - wykorzystuje sprawdzoną logikę biznesową

