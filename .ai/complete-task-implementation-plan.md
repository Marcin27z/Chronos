# API Endpoint Implementation Plan: Complete Task

## 1. Przegląd punktu końcowego

### Cel
Punkt końcowy umożliwia oznaczenie zadania jako ukończonego i automatyczne obliczenie następnej daty wykonania na podstawie interwału powtarzania zadania oraz opcjonalnego preferowanego dnia tygodnia.

### Funkcjonalność
- Aktualizuje pole `last_action_date` na bieżącą datę
- Ustawia pole `last_action_type` na wartość `"completed"`
- Oblicza nową wartość `next_due_date` na podstawie bieżącej daty + interwał zadania, z uwzględnieniem `preferred_day_of_week`
- Aktualizuje pole `updated_at` automatycznie (trigger w bazie danych)
- Zwraca zaktualizowane zadanie w formacie TaskDTO

### Metoda HTTP i ścieżka
```
POST /api/tasks/{taskId}/complete
```

---

## 2. Szczegóły żądania

### Metoda HTTP
`POST`

### Struktura URL
```
/api/tasks/{taskId}/complete
```

### Parametry URL

#### Wymagane
- **taskId** (UUID): Unikalny identyfikator zadania do oznaczenia jako ukończone
  - Format: UUID v4
  - Przykład: `550e8400-e29b-41d4-a716-446655440000`
  - Walidacja: Musi być prawidłowym UUID, zadanie musi istnieć i należeć do zalogowanego użytkownika

### Nagłówki żądania

#### Wymagane
```http
Authorization: Bearer {access_token}
Content-Type: application/json
```

- **Authorization**: Token JWT z Supabase Auth
- **Content-Type**: Zawsze `application/json`

### Request Body
Brak - endpoint nie wymaga ciała żądania.

---

## 3. Wykorzystywane typy

### Response DTOs
```typescript
// Z src/types.ts

// Odpowiedź sukcesu - kompletne zadanie
export type TaskDTO = Task;

// Odpowiedzi błędów
export interface ErrorDTO {
  error: string;
  details?: string;
}

export interface ValidationErrorDTO {
  error: string;
  details: ValidationErrorDetail[];
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
}
```

### Typy wewnętrzne (z Database Types)
```typescript
// Wykorzystane enums z database.types.ts
type ActionType = "completed" | "skipped";
type IntervalUnit = "days" | "weeks" | "months" | "years";
```

### Command Models
Brak dedykowanego Command Model - endpoint nie wymaga ciała żądania.

---

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

**Kod statusu:** `200 OK`

**Struktura odpowiedzi:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "title": "Change water filter",
  "description": "Replace water filter in refrigerator",
  "interval_value": 6,
  "interval_unit": "months",
  "preferred_day_of_week": 6,
  "next_due_date": "2026-04-18",
  "last_action_date": "2025-11-05",
  "last_action_type": "completed",
  "created_at": "2025-01-15T12:00:00Z",
  "updated_at": "2025-11-05T10:30:00Z"
}
```

**Opis pól:**
- `last_action_date`: Ustawione na bieżącą datę UTC
- `last_action_type`: Ustawione na `"completed"`
- `next_due_date`: Obliczone jako: `last_action_date + interval`, z uwzględnieniem `preferred_day_of_week`
- `updated_at`: Automatycznie zaktualizowane przez trigger bazodanowy

### Błędy

#### 400 Bad Request - Nieprawidłowy UUID
```json
{
  "error": "Invalid task ID format",
  "details": "Task ID must be a valid UUID"
}
```

**Kiedy:** taskId nie jest prawidłowym UUID

#### 401 Unauthorized - Brak/Nieprawidłowy Token
```json
{
  "error": "Unauthorized",
  "details": "Missing or invalid authentication token"
}
```

**Kiedy:** 
- Brak nagłówka Authorization
- Token wygasły lub nieprawidłowy
- Token nie może być zweryfikowany

#### 404 Not Found - Zadanie Nie Znalezione
```json
{
  "error": "Task not found",
  "details": "Task does not exist or does not belong to the authenticated user"
}
```

**Kiedy:**
- Zadanie o podanym ID nie istnieje w bazie danych
- Zadanie istnieje, ale należy do innego użytkownika (naruszenie autoryzacji)

#### 500 Internal Server Error - Błąd Serwera
```json
{
  "error": "Internal server error",
  "details": "Failed to update task"
}
```

**Kiedy:**
- Błąd podczas obliczania next_due_date
- Błąd komunikacji z bazą danych
- Nieoczekiwany błąd w aplikacji

---

## 5. Przepływ danych

### Diagram przepływu
```
1. Żądanie HTTP POST → Middleware Astro
2. Middleware → Weryfikacja tokenu JWT (Supabase Auth)
3. Handler endpointu → Walidacja taskId (format UUID)
4. Handler → TaskService.completeTask(userId, taskId)
5. TaskService → Pobierz zadanie z bazy danych (weryfikacja user_id)
6. TaskService → Oblicz next_due_date na podstawie bieżącej daty
7. TaskService → Aktualizuj zadanie w bazie danych
8. TaskService → Zwróć zaktualizowane zadanie
9. Handler → Zwróć odpowiedź 200 OK z TaskDTO
```

### Interakcje z bazą danych

#### Query 1: Pobranie zadania z weryfikacją właściciela
```sql
SELECT * FROM tasks 
WHERE id = $1 AND user_id = $2
LIMIT 1;
```

**Cel:** Weryfikacja istnienia zadania i przynależności do użytkownika w jednym zapytaniu

#### Query 2: Aktualizacja zadania
```sql
UPDATE tasks 
SET 
  last_action_date = $1,
  last_action_type = 'completed',
  next_due_date = $2,
  updated_at = NOW()
WHERE id = $3
RETURNING *;
```

**Cel:** Aktualizacja zadania i zwrócenie zaktualizowanych danych

### Kluczowe obliczenia

#### Algorytm obliczania next_due_date

```typescript
/**
 * Oblicza następną datę wykonania zadania
 * 
 * 1. Rozpocznij od bieżącej daty (CURRENT_DATE w UTC)
 * 2. Dodaj interwał: current_date + (interval_value × interval_unit)
 * 3. Jeśli preferred_day_of_week jest ustawiony:
 *    - Przesuń datę do najbliższego wystąpienia tego dnia tygodnia
 *    - Jeśli obliczona data już wypada w preferowany dzień, pozostaw bez zmian
 *    - W przeciwnym razie przesuń do następnego wystąpienia
 * 4. Zwróć jako string ISO (YYYY-MM-DD)
 */
```

**Przykład 1: Bez preferowanego dnia**
- Bieżąca data: 2025-11-05
- Interwał: 6 months
- Wynik: 2026-05-05

**Przykład 2: Z preferowanym dniem (Saturday = 6)**
- Bieżąca data: 2025-11-05 (wtorek)
- Interwał: 6 months
- Data bazowa: 2026-05-05 (wtorek)
- Wynik po adjustacji: 2026-05-09 (sobota - najbliższy następny weekend)

---

## 6. Względy bezpieczeństwa

### Uwierzytelnianie (Authentication)
- **Wymagany token JWT** w nagłówku Authorization
- Token weryfikowany przez Supabase Auth via middleware
- Endpoint nie jest dostępny dla nieuwierzytelnionych użytkowników

**Implementacja:**
```typescript
// Middleware weryfikuje token i dodaje user do context.locals
const user = context.locals.user;
if (!user) {
  return new Response(
    JSON.stringify({ 
      error: "Unauthorized",
      details: "Missing or invalid authentication token" 
    }), 
    { 
      status: 401,
      headers: { "Content-Type": "application/json" }
    }
  );
}
```

### Autoryzacja (Authorization)
- **Weryfikacja właściciela zasobu**: Zadanie musi należeć do zalogowanego użytkownika
- Użycie `user_id` z tokenu JWT, nigdy z parametrów żądania
- Baza danych zwraca zadanie tylko jeśli `tasks.user_id = authenticated_user_id`

**Zabezpieczenie przed:**
- Vertical privilege escalation: Użytkownik nie może modyfikować zadań innych użytkowników
- Insecure Direct Object Reference (IDOR): Zapytanie SQL zawiera warunek `user_id`

### Walidacja danych wejściowych

#### UUID Validation
```typescript
// Regex do walidacji UUID v4
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}
```

**Zabezpieczenie przed:**
- SQL Injection: Nieprawidłowy format UUID jest odrzucany przed zapytaniem
- Path traversal: Tylko poprawne UUID są akceptowane

### Ochrona przed atakami

#### Rate Limiting
- **Zalecenie**: Implementacja rate limiting na poziomie middleware
- **Limit**: 100 requests / 15 minut na użytkownika
- **Zabezpieczenie**: Przed brute force i DoS attacks

#### CORS
- **Konfiguracja**: Tylko zaufane domeny w produkcji
- **Development**: Localhost dozwolony
- **Headers**: Credentials allowed dla authenticated requests

#### SQL Injection
- **Zabezpieczenie**: Supabase Client używa prepared statements
- **Walidacja**: UUID format validation przed zapytaniem
- **Parametry**: Wszystkie wartości przekazywane jako parametry, nie konkatenowane

---

## 7. Obsługa błędów

### Kategorie błędów

#### 1. Błędy walidacji (400 Bad Request)

**Scenariusz 1: Nieprawidłowy format UUID**
```typescript
if (!isValidUUID(taskId)) {
  return new Response(
    JSON.stringify({
      error: "Invalid task ID format",
      details: "Task ID must be a valid UUID"
    }),
    { 
      status: 400,
      headers: { "Content-Type": "application/json" }
    }
  );
}
```

**Triggery:**
- taskId nie jest UUID
- taskId zawiera znaki specjalne
- taskId ma nieprawidłową długość

---

#### 2. Błędy uwierzytelniania (401 Unauthorized)

**Scenariusz 1: Brak tokenu**
```typescript
const user = context.locals.user;
if (!user) {
  return new Response(
    JSON.stringify({
      error: "Unauthorized",
      details: "Missing or invalid authentication token"
    }),
    { 
      status: 401,
      headers: { "Content-Type": "application/json" }
    }
  );
}
```

**Triggery:**
- Brak nagłówka Authorization
- Token wygasły
- Token nieprawidłowy lub zmanipulowany
- Token nie może być zdekodowany

---

#### 3. Błędy autoryzacji/nie znaleziono zasobu (404 Not Found)

**Scenariusz 1: Zadanie nie istnieje lub nie należy do użytkownika**
```typescript
const task = await taskService.getTask(userId, taskId);
if (!task) {
  return new Response(
    JSON.stringify({
      error: "Task not found",
      details: "Task does not exist or does not belong to the authenticated user"
    }),
    { 
      status: 404,
      headers: { "Content-Type": "application/json" }
    }
  );
}
```

**Triggery:**
- Zadanie o podanym ID nie istnieje
- Zadanie istnieje, ale `task.user_id !== authenticated_user_id`
- Zadanie zostało usunięte

**Uwaga:** Łączymy błędy 403 i 404 w jeden 404, aby nie ujawniać informacji o istnieniu zasobów innych użytkowników (security best practice).

---

#### 4. Błędy serwera (500 Internal Server Error)

**Scenariusz 1: Błąd obliczania daty**
```typescript
try {
  const nextDueDate = this.calculateNextDueDate(...);
} catch (error) {
  console.error("Date calculation error:", error);
  return new Response(
    JSON.stringify({
      error: "Internal server error",
      details: "Failed to calculate next due date"
    }),
    { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    }
  );
}
```

**Triggery:**
- Nieprawidłowe wartości interval_value lub interval_unit w bazie
- Błąd w logice obliczania dat
- Overflow daty (data poza zakresem JavaScript Date)

**Scenariusz 2: Błąd bazy danych**
```typescript
try {
  const result = await supabase.from("tasks").update(...);
  if (result.error) {
    throw new Error(result.error.message);
  }
} catch (error) {
  console.error("Database error:", error);
  return new Response(
    JSON.stringify({
      error: "Internal server error",
      details: "Failed to update task"
    }),
    { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    }
  );
}
```

**Triggery:**
- Utrata połączenia z bazą danych
- Timeout zapytania
- Naruszenie constraints (nie powinno się zdarzyć przy poprawnej implementacji)
- Błąd spójności danych

---

### Logging błędów

**Struktura logowania:**
```typescript
// Błędy 4xx - INFO level (oczekiwane błędy użytkownika)
console.info(`[CompleteTask] Validation error: ${error.message}`, {
  taskId,
  userId,
  errorType: "validation"
});

// Błędy 5xx - ERROR level (nieoczekiwane błędy serwera)
console.error(`[CompleteTask] Server error: ${error.message}`, {
  taskId,
  userId,
  errorType: "database",
  stack: error.stack
});
```

**Best practices:**
- Nigdy nie loguj wrażliwych danych (tokens, passwords)
- Loguj userId i taskId dla debugowania
- Loguj pełny stack trace dla błędów 5xx
- Używaj structured logging (JSON) dla łatwiejszego parsowania

---

## 8. Rozważania dotyczące wydajności

### Optymalizacje bazy danych

#### 1. Single-query approach dla weryfikacji i pobrania
```typescript
// Zamiast dwóch zapytań:
// const task = await getTask(taskId);
// if (task.user_id !== userId) throw Error;

// Użyj jednego zapytania z filtrem:
const { data } = await supabase
  .from("tasks")
  .select("*")
  .eq("id", taskId)
  .eq("user_id", userId)
  .single();
```

**Korzyści:**
- Redukcja round-trips do bazy danych (2 → 1)
- Atomiczna weryfikacja właściciela
- Lepsze wykorzystanie indeksów

#### 2. RETURNING clause dla atomicznej aktualizacji
```typescript
const { data } = await supabase
  .from("tasks")
  .update({
    last_action_date: currentDate,
    last_action_type: "completed",
    next_due_date: calculatedDate
  })
  .eq("id", taskId)
  .eq("user_id", userId)
  .select()
  .single();
```

**Korzyści:**
- Aktualizacja i pobranie w jednym query
- Atomiczność operacji
- Brak race conditions

---

### Indeksy bazodanowe

**Wymagane indeksy (prawdopodobnie już istnieją):**
```sql
-- Primary key index (automatyczny)
CREATE INDEX tasks_pkey ON tasks(id);

-- Composite index dla weryfikacji właściciela
CREATE INDEX idx_tasks_user_id ON tasks(user_id);

-- Composite index dla queries z user_id + id
CREATE INDEX idx_tasks_user_task ON tasks(user_id, id);
```

**Impact:**
- Szybkie lookup po id
- Szybka weryfikacja user_id
- Optymalizacja dla `WHERE id = X AND user_id = Y`

---

### Caching

**Nie zalecane dla tego endpointu:**
- Endpoint modyfikuje dane (POST)
- Każde wywołanie zmienia stan zadania
- Cache invalidation byłaby skomplikowana

**Alternatywne podejście:**
- Cache po stronie klienta dla GET /api/tasks
- Cache dashboard data z TTL 1-5 minut
- Invalidacja cache po successful POST /api/tasks/{id}/complete

---

### Obliczenia po stronie klienta vs serwera

**Decyzja: Server-side calculation**

**Uzasadnienie:**
- Logika biznesowa w jednym miejscu (single source of truth)
- Bezpieczeństwo: klient nie może manipulować next_due_date
- Spójność: wszystkie obliczenia używają tej samej logiki
- Timezone handling: serwer zarządza UTC prawidłowo

**Koszt:**
- Minimalne obliczenia (< 1ms)
- Nie ma znaczącego wpływu na performance

---

### Szacowany czas odpowiedzi

**Target:** < 200ms (p95)
**Breakdown:**
- Middleware auth verification: ~20ms
- UUID validation: < 1ms
- Database query (get task): ~20-50ms
- Date calculation: < 1ms
- Database update: ~20-50ms
- JSON serialization: ~5ms

**Total estimated:** 70-130ms

**Potencjalne bottlenecki:**
- Latencja sieci do Supabase
- Konkurencyjne queries na tabeli tasks
- Cold starts (serverless environments)

**Monitoring:**
- Logowanie czasu wykonania każdego kroku
- Alerty dla requests > 500ms
- Dashboard z p50, p95, p99 latencies

---

## 9. Etapy wdrożenia

### Krok 1: Rozszerzenie TaskService o metodę completeTask

**Lokalizacja:** `src/lib/services/task.service.ts`

**Zadanie:** Dodać nową metodę do klasy TaskService

```typescript
/**
 * Marks a task as completed and calculates next due date
 * 
 * @param userId - ID of the authenticated user
 * @param taskId - ID of the task to complete
 * @returns Updated task with new next_due_date
 * @throws Error if task not found, doesn't belong to user, or update fails
 */
async completeTask(userId: string, taskId: string): Promise<TaskDTO> {
  // Step 1: Fetch task and verify ownership in single query
  const { data: task, error: fetchError } = await this.supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("user_id", userId)
    .single();

  // Step 2: Handle not found (either doesn't exist or wrong user)
  if (fetchError || !task) {
    throw new Error("Task not found or does not belong to user");
  }

  // Step 3: Get current date
  const currentDate = this.getCurrentDateISO();

  // Step 4: Calculate next due date from current date
  const nextDueDate = this.calculateNextDueDate(
    task.interval_value,
    task.interval_unit,
    task.preferred_day_of_week
  );

  // Step 5: Update task with atomic operation
  const { data: updatedTask, error: updateError } = await this.supabase
    .from("tasks")
    .update({
      last_action_date: currentDate,
      last_action_type: "completed" as const,
      next_due_date: nextDueDate,
    })
    .eq("id", taskId)
    .eq("user_id", userId)
    .select()
    .single();

  // Step 6: Handle update errors
  if (updateError || !updatedTask) {
    throw new Error(`Failed to update task: ${updateError?.message || "Unknown error"}`);
  }

  // Step 7: Return updated task
  return updatedTask as TaskDTO;
}
```

**Uwagi:**
- Metoda `calculateNextDueDate` już istnieje
- Wykorzystuje istniejące helper methods: `getCurrentDateISO()`, `formatDateToISO()`

---

### Krok 2: Utworzenie endpointu API

**Lokalizacja:** `src/pages/api/tasks/[taskId]/complete.ts`

**Struktura katalogów:**
```
src/pages/api/tasks/
├── index.ts (istniejący - GET /api/tasks, POST /api/tasks)
├── [taskId].ts (nowy - GET/PUT/DELETE /api/tasks/{taskId})
└── [taskId]/
    └── complete.ts (nowy - POST /api/tasks/{taskId}/complete)
```

**Implementacja endpointu:**
```typescript
import type { APIRoute } from "astro";
import { TaskService } from "../../../../lib/services/task.service";
import type { TaskDTO, ErrorDTO } from "../../../../types";

// Disable prerendering for API route
export const prerender = false;

/**
 * POST /api/tasks/{taskId}/complete
 * Marks task as completed and calculates next due date
 */
export const POST: APIRoute = async (context) => {
  try {
    // Step 1: Verify authentication (handled by middleware)
    const user = context.locals.user;
    if (!user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          details: "Missing or invalid authentication token",
        } satisfies ErrorDTO),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 2: Extract and validate taskId from URL params
    const taskId = context.params.taskId;
    
    if (!taskId) {
      return new Response(
        JSON.stringify({
          error: "Invalid request",
          details: "Task ID is required",
        } satisfies ErrorDTO),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Validate UUID format
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(taskId)) {
      return new Response(
        JSON.stringify({
          error: "Invalid task ID format",
          details: "Task ID must be a valid UUID",
        } satisfies ErrorDTO),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 4: Get Supabase client from context
    const supabase = context.locals.supabase;
    if (!supabase) {
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          details: "Database connection not available",
        } satisfies ErrorDTO),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Initialize service and complete task
    const taskService = new TaskService(supabase);
    
    let completedTask: TaskDTO;
    try {
      completedTask = await taskService.completeTask(user.id, taskId);
    } catch (error) {
      // Check if it's a "not found" error
      if (error instanceof Error && error.message.includes("not found")) {
        return new Response(
          JSON.stringify({
            error: "Task not found",
            details: "Task does not exist or does not belong to the authenticated user",
          } satisfies ErrorDTO),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      
      // Re-throw for general error handler
      throw error;
    }

    // Step 6: Return success response
    return new Response(JSON.stringify(completedTask satisfies TaskDTO), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Step 7: Handle unexpected errors
    console.error("[CompleteTask] Unexpected error:", error);
    
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: "Failed to complete task",
      } satisfies ErrorDTO),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
```

---

### Krok 4: Weryfikacja middleware uwierzytelniania

**Lokalizacja:** `src/middleware/index.ts`

**Zadanie:** Upewnić się, że middleware poprawnie weryfikuje tokeny JWT i dodaje `user` oraz `supabase` do `context.locals`

**Oczekiwana funkcjonalność:**
```typescript
// Middleware powinien:
// 1. Wyodrębnić token z nagłówka Authorization
// 2. Zweryfikować token przez Supabase Auth
// 3. Dodać user do context.locals.user
// 4. Dodać authenticated supabase client do context.locals.supabase
// 5. Kontynuować przetwarzanie jeśli token valid
// 6. Endpoint sam obsłuży 401 jeśli user === null
```

**Sprawdzenie:**
- Przeczytać istniejący plik middleware
- Zweryfikować, że `context.locals.user` jest ustawiane
- Zweryfikować, że `context.locals.supabase` jest dostępne
- Jeśli nie - zaktualizować middleware zgodnie z dokumentacją Supabase

---

### Krok 5: Aktualizacja typów Astro Locals

**Lokalizacja:** `src/env.d.ts`

**Zadanie:** Upewnić się, że TypeScript zna typy dla `context.locals`

**Oczekiwana definicja:**
```typescript
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user: {
      id: string;
      email: string;
      // ... other user fields
    } | null;
    supabase: SupabaseClient;
  }
}
```

**Działania:**
- Sprawdzić czy definicja istnieje
- Dodać/zaktualizować jeśli brakuje
- Import SupabaseClient type z `src/db/supabase.client.ts`

---

### Krok 6: Utworzenie pliku z utility functions dla UUID validation

**Lokalizacja:** `src/lib/utils/validation.utils.ts` (nowy plik)

**Zadanie:** Wyodrębnić walidację UUID do reużywalnej funkcji

```typescript
/**
 * Validates if a string is a valid UUID v4
 * 
 * @param value - String to validate
 * @returns true if valid UUID v4, false otherwise
 */
export function isValidUUID(value: string): boolean {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return UUID_REGEX.test(value);
}

/**
 * Validates UUID and returns error response if invalid
 * Utility for API endpoints
 * 
 * @param value - UUID string to validate
 * @param fieldName - Name of the field for error message
 * @returns Response object if invalid, null if valid
 */
export function validateUUIDOrError(
  value: string | undefined,
  fieldName: string = "ID"
): Response | null {
  if (!value) {
    return new Response(
      JSON.stringify({
        error: "Invalid request",
        details: `${fieldName} is required`,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (!isValidUUID(value)) {
    return new Response(
      JSON.stringify({
        error: `Invalid ${fieldName.toLowerCase()} format`,
        details: `${fieldName} must be a valid UUID`,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return null;
}
```

**Eksport w index:**
```typescript
// src/lib/utils/index.ts
export * from "./validation.utils";
export * from "./auth.utils";
export * from "./utils";
```

---

### Krok 7: Refaktoring endpointu z użyciem validation utils

**Lokalizacja:** `src/pages/api/tasks/[taskId]/complete.ts`

**Zadanie:** Uprościć kod endpointu używając validation utils

**Przed:**
```typescript
const taskId = context.params.taskId;
if (!taskId) {
  return new Response(...); // 6 lines
}
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!UUID_REGEX.test(taskId)) {
  return new Response(...); // 6 more lines
}
```

**Po:**
```typescript
import { validateUUIDOrError } from "../../../../lib/utils/validation.utils";

const taskId = context.params.taskId;
const validationError = validateUUIDOrError(taskId, "Task ID");
if (validationError) {
  return validationError;
}
// taskId is now guaranteed to be a valid UUID
```