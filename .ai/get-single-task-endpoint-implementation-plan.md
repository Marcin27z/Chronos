# API Endpoint Implementation Plan: GET /api/tasks/{taskId}

## 1. Przegląd punktu końcowego

Endpoint służy do pobierania pojedynczego zadania cyklicznego na podstawie jego unikalnego identyfikatora (UUID). Wymaga uwierzytelnienia użytkownika za pomocą tokenu Bearer. Użytkownik może pobrać tylko zadania należące do niego samego - próba dostępu do zadań innych użytkowników skutkuje odpowiedzią 404 Not Found (ze względów bezpieczeństwa traktowana tak samo jak nieistniejące zadanie).

**Główne funkcjonalności:**
- Pobieranie pełnych danych pojedynczego zadania
- Weryfikacja tożsamości użytkownika (authentication)
- Weryfikacja uprawnień dostępu (authorization - tylko własne zadania)
- Zwracanie szczegółowych informacji o zadaniu wraz z metadanymi

## 2. Szczegóły żądania

### Metoda HTTP
`GET`

### Struktura URL
```
/api/tasks/{taskId}
```

### Parametry

**Parametry URL (wymagane):**
- `taskId` (string, UUID): Unikalny identyfikator zadania do pobrania
  - Format: UUID v4 (np. `550e8400-e29b-41d4-a716-446655440000`)
  - Walidacja: Musi być poprawnym formatem UUID

**Nagłówki HTTP (wymagane):**
- `Authorization: Bearer {access_token}`: Token uwierzytelniający użytkownika
  - Format: `Bearer` + token JWT z Supabase Auth
  - Walidacja: Token musi być aktywny i nie wygasły

**Query Parameters:**
- Brak

**Request Body:**
- Brak (metoda GET)

### Przykład żądania

```http
GET /api/tasks/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. Wykorzystywane typy

### Response DTOs

**TaskDTO** (z `src/types.ts`):
```typescript
export type TaskDTO = Task; // Complete task representation

// Task zawiera następujące pola:
interface Task {
  id: string;                              // UUID zadania
  user_id: string;                         // UUID użytkownika
  title: string;                           // Tytuł zadania (max 256 znaków)
  description: string | null;              // Opcjonalny opis
  interval_value: number;                  // Wartość interwału (1-999)
  interval_unit: IntervalUnit;             // Jednostka: days/weeks/months/years
  preferred_day_of_week: number | null;    // Preferowany dzień tygodnia (0-6, null)
  next_due_date: string;                   // Data następnego wykonania (YYYY-MM-DD)
  last_action_date: string | null;         // Data ostatniej akcji
  last_action_type: ActionType | null;     // Typ ostatniej akcji (completed/skipped)
  created_at: string;                      // ISO 8601 timestamp UTC
  updated_at: string;                      // ISO 8601 timestamp UTC
}
```

**ErrorDTO** (z `src/types.ts`):
```typescript
export interface ErrorDTO {
  error: string;        // Główna wiadomość błędu
  details?: string;     // Opcjonalne szczegóły (tylko dev/staging)
}
```

### Validation Schemas (Zod)

Należy utworzyć nowy schemat walidacji w pliku `src/lib/utils/validation.utils.ts`:

```typescript
import { z } from "zod";

export const taskIdParamSchema = z.object({
  taskId: z.string().uuid("Invalid task ID format. Must be a valid UUID.")
});

export type TaskIdParam = z.infer<typeof taskIdParamSchema>;
```

### Service Types

Brak nowych typów - wykorzystamy istniejące typy z `src/types.ts`.

## 4. Szczegóły odpowiedzi

### Sukces - 200 OK

**Content-Type:** `application/json`

**Body:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "title": "Change water filter",
  "description": "Replace water filter in refrigerator",
  "interval_value": 6,
  "interval_unit": "months",
  "preferred_day_of_week": 6,
  "next_due_date": "2025-10-20",
  "last_action_date": "2025-04-15",
  "last_action_type": "completed",
  "created_at": "2025-01-15T12:00:00Z",
  "updated_at": "2025-04-15T14:30:00Z"
}
```

### Błąd - 400 Bad Request

Zwracany gdy format `taskId` jest nieprawidłowy (nie jest UUID).

**Content-Type:** `application/json`

**Body:**
```json
{
  "error": "Invalid task ID format",
  "details": "taskId must be a valid UUID"
}
```

### Błąd - 401 Unauthorized

Zwracany gdy brak tokenu autoryzacji lub token jest nieprawidłowy/wygasły.

**Content-Type:** `application/json`

**Body:**
```json
{
  "error": "Unauthorized",
  "details": "Valid authentication token required"
}
```

### Błąd - 404 Not Found

Zwracany gdy:
- Zadanie o podanym ID nie istnieje
- Zadanie istnieje ale należy do innego użytkownika

**Uwaga bezpieczeństwa:** Obie sytuacje zwracają identyczną odpowiedź, aby uniemożliwić enumerację ID zadań innych użytkowników.

**Content-Type:** `application/json`

**Body:**
```json
{
  "error": "Task not found"
}
```

### Błąd - 500 Internal Server Error

Zwracany przy nieoczekiwanych błędach serwera (błędy bazy danych, błędy aplikacji).

**Content-Type:** `application/json`

**Body:**
```json
{
  "error": "Internal server error",
  "details": "An unexpected error occurred"
}
```

**Uwaga:** W środowisku produkcyjnym pole `details` powinno być pominięte lub zawierać tylko ogólne informacje. Szczegółowe logi błędów powinny być zapisywane po stronie serwera.

## 5. Przepływ danych

### Diagram przepływu

```
Client Request
    ↓
[Astro Middleware]
    ├─ Verify Authentication (Bearer Token)
    ├─ Initialize Supabase Client in context.locals
    └─ If auth fails → 401 Unauthorized
    ↓
[API Route Handler: src/pages/api/tasks/[taskId].ts]
    ├─ Extract taskId from URL params
    ├─ Validate taskId format (Zod schema)
    ├─ If validation fails → 400 Bad Request
    └─ Get authenticated user from context.locals.supabase
    ↓
[TaskService.getTaskById(userId, taskId)]
    ├─ Query Supabase: SELECT * FROM tasks WHERE id = ? AND user_id = ?
    ├─ Apply RLS policies (additional security layer)
    └─ Return task data or throw error
    ↓
[API Route Handler]
    ├─ If task found → 200 OK + TaskDTO
    ├─ If task not found → 404 Not Found
    └─ If unexpected error → 500 Internal Server Error
    ↓
Client Response
```

### Szczegółowy przepływ kroków

1. **Request Processing (Middleware)**
   - Middleware Astro sprawdza nagłówek `Authorization`
   - Inicjalizuje klienta Supabase z tokenem użytkownika
   - Weryfikuje ważność tokenu poprzez Supabase Auth
   - Jeśli token nieprawidłowy → zwraca 401 Unauthorized
   - Jeśli token prawidłowy → przekazuje kontrolę do route handlera

2. **Input Validation (Route Handler)**
   - Ekstrahuje `taskId` z parametrów URL (`Astro.params.taskId`)
   - Waliduje format UUID za pomocą schematu Zod
   - Jeśli walidacja nie przejdzie → zwraca 400 Bad Request z opisem błędu
   - Jeśli walidacja przejdzie → przekazuje do warstwy serwisowej

3. **Business Logic (TaskService)**
   - Wywołuje `getTaskById(userId, taskId)` w TaskService
   - Wykonuje zapytanie do bazy danych z filtrowaniem po `id` i `user_id`
   - Supabase automatycznie stosuje RLS policies jako dodatkową warstwę bezpieczeństwa
   - Jeśli zadanie znalezione → zwraca TaskDTO
   - Jeśli zadanie nie znalezione → rzuca błąd

4. **Response Handling (Route Handler)**
   - Jeśli serwis zwrócił dane → formatuje odpowiedź 200 OK z TaskDTO
   - Jeśli serwis rzucił błąd "not found" → zwraca 404 Not Found
   - Jeśli wystąpił inny błąd → loguje szczegóły i zwraca 500 Internal Server Error
   - Zwraca odpowiedź do klienta w formacie JSON

### Interakcje z bazą danych

**Query wykonywane w TaskService:**

```typescript
const { data, error } = await this.supabase
  .from("tasks")
  .select("*")
  .eq("id", taskId)
  .eq("user_id", userId)
  .single();
```

**Charakterystyka zapytania:**
- Filtrowanie po dwóch kolumnach: `id` (PRIMARY KEY) i `user_id` (FOREIGN KEY)
- `.single()` - oczekujemy dokładnie jednego wyniku lub błędu
- Wykorzystanie indeksów dla optymalnej wydajności
- RLS policies Supabase jako dodatkowa warstwa security

## 6. Względy bezpieczeństwa

### Authentication (Uwierzytelnianie)

**Mechanizm:**
- Bearer Token z Supabase Auth (JWT)
- Token zawiera informacje o użytkowniku i jego uprawnieniach
- Weryfikacja odbywa się w middleware Astro przed dostępem do endpointu

**Implementacja:**
- Token pobierany z nagłówka `Authorization: Bearer {token}`
- Klient Supabase inicjalizowany z tokenem w `context.locals.supabase`
- Middleware automatycznie odrzuca żądania z brakującym/nieprawidłowym tokenem

**Best Practices:**
- Tokeny mają ograniczony czas życia (expiration)
- Używamy HTTPS do szyfrowania transmisji tokenów
- Tokeny nie są przechowywane w logach

### Authorization (Autoryzacja)

**Mechanizm:**
- Weryfikacja własności zasobu (ownership check)
- Użytkownik może uzyskać dostęp tylko do własnych zadań

**Implementacja:**
```typescript
// Zapytanie filtruje po user_id i taskId
.eq("id", taskId)
.eq("user_id", userId)
```

**Defense in Depth:**
- Row Level Security (RLS) policies w Supabase jako dodatkowa warstwa
- Polityki RLS automatycznie filtrują wyniki zapytań
- Nawet jeśli kod aplikacji ma błąd, RLS chroni dane

**Zapobieganie Horizontal Privilege Escalation:**
- Użytkownik nie może "zgadywać" ID zadań innych użytkowników
- Odpowiedź 404 dla nieistniejących zadań i zadań innych użytkowników jest identyczna
- Uniemożliwia to enumeration attacks

### Input Validation (Walidacja danych wejściowych)

**Walidacja UUID:**
```typescript
const taskIdParamSchema = z.object({
  taskId: z.string().uuid()
});
```

**Zabezpieczenia:**
- Zod schema weryfikuje format UUID przed zapytaniem do bazy
- Zapobiega próbom SQL injection (choć Supabase parametryzuje zapytania)
- Wczesne odrzucenie nieprawidłowych danych (fail fast)

**Type Safety:**
- TypeScript zapewnia typowanie w czasie kompilacji
- Zod zapewnia walidację w runtime
- Podwójna warstwa ochrony przed błędami typu

### Information Disclosure Prevention

**Zasada:**
- Minimalizacja informacji w odpowiedziach błędów
- Szczegółowe logi tylko po stronie serwera

**Implementacja:**
```typescript
// 404 dla obu przypadków:
// - zadanie nie istnieje
// - zadanie należy do innego użytkownika
if (!task) {
  return new Response(
    JSON.stringify({ error: "Task not found" }),
    { status: 404 }
  );
}
```

**Korzyści:**
- Atakujący nie może określić, czy UUID jest prawidłowy
- Utrudnia enumeration attacks
- Chroni prywatność użytkowników

### HTTPS/TLS

**Wymagania:**
- Wszystkie żądania muszą używać HTTPS w produkcji
- Bearer tokeny nigdy nie są przesyłane przez niezabezpieczone połączenia
- Konfiguracja serwera powinna wymuszać HTTPS (HSTS headers)

### Rate Limiting

**Rekomendacje:**
- Implementacja rate limiting na poziomie infrastruktury (load balancer, API gateway)
- Limity per użytkownika: np. 100 żądań/minutę
- Limity per IP: np. 1000 żądań/minutę
- Odpowiedź 429 Too Many Requests przy przekroczeniu

## 7. Obsługa błędów

### Hierarchia obsługi błędów

```
Try-Catch w Route Handler
    ↓
Service Layer Errors (throw)
    ↓
Catch w Route Handler
    ↓
Log + Format Response
    ↓
Return to Client
```

### Szczegółowe scenariusze błędów

#### 1. Błąd walidacji UUID (400 Bad Request)

**Warunek:**
- `taskId` nie jest prawidłowym formatem UUID
- Np. `taskId = "invalid-uuid-123"`

**Detekcja:**
```typescript
const result = taskIdParamSchema.safeParse({ taskId });
if (!result.success) {
  // Zwróć 400
}
```

**Odpowiedź:**
```json
{
  "error": "Invalid task ID format",
  "details": "taskId must be a valid UUID"
}
```

**Logowanie:**
```typescript
console.warn(`Invalid taskId format: ${taskId}`);
```

#### 2. Brak autoryzacji (401 Unauthorized)

**Warunek:**
- Brak nagłówka `Authorization`
- Token nieprawidłowy lub wygasły
- Użytkownik nie jest uwierzytelniony

**Detekcja:**
- Obsługa w middleware Astro
- Sprawdzenie `context.locals.supabase.auth.getUser()`

**Odpowiedź:**
```json
{
  "error": "Unauthorized",
  "details": "Valid authentication token required"
}
```

**Logowanie:**
```typescript
console.warn(`Unauthorized access attempt to task ${taskId}`);
```

#### 3. Zadanie nie znalezione (404 Not Found)

**Warunki:**
- Zadanie o podanym `taskId` nie istnieje w bazie danych
- Zadanie istnieje, ale należy do innego użytkownika

**Detekcja:**
```typescript
const task = await taskService.getTaskById(userId, taskId);
if (!task) {
  // Zwróć 404
}
```

**Odpowiedź:**
```json
{
  "error": "Task not found"
}
```

**Logowanie:**
```typescript
console.info(`Task not found or access denied: ${taskId} for user ${userId}`);
```

**Uwaga:** W logach możemy zapisać więcej informacji (dla debugging), ale w odpowiedzi do klienta zwracamy tylko ogólny komunikat.

#### 4. Błąd bazy danych (500 Internal Server Error)

**Warunki:**
- Utrata połączenia z bazą danych
- Timeout zapytania
- Błąd Supabase API
- Nieoczekiwany błąd w kodzie aplikacji

**Detekcja:**
```typescript
try {
  const task = await taskService.getTaskById(userId, taskId);
} catch (error) {
  // Log szczegółowy błąd
  console.error("Database error:", error);
  // Zwróć ogólny komunikat do klienta
}
```

**Odpowiedź (produkcja):**
```json
{
  "error": "Internal server error"
}
```

**Odpowiedź (development):**
```json
{
  "error": "Internal server error",
  "details": "Database connection timeout after 30s"
}
```

**Logowanie:**
```typescript
console.error("Failed to retrieve task:", {
  taskId,
  userId,
  error: error.message,
  stack: error.stack
});
```

### Error Response Factory

**Zalecana implementacja pomocniczej funkcji:**

```typescript
// src/lib/utils/error-response.utils.ts
export function createErrorResponse(
  status: number,
  message: string,
  details?: string
): Response {
  const body: ErrorDTO = {
    error: message,
    ...(import.meta.env.DEV && details ? { details } : {})
  };
  
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: { "Content-Type": "application/json" }
    }
  );
}
```

**Użycie:**
```typescript
return createErrorResponse(404, "Task not found");
return createErrorResponse(500, "Internal server error", error.message);
```

### Logging Strategy

**Poziomy logowania:**
- `console.error()` - błędy 500 (wymagają akcji)
- `console.warn()` - błędy 400, 401 (potencjalne ataki)
- `console.info()` - błędy 404 (normalna operacja)
- `console.debug()` - szczegółowe informacje (tylko dev)

**Struktura logów:**
```typescript
console.error("Error retrieving task", {
  timestamp: new Date().toISOString(),
  taskId,
  userId,
  errorType: error.constructor.name,
  errorMessage: error.message,
  stack: error.stack
});
```

## 8. Rozważania dotyczące wydajności

### Database Query Performance

**Optymalizacje zapytania:**
- Filtrowanie po `id` (PRIMARY KEY) - wykorzystanie indeksu klastrowanego
- Filtrowanie po `user_id` (FOREIGN KEY) - wykorzystanie indeksu
- `.single()` - Supabase wie, że oczekujemy jednego wyniku
- Brak join'ów - prosta query na jednej tabeli

**Czas odpowiedzi:**
- Oczekiwany: 10-50ms dla prostego SELECT by PK
- Z walidacją i autoryzacją: 20-100ms
- Network latency: +10-200ms w zależności od lokalizacji

**Monitoring:**
- Należy monitorować Query Performance Insights w Supabase
- Alerty przy przekroczeniu 200ms dla 95th percentile
- Tracking slow queries (>500ms)

### Caching Strategy

**Obecnie:**
- Brak cachowania (zawsze świeże dane z bazy)
- Każde żądanie wykonuje query do Supabase

**Potencjalne optymalizacje (future):**
- Response caching z krótkim TTL (5-60s)
- Redis cache dla często pobieranych zadań
- Cache invalidation przy update/complete/skip
- ETags dla conditional requests (304 Not Modified)

**Uwagi:**
- Dla MVP cachowanie nie jest krytyczne
- Dane zadań zmieniają się rzadko
- Cache może być dodany później bez zmian API

### Connection Pooling

**Supabase:**
- Wbudowany connection pooling w Supabase
- Pooler zarządzany przez Supabase (PgBouncer)
- Aplikacja nie musi zarządzać połączeniami

**Best Practices:**
- Używać pojedynczego klienta Supabase per request (z middleware)
- Nie tworzyć nowych klientów w pętlach
- Supabase automatycznie reusuje połączenia

### Pagination i Filtering

**Obecnie:**
- Endpoint zwraca pojedyncze zadanie - brak paginacji
- Proste zapytanie po ID - brak złożonych filtrów

**Inne endpointy:**
- `/api/tasks` (lista) implementuje paginację (limit/offset)
- Ten endpoint nie wymaga paginacji

### Scalability Considerations

**Horizontal Scaling:**
- Endpoint jest stateless - łatwo skalować horizontal
- Load balancer może kierować żądania do wielu instancji
- Brak shared state między requestami

**Database Scaling:**
- Supabase automatycznie skaluje do zadanego planu
- Read replicas dla odciążenia głównej bazy (jeśli potrzebne)
- Connection pooling zapobiega wyczerpaniu połączeń

**Bottlenecks:**
- Główny bottleneck: database response time
- Sekundary: network latency do Supabase
- Minimalne: logic aplikacji (bardzo prosta)

### Monitoring Metrics

**Kluczowe metryki do trackowania:**
- Request rate (requests per second)
- Response time (p50, p95, p99)
- Error rate (% of 4xx, 5xx responses)
- Database query time
- Time to First Byte (TTFB)

**Alerty:**
- Error rate > 1% przez 5 minut
- p95 response time > 500ms
- Database query time > 200ms

## 9. Etapy wdrożenia

### Krok 1: Rozszerzenie warstwy walidacji danych wejściowych

**Cel:** Utworzenie nowego schematu walidacji dla parametru URL taskId wykorzystującego bibliotekę Zod.

**Lokalizacja:** Plik `src/lib/utils/validation.utils.ts` - moduł zawierający wszystkie schematy walidacji Zod używane w projekcie.

**Uzasadnienie decyzji projektowej:**
Walidacja UUID na poziomie schematu Zod (przed przekazaniem do logiki biznesowej) realizuje zasadę "fail fast" - nieprawidłowe dane są odrzucane jak najwcześniej w cyklu przetwarzania żądania. To:
- Zmniejsza obciążenie bazy danych (nieprawidłowe UUID nie trafiają do zapytań)
- Zapewnia spójną walidację w całej aplikacji
- Generuje czytelne komunikaty błędów pochodzące bezpośrednio ze schematu
- Umożliwia łatwe testowanie walidacji niezależnie od logiki biznesowej

**Szczegóły implementacyjne:**

**1.1. Definicja schematu walidacji**
Należy zdefiniować obiekt schematu Zod zawierający pojedyncze pole `taskId` typu string z walidatorem UUID. Schemat powinien zawierać niestandardowy komunikat błędu, który jasno opisuje wymagania formatu (UUID).

**1.2. Eksport typu TypeScript**
Wykorzystać mechanizm inferencji typów Zod (`z.infer`) do automatycznego wygenerowania typu TypeScript odpowiadającego schematowi. To zapewni pełną spójność między walidacją runtime a typowaniem compile-time.

**1.3. Umiejscowienie w pliku**
Dodać nowy schemat w logicznej sekcji pliku, najlepiej w grupie schematów dotyczących parametrów URL (jeśli taka sekcja istnieje) lub jako nowa sekcja "URL Parameter Schemas". Zachować alfabetyczne sortowanie eksportów dla łatwiejszego odnajdywania.

**Przypadki testowe do weryfikacji:**

**Przypadek 1: Prawidłowy UUID v4**
- Input: Standardowy UUID w formacie `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
- Oczekiwany rezultat: Walidacja przechodzi, zwraca obiekt z polem taskId
- Cel: Weryfikacja akceptacji poprawnych identyfikatorów

**Przypadek 2: Nieprawidłowy format - tekst bez struktury UUID**
- Input: Dowolny string niemający struktury UUID (np. "invalid-uuid", "abc123")
- Oczekiwany rezultat: Błąd walidacji z komunikatem o wymaganym formacie UUID
- Cel: Weryfikacja odrzucenia oczywistych błędów formatowania

**Przypadek 3: Pusta wartość**
- Input: Pusty string
- Oczekiwany rezultat: Błąd walidacji
- Cel: Zapewnienie, że parametr jest wymagany

**Przypadek 4: Wartość null lub undefined**
- Input: null lub undefined
- Oczekiwany rezultat: Błąd walidacji
- Cel: Ochrona przed przypadkowym brakiem parametru

**Przypadek 5: UUID w nieprawidłowym formacie (bez myślników)**
- Input: 32 znaki hexadecymalne bez separatorów
- Oczekiwany rezultat: Błąd walidacji
- Cel: Weryfikacja ścisłego przestrzegania formatu RFC 4122

**Integracja z istniejącym kodem:**
Należy upewnić się, że nowy schemat jest eksportowany z pliku i dostępny dla innych modułów. Sprawdzić czy inne schematy w pliku używają podobnych wzorców nazewnictwa (np. suffiks "Schema") i zachować spójność.

### Krok 2: Rozszerzenie warstwy logiki biznesowej (TaskService)

**Cel:** Dodanie nowej publicznej metody do klasy TaskService odpowiedzialnej za pobieranie pojedynczego zadania z weryfikacją własności.

**Lokalizacja:** Plik `src/lib/services/task.service.ts` - główna klasa serwisu zawierająca logikę biznesową operacji na zadaniach.

**Uzasadnienie decyzji projektowej:**
Separacja logiki biznesowej od warstwy HTTP (route handler) realizuje wzorzec Service Layer Pattern. Korzyści:
- Możliwość reużycia logiki pobierania zadania w innych miejscach aplikacji
- Testowanie logiki biznesowej niezależnie od frameworka Astro
- Centralny punkt zarządzania operacjami na zadaniach
- Łatwiejsze utrzymanie - zmiany w logice biznesowej nie wymagają modyfikacji endpointów
- Spójność z pozostałymi metodami TaskService (createTask, getTasks, performTaskAction)

**Architektura metody:**

**2.1. Sygnatura metody**
Metoda powinna być publiczna i asynchroniczna, przyjmując dwa parametry: identyfikator użytkownika (userId) oraz identyfikator zadania (taskId), oba jako stringi UUID. Zwracany typ to Promise rozwiązująca się do TaskDTO - pełnej reprezentacji zadania.

**Uzasadnienie parametrów:**
- `userId` - wymagany do weryfikacji autoryzacji, musi być przekazany explicite (nie pobierany wewnątrz metody)
- `taskId` - identyfikator zadania do pobrania, już zwalidowany na poziomie route handlera
- Brak parametrów opcjonalnych - metoda ma jedno jasno określone zadanie

**2.2. Strategia zapytania do bazy danych**

**Konstrukcja zapytania:**
Zapytanie do tabeli tasks wykorzystujące klienta Supabase (dostępnego jako pole klasy). Kluczowe elementy:
- Selekcja wszystkich kolumn (pełna reprezentacja encji)
- Filtrowanie po dwóch kryteriach równości: id oraz user_id
- Modyfikator single() - wymuszający oczekiwanie dokładnie jednego wyniku

**Dlaczego równoczesne filtrowanie po id i user_id:**
1. **Bezpieczeństwo:** Nawet jeśli taskId należy do innego użytkownika, zapytanie zwróci pusty wynik
2. **Wydajność:** Wykorzystanie dwóch indeksów (PRIMARY KEY na id, FOREIGN KEY index na user_id)
3. **Redundancja bezpieczeństwa:** Dodatkowa warstwa ochrony poza RLS policies
4. **Przejrzystość intencji:** Kod jasno komunikuje, że weryfikujemy własność zasobu

**Dlaczego modyfikator single():**
- Semantic clarity - kod wyraża oczekiwanie dokładnie jednego wyniku
- Error handling - Supabase automatycznie zwraca błąd jeśli wynik jest pusty lub zawiera >1 rekord
- Type safety - zwracany typ to pojedynczy obiekt, nie array

**2.3. Obsługa wyników i błędów**

**Scenariusz sukcesu:**
Gdy zapytanie zwróci dane bez błędu, należy zwrócić obiekt rzutowany na typ TaskDTO. Rzutowanie jest bezpieczne, ponieważ typ TaskDTO jest aliasem typu Task z database.types, który reprezentuje dokładnie strukturę tabeli tasks.

**Scenariusz błędu:**
Metoda powinna rzucać wyjątek (throw Error) zamiast zwracać null lub undefined. Uzasadnienie:
- Wyraźna sygnalizacja stanu błędu (nie można go zignorować)
- Spójność z innymi metodami serwisu (np. performTaskAction również rzuca błędy)
- Łatwiejsze centralne przechwytywanie błędów w route handlerze
- Możliwość przekazania kontekstu błędu przez message

**Komunikat błędu:**
Powinien być ogólny i nie ujawniać czy zadanie nie istnieje, czy należy do innego użytkownika (information disclosure prevention). Jednakowa wiadomość dla obu przypadków: "Task not found or does not belong to user".

**2.4. Dokumentacja JSDoc**

Każda publiczna metoda serwisu powinna mieć kompletną dokumentację JSDoc zawierającą:
- Opis biznesowy - co metoda robi z perspektywy domeny
- @param dla każdego parametru z opisem typu i przeznaczenia
- @returns z opisem zwracanej wartości
- @throws z opisem warunków, kiedy wyjątek jest rzucany

To ułatwia IntelliSense w IDE i stanowi dokumentację kontraktów API serwisu.

**2.5. Pozycjonowanie w klasie**

**Logiczne grupowanie metod:**
TaskService zawiera różne typy operacji na zadaniach. Należy zachować logiczną kolejność:
1. Operacje zapisu (createTask)
2. Operacje odczytu prostego (getTasks, **getTaskById** ← nowa metoda tutaj)
3. Operacje odczytu złożonego (getDashboardData)
4. Operacje akcji (performTaskAction)
5. Metody pomocnicze prywatne

Umieszczenie getTaskById po getTasks, a przed getDashboardData zachowuje spójność - grupuje operacje odczytu od prostszych do bardziej złożonych.

**2.6. Spójność z wzorcami w klasie**

Należy zachować spójność z istniejącymi metodami:
- Nazewnictwo: camelCase, czasownik + rzeczownik (getTaskById)
- Obsługa błędów: throw Error z opisem problemu
- Typ zwracany: Promise<TaskDTO> (nie Promise<TaskDTO | null>)
- Wykorzystanie this.supabase - nie tworzenie nowych instancji klienta
- Rzutowanie wyników: `as TaskDTO` dla type safety

**2.7. Testy jednostkowe (rozważania)**

Choć w tym kroku nie implementujemy testów, warto zaprojektować metodę tak, aby była testowalina:
- Zależność od Supabase przekazana przez konstruktor (dependency injection) - możliwość mockowania
- Jasny kontrakt wejścia/wyjścia - łatwe scenariusze testowe
- Deterministyczne zachowanie - bez efektów ubocznych poza zapytaniem DB

### Krok 3: Utworzenie warstwy HTTP (API Route Handler)

**Cel:** Implementacja punktu wejścia HTTP dla endpointu GET /api/tasks/{taskId} w architekturze file-based routing Astro.

**Lokalizacja:** Nowy plik `src/pages/api/tasks/[taskId].ts` - konwencja Astro: nawiasy kwadratowe oznaczają parametr dynamiczny w ścieżce URL.

**Uzasadnienie struktury ścieżki:**
- `src/pages/api/` - prefix dla wszystkich endpointów API (oddzielenie od stron renderowanych)
- `tasks/` - namespace dla operacji na zadaniach (RESTful resource grouping)
- `[taskId].ts` - parametr dynamiczny będzie dostępny przez `context.params.taskId`

**Architektura handlera:**

**3.1. Konfiguracja renderowania**

**Wyłączenie pre-renderingu:**
Handler musi eksportować stałą `prerender` ustawioną na false. To wymusza Server-Side Rendering (SSR) dla każdego żądania. Uzasadnienie:
- Dane są dynamiczne i specyficzne dla użytkownika (personalizacja)
- Wymagana jest weryfikacja tokenu autoryzacji przy każdym żądaniu
- Nie ma sensu cache'ować odpowiedzi statycznie (każdy użytkownik widzi inne dane)
- Bezpieczeństwo - statyczne pre-renderowanie nie może uwzględnić autoryzacji

**3.2. Importy i zależności**

Handler wymaga zaimportowania kilku kluczowych modułów:

**Import typu APIRoute z Astro:**
Typ dla funkcji handlera endpointu. Definiuje sygnaturę: funkcja asynchroniczna przyjmująca obiekt context i zwracająca Promise<Response>.

**Import TaskService:**
Klasa logiki biznesowej do wykonania operacji pobrania zadania. Ścieżka importu względna, wskazująca na serwis utworzony w Kroku 2.

**Import schematu walidacji taskIdParamSchema:**
Schemat Zod do walidacji parametru URL. Ścieżka importu do utils utworzonych w Kroku 1.

**Import typów DTO:**
TaskDTO i ErrorDTO z centralnego pliku types.ts. Zapewnia type safety dla obiektów odpowiedzi.

**3.3. Eksport funkcji handlera GET**

Handler eksportuje nazwany eksport `GET` - konwencja Astro dla metody HTTP GET. Funkcja jest asynchroniczna (async) i przyjmuje obiekt context zawierający:
- `params` - parametry URL (w tym taskId)
- `locals` - obiekt współdzielony przez middleware (zawiera klienta Supabase)
- `request` - obiekt Request HTTP
- inne metadane żądania

**3.4. Przepływ przetwarzania żądania - Happy Path**

**Faza 1: Ekstrakcja parametru URL**
Pobranie taskId z obiektu context.params. W tym momencie taskId jest stringiem, ale nie jest jeszcze zwalidowany - może mieć dowolną wartość.

**Faza 2: Walidacja formatu parametru**
Użycie metody safeParse schematu Zod do walidacji taskId. Metoda safeParse (w przeciwieństwie do parse) nie rzuca wyjątku - zwraca obiekt z polem success i ewentualnymi błędami.

**Decyzja: Warunek negatywny (early return):**
Jeśli walidacja nie powiedzie się (!result.success), należy natychmiast zwrócić odpowiedź 400 Bad Request z:
- Obiektem ErrorDTO zawierającym czytelny komunikat błędu
- Statusem HTTP 400
- Nagłówkiem Content-Type: application/json
- Serializacją JSON obiektu błędu

To realizuje wzorzec "guard clause" - błędy są obsługiwane na początku, happy path pozostaje na końcu funkcji bez głębokiego zagnieżdżenia.

**Faza 3: Weryfikacja uwierzytelnienia**
Wywołanie metody auth.getUser() na kliencie Supabase z context.locals. Metoda:
- Weryfikuje token JWT z nagłówka Authorization
- Sprawdza czy token nie wygasł
- Dekoduje i zwraca obiekt użytkownika
- Zwraca błąd jeśli token jest nieprawidłowy

**Destructuring wyniku:**
Wynik ma strukturę { data: { user }, error }. Należy użyć destructuringu do wyekstrahowania użytkownika i potencjalnego błędu.

**Decyzja: Warunek negatywny (early return):**
Jeśli wystąpił błąd autoryzacji LUB obiekt user jest null/undefined, zwrócić odpowiedź 401 Unauthorized z:
- Obiektem ErrorDTO z komunikatem o wymaganej autoryzacji
- Statusem HTTP 401
- Odpowiednimi nagłówkami JSON

**Faza 4: Wywołanie logiki biznesowej**
Utworzenie instancji TaskService przekazując klienta Supabase z context.locals (dependency injection). Następnie wywołanie metody getTaskById z parametrami:
- user.id - identyfikator uwierzytelnionego użytkownika
- validationResult.data.taskId - zwalidowany UUID zadania

Metoda zwraca Promise<TaskDTO> lub rzuca wyjątek.

**Faza 5: Zwrot sukcesu**
Jeśli metoda serwisu zwróci dane bez rzucenia wyjątku, należy zwrócić odpowiedź 200 OK z:
- Serializacją JSON obiektu TaskDTO
- Statusem HTTP 200
- Nagłówkiem Content-Type: application/json

**3.5. Przepływ obsługi błędów - Error Path**

**Strategia: Try-Catch Block**
Cały kod happy path powinien być owinięty w blok try-catch. To umożliwia centralne przechwytywanie:
- Błędów rzuconych przez TaskService
- Nieoczekiwanych błędów (błędy sieci, błędy Supabase, błędy JavaScript)
- Błędów serializacji JSON

**Obsługa w bloku catch:**

**Faza 1: Strukturalne logowanie błędu**
Zalogować błąd używając console.error z obiektem kontekstowym zawierającym:
- taskId (dla identyfikacji żądania)
- komunikat błędu
- stack trace (jeśli dostępny)
- znacznik czasu (opcjonalnie)

**Dlaczego strukturalne logowanie:**
- Ułatwia filtrowanie i przeszukiwanie logów
- Zapewnia kontekst dla debugowania
- Może być łatwo zintegrowane z systemami monitorowania

**Faza 2: Klasyfikacja błędu**
Sprawdzić typ błędu i jego komunikat aby zdecydować o odpowiednim kodzie statusu:

**Błąd 404 - Task Not Found:**
Jeśli błąd jest instancją Error i jego message zawiera frazę "not found", to jest to błąd biznesowy oznaczający, że zadanie nie istnieje lub nie należy do użytkownika. Zwrócić:
- Status 404 Not Found
- ErrorDTO z ogólnym komunikatem "Task not found"
- BEZ szczegółów (information disclosure prevention)

**Błąd 500 - Internal Server Error:**
Dla wszystkich innych błędów (błędy bazy danych, błędy sieci, błędy aplikacji) zwrócić:
- Status 500 Internal Server Error
- ErrorDTO z ogólnym komunikatem "Internal server error"
- Pole details TYLKO w środowisku development (import.meta.env.DEV)
- W produkcji NIGDY nie ujawniać szczegółów błędów

**3.6. Formatowanie odpowiedzi HTTP**

**Spójność struktury Response:**
Wszystkie odpowiedzi (sukces i błędy) powinny być tworzone za pomocą konstruktora Response z:
- Pierwszym argumentem: string JSON (JSON.stringify)
- Drugim argumentem: obiekt opcji zawierający:
  - status: kod statusu HTTP
  - headers: obiekt nagłówków z Content-Type: application/json

**Alternatywa - Error Response Factory:**
Dla zmniejszenia duplikacji kodu, można rozważyć utworzenie pomocniczej funkcji createErrorResponse (w utils) która enkapsuluje tworzenie odpowiedzi błędów. To nie jest wymagane w MVP, ale poprawia maintainability.

**3.7. Type Safety i TypeScript**

**Typy dla odpowiedzi:**
Wszystkie obiekty JSON powinny być typowane:
- Obiekt sukcesu: typ TaskDTO
- Obiekty błędów: typ ErrorDTO
- TypeScript zapewni compile-time checking

**Assertions typu:**
Dla błędów w catch, użyć `error instanceof Error` do zawężenia typu przed dostępem do właściwości message.

**3.8. Zgodność z konwencjami projektu**

**Sprawdzić istniejące handlery:**
Przejrzeć inne pliki w src/pages/api (np. tasks.ts, dashboard.ts) i zachować spójność:
- Struktura importów
- Formatowanie odpowiedzi
- Obsługa błędów
- Nazewnictwo zmiennych
- Komentarze (jeśli używane)

**Linting rules:**
Upewnić się, że kod jest zgodny z regułami ESLint projektu:
- Brak unused imports
- Spójne użycie pojedynczych/podwójnych cudzysłowów
- Poprawne formatowanie wcięć (tabs vs spaces)
- Sortowanie importów według konwencji projektu

### Krok 4: Weryfikacja funkcjonalna przez testowanie manualne

**Cel:** Weryfikacja poprawności implementacji przez wykonanie kompleksowego zestawu testów manualnych pokrywających wszystkie scenariusze użycia i błędów.

**Przygotowanie środowiska testowego:**

**4.1. Konfiguracja narzędzi testowych**

**Wybór narzędzia do testowania API:**
Zalecane opcje (wybór jednej):
- **curl** - narzędzie wiersza poleceń, dostępne natywnie na większości systemów, idealne do szybkich testów
- **Postman** - graficzne narzędzie z GUI, łatwiejsze dla mniej technicznych testerów, pozwala na zapisanie kolekcji testów
- **Thunder Client** (VS Code extension) - wbudowane w IDE, wygodne podczas development
- **HTTPie** - bardziej user-friendly alternatywa dla curl

**Generowanie tokenów autoryzacji:**
Przed rozpoczęciem testów należy wygenerować prawidłowy token JWT dla użytkownika testowego:
1. Użyć Supabase Dashboard → Authentication → Users
2. Utworzyć użytkownika testowego (jeśli nie istnieje)
3. Użyć Supabase JavaScript Client do zalogowania i uzyskania access_token
4. Alternatywnie: użyć istniejącej aplikacji frontendowej do zalogowania i skopiowania tokenu z localStorage/sessionStorage

**Przygotowanie danych testowych:**
Utworzyć w bazie danych przynajmniej:
- 2 zadania należące do użytkownika testowego (różne UUID)
- 1 zadanie należące do innego użytkownika (do testu horizontal privilege escalation)
- Zanotować UUID tych zadań do użycia w testach

**4.2. Scenariusz testowy 1: Sukces - pobranie istniejącego zadania**

**Cel:** Weryfikacja happy path - poprawne pobranie zadania należącego do uwierzytelnionego użytkownika.

**Warunki wstępne:**
- Serwer development uruchomiony (npm run dev)
- Znany UUID zadania należącego do użytkownika testowego
- Prawidłowy, ważny token JWT

**Wykonanie:**
Wysłać żądanie GET do endpointu z:
- Prawidłowym UUID w ścieżce URL
- Nagłówkiem Authorization zawierającym Bearer token

**Oczekiwany wynik:**
- Status odpowiedzi: 200 OK
- Content-Type header: application/json
- Body: Obiekt JSON zawierający wszystkie pola TaskDTO:
  - id (UUID zadania)
  - user_id (UUID użytkownika)
  - title (string)
  - description (string lub null)
  - interval_value (liczba 1-999)
  - interval_unit (jeden z: days/weeks/months/years)
  - preferred_day_of_week (liczba 0-6 lub null)
  - next_due_date (data w formacie YYYY-MM-DD)
  - last_action_date (data lub null)
  - last_action_type (completed/skipped lub null)
  - created_at (ISO 8601 timestamp)
  - updated_at (ISO 8601 timestamp)

**Weryfikacja:**
- Porównać zwrócone dane z danymi w bazie (Supabase Dashboard lub SQL query)
- Upewnić się, że user_id w odpowiedzi odpowiada użytkownikowi testowemu
- Sprawdzić poprawność formatowania dat i timestampów

**4.3. Scenariusz testowy 2: Błąd - nieprawidłowy format UUID**

**Cel:** Weryfikacja walidacji parametru URL - odrzucenie nieprawidłowego formatu UUID.

**Warunki wstępne:**
- Serwer development uruchomiony
- Prawidłowy token JWT

**Wykonanie:**
Wysłać żądanie GET z nieprawidłowym UUID w ścieżce, np.:
- Tekst bez struktury UUID: "invalid-uuid", "abc123", "test"
- Liczby: "12345"
- UUID bez myślników: 32 znaki hex bez separatorów
- Zbyt krótki/długi string

**Oczekiwany wynik:**
- Status odpowiedzi: 400 Bad Request
- Content-Type header: application/json
- Body: Obiekt ErrorDTO z:
  - error: "Invalid task ID format"
  - details: "taskId must be a valid UUID" (lub podobny komunikat z Zod)

**Weryfikacja:**
- Upewnić się, że żadne zapytanie do bazy danych nie zostało wykonane (sprawdzić logi Supabase)
- Komunikat błędu powinien być jasny i informować o wymaganym formacie

**4.4. Scenariusz testowy 3: Błąd - brak autoryzacji**

**Cel:** Weryfikacja wymuszenia uwierzytelnienia - odrzucenie żądań bez tokenu.

**Warunki wstępne:**
- Serwer development uruchomiony
- Znany UUID zadania

**Wykonanie:**
Wysłać żądanie GET BEZ nagłówka Authorization, lub z:
- Pustym nagłówkiem Authorization
- Nieprawidłowym formatem (brak prefiksu "Bearer")
- Wygasłym tokenem
- Tokenem z nieprawidłowym podpisem

**Oczekiwany wynik:**
- Status odpowiedzi: 401 Unauthorized
- Content-Type header: application/json
- Body: Obiekt ErrorDTO z:
  - error: "Unauthorized"
  - details: "Valid authentication token required" (opcjonalnie)

**Weryfikacja:**
- Żadne zapytanie do bazy nie powinno być wykonane
- Błąd powinien być zwrócony szybko (bez opóźnienia na query)

**4.5. Scenariusz testowy 4: Błąd - zadanie nie istnieje**

**Cel:** Weryfikacja obsługi przypadku, gdy zadanie o podanym UUID nie istnieje w bazie danych.

**Warunki wstępne:**
- Serwer development uruchomiony
- Prawidłowy token JWT
- UUID w prawidłowym formacie, ale nieistniejący w bazie (np. wszystkie zera)

**Wykonanie:**
Wysłać żądanie GET z UUID, który:
- Ma prawidłowy format (przejdzie walidację Zod)
- Nie odpowiada żadnemu zadaniu w bazie danych

**Oczekiwany wynik:**
- Status odpowiedzi: 404 Not Found
- Content-Type header: application/json
- Body: Obiekt ErrorDTO z:
  - error: "Task not found"
  - BEZ pola details (nie ujawniamy, dlaczego zadanie nie zostało znalezione)

**Weryfikacja:**
- Zapytanie do bazy powinno zostać wykonane (sprawdzić logi)
- Odpowiedź powinna być identyczna jak w scenariuszu 4.5 (information disclosure prevention)

**4.6. Scenariusz testowy 5: Błąd - próba dostępu do zadania innego użytkownika (horizontal privilege escalation)**

**Cel:** Weryfikacja autoryzacji - użytkownik nie może uzyskać dostępu do zadań innych użytkowników.

**Warunki wstępne:**
- Serwer development uruchomiony
- Prawidłowy token JWT użytkownika A
- UUID zadania należącego do użytkownika B

**Wykonanie:**
Wysłać żądanie GET jako użytkownik A do zadania użytkownika B.

**Oczekiwany wynik:**
- Status odpowiedzi: 404 Not Found (NIE 403 Forbidden)
- Content-Type header: application/json
- Body: Obiekt ErrorDTO z:
  - error: "Task not found"
  - IDENTYCZNA odpowiedź jak w scenariuszu 4.5

**Weryfikacja - krytyczne dla bezpieczeństwa:**
- Odpowiedź musi być identyczna z przypadkiem nieistniejącego zadania
- Czas odpowiedzi powinien być podobny (brak timing attacks)
- Użytkownik nie powinien móc określić, czy UUID jest prawidłowy
- Sprawdzić logi bazy - query powinno filtrować po user_id

**4.7. Analiza wyników testów**

Po wykonaniu wszystkich testów, należy:
- Zebrać wyniki w dokumencie (np. checklist w Markdown)
- Dla każdego failed testu - zalogować issue i naprawić
- Przetestować ponownie po naprawach
- Sprawdzić logi serwera pod kątem nieoczekiwanych errorów
- Zweryfikować logi Supabase pod kątem wydajności queries

### Krok 5: Weryfikacja integracji z warstwą middleware

**Cel:** Upewnienie się, że endpoint prawidłowo współpracuje z istniejącym middleware Astro odpowiedzialnym za inicjalizację klienta Supabase.

**Lokalizacja:** Plik `src/middleware/index.ts` - globalny middleware wykonywany przed każdym żądaniem.

**5.1. Analiza kontraktu middleware**

**Odpowiedzialności middleware:**
Middleware powinno wykonywać następujące zadania:
- Ekstrakcję tokenu JWT z nagłówka Authorization
- Inicjalizację klienta Supabase skonfigurowanego z tokenem użytkownika
- Umieszczenie klienta w `context.locals.supabase` dla dostępu w endpointach
- Przekazanie sterowania do route handlera

**Czego middleware NIE powinno robić:**
- Nie powinno odrzucać żądań bez tokenu (to zadanie endpointu)
- Nie powinno weryfikować ważności tokenu (to robi Supabase przy getUser())
- Nie powinno wykonywać logiki biznesowej

**5.2. Weryfikacja wymagań integracji**

**Sprawdzenie 1: Dostępność klienta Supabase**
Zweryfikować, że middleware inicjalizuje `context.locals.supabase` i że obiekt ten zawiera:
- Metodę `from()` do wykonywania zapytań do tabel
- Obiekt `auth` z metodą `getUser()`
- Prawidłową konfigurację (URL i anon key z zmiennych środowiskowych)

**Sprawdzenie 2: Przekazywanie tokenu**
Upewnić się, że middleware:
- Odczytuje nagłówek Authorization z requesta
- Przekazuje token do konstruktora klienta Supabase
- Token jest przekazywany jako session/access_token (nie jako API key)

**Sprawdzenie 3: Type safety**
Zweryfikować, że TypeScript poprawnie typuje:
- `context.locals` powinno mieć pole `supabase`
- Typ `supabase` powinien być `SupabaseClient` z src/db/supabase.client.ts
- Brak błędów kompilacji TypeScript przy dostępie do context.locals.supabase

**5.3. Potencjalne problemy i ich rozwiązania**

**Problem 1: Brak inicjalizacji klienta**
Jeśli middleware nie inicjalizuje klienta, endpoint otrzyma undefined przy dostępie do context.locals.supabase.
Rozwiązanie: Dodać inicjalizację w middleware zgodnie z dokumentacją Supabase + Astro.

**Problem 2: Nieaktualna wersja Supabase Client**
Jeśli wersja @supabase/supabase-js jest niekompatybilna, mogą wystąpić błędy runtime.
Rozwiązanie: Sprawdzić wersję w package.json i zaktualizować jeśli potrzebne.

**Problem 3: Brak typowania dla locals**
Jeśli TypeScript nie rozpoznaje pola supabase w locals, może to wskazywać na brak rozszerzenia typu AstroLocals.
Rozwiązanie: Dodać deklarację typu w src/env.d.ts lub podobnym pliku definicji typów.

**5.4. Testowanie integracji**

**Test manualny:**
W route handlerze dodać tymczasowy console.log przed użyciem context.locals.supabase:
- Sprawdzić czy obiekt jest zdefiniowany
- Sprawdzić czy ma wymagane metody
- Usunąć log po weryfikacji

**Test z błędnym tokenem:**
Wysłać żądanie z nieprawidłowym tokenem i zweryfikować, że:
- Middleware nie rzuca błędu
- Endpoint otrzymuje klienta Supabase
- Błąd jest wykrywany dopiero przy wywołaniu getUser() w endpoincie

**5.5. Dokumentacja zależności**

W komentarzach kodu (lub dokumentacji) zaznaczyć, że:
- Endpoint wymaga działającego middleware inicjalizującego Supabase
- Middleware musi być skonfigurowane jako pierwszy w łańcuchu (before any endpoint logic)
- Zmiany w middleware mogą wymagać aktualizacji endpointów

### Krok 6: Zapewnienie jakości kodu poprzez linting i formatowanie

**Cel:** Weryfikacja i poprawa jakości kodu zgodnie ze standardami projektu, wykorzystując narzędzia automatycznej analizy i formatowania.

**6.1. Analiza statyczna kodu (Linting)**

**Uruchomienie lintera:**
Wykonać komendę lintingu zdefiniowaną w package.json (prawdopodobnie npm run lint lub podobna). Linter (prawdopodobnie ESLint) przeanalizuje kod pod kątem:
- Potencjalnych błędów logicznych
- Naruszeń konwencji kodowania
- Nieużywanych importów i zmiennych
- Problemów z type safety
- Niezgodności z regułami zdefiniowanymi w eslint.config.js

**Kategorie błędów do naprawy:**

**Błędy krytyczne (errors):**
Muszą być naprawione przed commitowaniem:
- Nieużywane importy - usunąć niepotrzebne deklaracje import
- Nieużywane zmienne - usunąć lub oznacz prefixem underscore jeśli są celowo nieużywane
- Niezgodność typów - naprawić rzutowania i deklaracje typów
- Brakujące return statements
- Async functions bez await

**Ostrzeżenia (warnings):**
Powinny być przeanalizowane i naprawione gdy zasadne:
- Zbyt złożone funkcje (wysokie cognitive complexity) - rozważ refactoring
- Brak komentarzy JSDoc dla publicznych API
- Nieoptymalne konstrukcje (np. zagnieżdżone if'y zamiast early returns)

**Automatyczna naprawa:**
Wiele błędów może być naprawionych automatycznie. Jeśli dostępna jest komenda npm run lint:fix (lub podobna), należy ją wykonać. Automatycznie naprawia:
- Formatowanie odstępów i wcięć
- Sortowanie importów
- Dodawanie/usuwanie średników
- Konwersję cudzysłowów (single vs double)

**Po automatycznej naprawie:**
Przejrzeć zmiany wprowadzone przez auto-fix. Upewnić się, że:
- Logika nie została zmieniona
- Zmiany są zgodne z intencją
- Nie wprowadzono nowych błędów

**6.2. Formatowanie kodu**

**Prettier (jeśli używany w projekcie):**
Jeśli projekt używa Prettier, wykonać komendę formatowania (npm run format lub podobną). Prettier zapewnia:
- Spójne formatowanie wcięć (tabs vs spaces)
- Jednolite łamanie linii
- Spójne użycie nawiasów i przecinków
- Maksymalną długość linii zgodną z konfiguracją

**Konfiguracja formatowania:**
Sprawdzić plik .prettierrc lub podobny, aby poznać standardy projektu:
- Tab width (najczęściej 2 lub 4 spacje)
- Single vs double quotes
- Trailing commas
- Semi-colons (obecność lub brak)
- Print width (max długość linii)

**Edytor config:**
Upewnić się, że ustawienia edytora (VS Code, WebStorm, etc.) są zgodne z konfiguracją projektu. Sprawdzić plik .editorconfig jeśli istnieje.

**6.3. Weryfikacja specyficzna dla implementowanych plików**

**Plik validation.utils.ts:**
- Spójność nazewnictwa schematów (wszystkie z suffiksem "Schema")
- Alfabetyczne sortowanie eksportów
- Spójne użycie komentarzy (jeśli inne schematy je mają)
- Poprawne formatowanie łańcuchów Zod

**Plik task.service.ts:**
- Kompletna dokumentacja JSDoc dla nowej metody
- Spójne formatowanie z istniejącymi metodami
- Poprawne typowanie parametrów i return types
- Brak console.log (chyba że są częścią istniejącego kodu)

**Plik [taskId].ts:**
- Prawidłowa struktura eksportów (prerender, GET)
- Poprawne importy (ścieżki relatywne vs absolute)
- Spójne formatowanie bloków try-catch
- Komentarze inline (jeśli są używane w innych handlerach)

**6.4. Sprawdzenie reguł specyficznych dla projektu**

**Cursor Rules (jeśli istnieją):**
Przejrzeć plik .cursor/rules lub .ai/rules.md aby sprawdzić czy kod jest zgodny z:
- Preferencjami architektonicznymi projektu
- Wzorcami nazewnictwa
- Wzorcami obsługi błędów
- Strukturą komentarzy

**TypeScript strict mode:**
Jeśli projekt używa strict mode w tsconfig.json, upewnić się, że:
- Wszystkie typy są explicite zdefiniowane
- Brak użycia `any` (chyba że absolutnie konieczne)
- Nullable types są poprawnie obsłużone
- Wszystkie obietnice (Promises) są awaited lub zwracane

**6.5. Finalna weryfikacja**

**Compile check:**
Uruchomić kompilację TypeScript (npm run build lub tsc --noEmit) aby upewnić się, że:
- Brak błędów kompilacji
- Wszystkie typy są poprawne
- Importy są rozwiązywalne

**Zerowe tolerancje dla:**
- Błędów ESLint typu "error"
- Błędów kompilacji TypeScript
- Nierozwiązanych importów
- Unused variables/imports w produkcyjnym kodzie

**Akceptowalne (do review):**
- Warnings ESLint jeśli są uzasadnione (dodać komentarz eslint-disable z wyjaśnieniem)
- Dłuższe funkcje jeśli nie da się ich rozsądnie podzielić
- Pewien poziom complexity jeśli jest niezbędny dla logiki biznesowej

### Krok 7: Tworzenie dokumentacji API dla programistów (opcjonalnie)

**Cel:** Stworzenie dokumentacji użytkowej dla innych programistów (frontend, mobile, integracje) zawierającej praktyczne przykłady użycia endpointu.

**Lokalizacja:** Sugerowany plik `.ai/api-examples-get-task-by-id.md` lub integracja z istniejącym systemem dokumentacji API.

**7.1. Struktura dokumentacji**

**Sekcja 1: Przegląd endpointu**
Krótki opis biznesowy:
- Co robi endpoint (pobranie pojedynczego zadania)
- Kiedy go używać (wyświetlanie szczegółów, edycja)
- Ograniczenia (tylko własne zadania)

**Sekcja 2: Request specification**
Szczegóły techniczne żądania:
- Pełna ścieżka URL z przykładowym UUID
- Wymagane nagłówki (Authorization)
- Format tokenu (Bearer JWT)
- Brak query parameters ani body

**Sekcja 3: Success response**
Przykład pomyślnej odpowiedzi z wyjaśnieniem każdego pola:
- Struktura JSON response
- Opis każdego pola TaskDTO
- Typy wartości i ich formaty (daty, enums, nullable fields)
- Przykładowe wartości realistyczne (nie "test" czy "string")

**Sekcja 4: Error responses**
Dla każdego kodu błędu:
- Kod HTTP i jego znaczenie
- Przykład response body
- Przyczyny wystąpienia błędu
- Jak naprawić problem po stronie klienta

**Sekcja 5: Code examples**
Przykłady w popularnych językach/frameworkach:
- JavaScript/TypeScript (fetch, axios)
- curl (dla testów manualnych)
- Python (requests library) - jeśli relevant
- Przykłady obsługi błędów w każdym języku

**Sekcja 6: Common pitfalls**
Najczęstsze błędy programistów:
- Zapominanie o prefiksie "Bearer " w Authorization
- Używanie nieprawidłowego formatu UUID
- Próba dostępu do zadań innych użytkowników (404 nie oznacza nieistniejącego)
- Oczekiwanie 403 zamiast 404 dla horizontal privilege escalation

**7.2. Przykłady praktyczne**

**Przykład 1: Pobranie zadania z obsługą wszystkich błędów**
Kompletny przykład pokazujący:
- Konstrukcję URL z dynamicznym taskId
- Dodawanie tokenu z localStorage/state
- Try-catch dla błędów sieci
- Switch/if dla różnych kodów statusu
- Wyświetlanie odpowiednich komunikatów użytkownikowi

**Przykład 2: Integracja z formularzem edycji**
Use case: Pobranie danych zadania do formularza:
- Wywołanie endpointu przy montowaniu komponentu
- Loading state podczas fetch
- Wypełnienie formularza danymi z response
- Obsługa przypadku gdy zadanie zostało usunięte (404)

**Przykład 3: Refresh danych po akcji**
Use case: Odświeżenie danych po complete/skip:
- Wykonanie akcji (POST do /complete)
- Refresh przez ponowne GET
- Optymistyczne updates vs pesymistyczne

**7.3. Interaktywna dokumentacja (advanced)**

**OpenAPI/Swagger (jeśli używane):**
Dodać specyfikację endpointu w formacie OpenAPI 3.0:
- Path z parametrem taskId
- Security scheme (Bearer Auth)
- Response schemas używając $ref do TaskDTO
- Error schemas dla wszystkich kodów błędów
- Przykłady (examples) dla każdego response

**Postman Collection:**
Utworzyć kolekcję Postman zawierającą:
- Request template z {{taskId}} variable
- Pre-request script do ustawienia tokenu
- Tests sprawdzające poprawność response
- Dokumentację w description każdego requesta

**7.4. Wersjonowanie dokumentacji**

**Oznaczenie wersji API:**
Jeśli API jest wersjonowane (np. /api/v1/), zaznaczyć:
- W jakiej wersji API endpoint jest dostępny
- Czy będą breaking changes w przyszłych wersjach
- Deprecation notices jeśli planowane

**Changelog:**
Prowadzić changelog dla endpointu:
- Data wprowadzenia (initial release)
- Zmiany w response structure (dodane/usunięte pola)
- Zmiany w błędach (nowe kody statusu)
- Bug fixes które mogą wpłynąć na klientów

**7.5. Integracja z istniejącą dokumentacją**

**Sprawdzić czy projekt ma:**
- Centralny plik dokumentacji API (README.md, DOCS.md)
- System dokumentacji (Docusaurus, VitePress, etc.)
- Auto-generated docs (TypeDoc, JSDoc)

**Dodać linki:**
- Z głównej dokumentacji do tego endpointu
- Cross-references do powiązanych endpointów (POST /tasks, DELETE /tasks/{id})
- Linki do definicji typów (TaskDTO w types.ts)

### Krok 8: Kompleksowa weryfikacja przez review checklist

**Cel:** Systematyczna weryfikacja wszystkich aspektów implementacji przed oznaczeniem zadania jako ukończonego.

**8.1. Weryfikacja funkcjonalności biznesowej**

**Scenariusz 1: Happy path**
- [ ] Endpoint zwraca obiekt JSON z wszystkimi polami TaskDTO
- [ ] Zwrócone dane odpowiadają faktycznym danym w bazie (weryfikacja przez Supabase Dashboard)
- [ ] Wszystkie pola mają poprawne typy (stringi nie są liczbami, daty są w ISO format)
- [ ] Nullable fields (description, preferred_day_of_week, last_action_date, last_action_type) są poprawnie reprezentowane

**Scenariusz 2: Walidacja wejścia**
- [ ] Nieprawidłowy format UUID zwraca 400 Bad Request
- [ ] Komunikat błędu jest czytelny i wskazuje na problem
- [ ] Walidacja działa dla różnych nieprawidłowych formatów (za krótki, za długi, nieprawidłowe znaki)
- [ ] Prawidłowy UUID v4 przechodzi walidację bez problemów

**Scenariusz 3: Authorization i Authentication**
- [ ] Brak tokenu zwraca 401 Unauthorized
- [ ] Nieprawidłowy token zwraca 401 Unauthorized
- [ ] Wygasły token zwraca 401 Unauthorized
- [ ] Token innego użytkownika zwraca 404 dla zadań pierwszego użytkownika (nie 403)

**Scenariusz 4: Not Found**
- [ ] Nieistniejący UUID zwraca 404 Not Found
- [ ] UUID zadania innego użytkownika zwraca 404 Not Found
- [ ] Oba przypadki 404 mają identyczną odpowiedź (timing i content)

**8.2. Weryfikacja bezpieczeństwa**

**Authentication layer:**
- [ ] Token JWT jest wymagany - nie można ominąć autoryzacji
- [ ] Middleware poprawnie przekazuje token do Supabase client
- [ ] Weryfikacja tokenu odbywa się przed dostępem do danych
- [ ] Tokeny są przesyłane tylko przez HTTPS w produkcji (sprawdzić konfigurację serwera)

**Authorization layer:**
- [ ] Zapytanie do bazy ZAWSZE filtruje po user_id
- [ ] Nie ma sposobu aby ominąć filtr user_id w logice aplikacji
- [ ] TaskService.getTaskById przyjmuje userId jako obowiązkowy parametr
- [ ] Brak backdoorów lub debug endpoints omijających autoryzację

**Row Level Security:**
- [ ] RLS policies są aktywne na tabeli tasks w Supabase
- [ ] Polityki RLS wymuszają filtrowanie po user_id niezależnie od kodu aplikacji
- [ ] Testowanie bezpośrednich zapytań SQL pokazuje działanie RLS
- [ ] RLS policy logowanie jest włączone (dla audytu)

**Information Disclosure Prevention:**
- [ ] Odpowiedź 404 nie różni się dla nieistniejącego vs cudze zadanie
- [ ] Error messages nie zawierają wrażliwych informacji (stack traces, internal errors)
- [ ] Pole details w ErrorDTO jest puste w produkcji
- [ ] Logi serwera nie zawierają tokenów ani innych sekretów

**Input Validation:**
- [ ] UUID jest walidowany przed jakąkolwiek operacją na bazie
- [ ] Walidacja używa Zod (type-safe runtime validation)
- [ ] Brak możliwości SQL injection (Supabase parametryzuje queries)
- [ ] Brak możliwości XSS (JSON responses, nie HTML)

**8.3. Weryfikacja jakości kodu**

**TypeScript type safety:**
- [ ] Brak błędów kompilacji TypeScript (tsc --noEmit passes)
- [ ] Wszystkie typy są explicite zadeklarowane (nie ma implicit any)
- [ ] Używane są właściwe typy DTO z types.ts
- [ ] Destructuring i type assertions są bezpieczne
- [ ] Promise types są poprawnie obsługiwane (async/await)

**ESLint compliance:**
- [ ] Brak errors z ESLint
- [ ] Wszystkie warnings są uzasadnione lub naprawione
- [ ] Brak unused imports
- [ ] Brak unused variables
- [ ] Kod przestrzega configured style guidelines

**Code organization:**
- [ ] Imports są posortowane logicznie (types, libraries, local modules)
- [ ] Funkcje mają jasno określoną pojedynczą odpowiedzialność
- [ ] Poziom zagnieżdżenia nie przekracza 3-4 poziomów
- [ ] Używane są early returns zamiast głęboko zagnieżdżonych if-ów
- [ ] Magic numbers i stringi są zastąpione stałymi lub pochodzą z konfig

**Documentation:**
- [ ] Publiczne metody mają pełną dokumentację JSDoc
- [ ] @param tags opisują wszystkie parametry
- [ ] @returns tag opisuje zwracaną wartość
- [ ] @throws tag dokumentuje możliwe wyjątki
- [ ] Komentarze inline wyjaśniają nieoczywiste decyzje (dlaczego, nie co)

**8.4. Weryfikacja obsługi błędów**

**Error handling architecture:**
- [ ] Try-catch block obejmuje całą logikę biznesową w handlerze
- [ ] Wszystkie błędy są przechwytywane (brak unhandled promise rejections)
- [ ] Każdy typ błędu ma dedykowaną obsługę
- [ ] Fallback 500 Internal Server Error dla nieoczekiwanych błędów

**Logging strategy:**
- [ ] Błędy są logowane z odpowiednim poziomem (error vs warn vs info)
- [ ] Logi zawierają kontekst (taskId, userId) dla debugowania
- [ ] Stack traces są logowane dla błędów 500
- [ ] Logi są strukturalne (obiekty JSON, nie plain stringi)
- [ ] Sensitive data nie są logowane (tokeny, hasła)

**Client-facing errors:**
- [ ] Każdy kod błędu (400, 401, 404, 500) ma odpowiedni ErrorDTO
- [ ] Komunikaty błędów są zrozumiałe dla programistów API
- [ ] Błędy nie ujawniają wewnętrznej implementacji
- [ ] Pole details jest warunkowe (tylko dev environment)

**8.5. Weryfikacja wydajności**

**Database queries:**
- [ ] Używane są indeksy (PRIMARY KEY na id, FOREIGN KEY na user_id)
- [ ] Query jest zoptymalizowane (select *, eq, single)
- [ ] Brak N+1 problem (tylko jedno zapytanie na request)
- [ ] Query time < 100ms w typowych warunkach (sprawdzić Supabase metrics)

**Response times:**
- [ ] P50 response time < 100ms
- [ ] P95 response time < 200ms
- [ ] P99 response time < 500ms
- [ ] Brak memory leaks (długie testy obciążeniowe nie pokazują wzrostu pamięci)

**Scalability:**
- [ ] Endpoint jest stateless (brak shared state między requestami)
- [ ] Connection pooling działa poprawnie (Supabase pooler)
- [ ] Endpoint może być skalowany horizontal (wiele instancji)
- [ ] Brak contentious locks na bazie danych

**8.6. Weryfikacja zgodności z projektem**

**Architectural consistency:**
- [ ] Separacja concerns (handler → service → database)
- [ ] Dependency injection używane poprawnie (Supabase client)
- [ ] Naming conventions zgodne z innymi plikami projektu
- [ ] File structure zgodna z konwencjami Astro

**API design consistency:**
- [ ] Response format zgodny z innymi endpointami
- [ ] Error handling pattern zgodny z innymi endpointami
- [ ] HTTP status codes używane konsekwentnie
- [ ] TaskDTO używane zgodnie z innymi endpointami (getTasks, dashboard)

**Testing readiness:**
- [ ] Logika biznesowa jest w service (łatwa do testowania jednostkowego)
- [ ] Handler jest cienką warstwą (łatwy do testowania integracyjnego)
- [ ] Zależności są injectable (można mockować Supabase)
- [ ] Deterministyczne zachowanie (brak random, current time jako input)

**8.7. Final sign-off checklist**

Przed oznaczeniem jako "Done", wszystkie poniższe muszą być ✅:
- [ ] Wszystkie testy manualne przeszły (Krok 4)
- [ ] Linter nie zwraca błędów (Krok 6)
- [ ] Code review został przeprowadzony (jeśli wymagany w projekcie)
- [ ] Dokumentacja jest aktualna (jeśli Krok 7 wykonany)
- [ ] Wszystkie checklisty powyżej są spełnione
- [ ] Nie ma known issues ani TODO comments w kodzie
- [ ] Commit message jest opisowy i referencuje task/ticket

### Krok 9: Przygotowanie do wdrożenia produkcyjnego

**Cel:** Zapewnienie, że endpoint jest gotowy do działania w środowisku produkcyjnym z odpowiednią konfiguracją bezpieczeństwa, monitoringu i wydajności.

**9.1. Konfiguracja zmiennych środowiskowych**

**Weryfikacja zmiennych Supabase:**
Przed deployment upewnić się, że produkcyjne environment variables są poprawnie skonfigurowane:

**SUPABASE_URL:**
- Musi wskazywać na produkcyjną instancję Supabase (nie dev/staging)
- Format: https://[project-ref].supabase.co
- Weryfikacja: URL nie zawiera "localhost" ani portów development

**SUPABASE_ANON_KEY:**
- Musi być kluczem produkcyjnym (innym niż dev)
- Klucz "anon" (public), nie "service_role" (nie powinien mieć pełnych uprawnień)
- Weryfikacja: Klucz różni się od tego w .env.local
- Bezpieczeństwo: Klucz nie jest zakodowany na stałe w kodzie

**Sekrety vs public variables:**
- SUPABASE_URL może być public (client-side też go potrzebuje)
- SUPABASE_ANON_KEY jest semi-public (używany w client, ale powinien być chroniony przez RLS)
- NIGDY nie commitować produkcyjnych kluczy do repo
- Używać secret managementu platformy (Vercel Env Vars, AWS Secrets Manager, etc.)

**Weryfikacja dostępu:**
Przetestować połączenie z produkcyjną bazą używając zmiennych środowiskowych:
- Wykonać prostą query do Supabase (select count)
- Zweryfikować że RLS policies działają
- Upewnić się, że connection pooling jest aktywny

**9.2. Weryfikacja konfiguracji bazy danych produkcyjnej**

**Row Level Security (RLS) Policies:**
Krytyczne dla bezpieczeństwa - zweryfikować w Supabase Dashboard dla produkcji:
- RLS jest włączone (ENABLE RLS) na tabeli tasks
- Policy dla SELECT istnieje i filtruje po auth.uid() = user_id
- Policy jest aktywna (ENABLED)
- Testowanie: Spróbować zapytania SQL jako różni użytkownicy

**Indeksy bazy danych:**
Weryfikować że wszystkie wymagane indeksy istnieją w produkcji:
- PRIMARY KEY na tasks.id (powinien istnieć automatycznie)
- INDEX na tasks.user_id (dla wydajności filtrowania)
- FOREIGN KEY index tasks.user_id → auth.users.id

**Wykonanie polecenia w Supabase SQL Editor:**
Sprawdzić obecność indeksów i ich statystyki użycia. Zweryfikować execution plany dla typowych queries - powinny pokazywać Index Scan, nie Sequential Scan.

**Connection limits:**
- Sprawdzić limity połączeń dla planu Supabase (Free: 60, Pro: 200)
- Upewnić się, że connection pooler (PgBouncer) jest włączony
- Konfiguracja pool mode: transaction (dla API endpoints)

**Backup i recovery:**
- Zweryfikować, że automated backups są włączone
- Sprawdzić retention policy (ile dni histor ii)
- Przetestować restore procedure (w staging, nie produkcji!)

**9.3. Konfiguracja monitoringu i observability**

**Application Performance Monitoring (APM):**
Zintegrować narzędzie monitoringu jeśli nie jest jeszcze zrobione:
- Sentry dla error tracking i alerts
- DataDog/New Relic dla performance monitoring
- Grafana + Prometheus dla metrics (jeśli self-hosted)

**Metryki do śledzenia:**
Skonfigurować dashboardy zawierające:

**Request metrics:**
- Request rate (requests per second/minute)
- Success rate (% of 2xx responses)
- Error rates broken down by status code (% of 4xx, 5xx)
- Response time percentiles (p50, p95, p99)

**Database metrics:**
- Query execution time
- Connection pool utilization
- Slow query alerts (>500ms)
- Database CPU and memory usage

**Business metrics:**
- Number of unique users hitting endpoint
- Most accessed tasks
- Geographic distribution of requests

**Alerty do skonfigurowania:**

**Critical alerts (PagerDuty/Slack):**
- Error rate > 5% przez 5 minut
- P95 response time > 1000ms przez 5 minut
- Database connection pool > 90% przez 2 minuty
- All endpoints down (5xx for all requests)

**Warning alerts (Email):**
- Error rate > 1% przez 10 minut
- P95 response time > 500ms przez 10 minut
- Unusual traffic spike (+500% from baseline)

**Structured logging:**
Upewnić się, że logi w produkcji są:
- W formacie JSON dla łatwego parsowania
- Zawierają correlation IDs (request ID dla trace)
- Są agregowane w centralnym systemie (CloudWatch, Elasticsearch)
- Mają odpowiednie retention policy (30-90 dni)

**Log levels w produkcji:**
- console.error() dla błędów 500 i nieoczekiwanych sytuacji
- console.warn() dla błędów 400, 401 (potencjalne ataki)
- console.info() dla błędów 404 (normalna operacja)
- console.debug() wyłączone w produkcji (lub bardzo ograniczone)

**9.4. Implementacja rate limiting i protection**

**Rate limiting strategy:**
Implementować na poziomie infrastruktury (przed Astro):

**Per-user rate limiting:**
- Identyfikacja przez user_id z tokenu JWT
- Limit: 100-200 requests per minute per user
- Response: 429 Too Many Requests z header Retry-After
- Whitelist dla internal services/admins

**Per-IP rate limiting:**
- Ochrona przed DDoS i brute force
- Limit: 1000 requests per minute per IP
- Bardziej liberalny niż per-user (bo NAT, corporate proxies)

**Global rate limiting:**
- Ochrona przed overload całego systemu
- Limit bazowany na capacity serwera
- Automatic scaling trigger jeśli limit często osiągany

**Implementacja:**
- API Gateway (AWS API Gateway, Azure API Management)
- Load Balancer (nginx rate limiting, Cloudflare)
- Middleware Astro (mniej preferowane - obciąża aplikację)

**DDoS protection:**
- Cloudflare jako proxy (automatic DDoS mitigation)
- WAF rules dla common attack patterns
- Geoblocking jeśli aplikacja ma known geographic scope

**9.5. HTTPS i transport security**

**TLS/SSL configuration:**
Zweryfikować w production environment:
- HTTPS wymuszony (HTTP redirects to HTTPS)
- TLS 1.2+ (TLS 1.0, 1.1 disabled)
- Silne cipher suites
- Valid SSL certificate (nie self-signed, nie expired)

**Security headers:**
Dodać w konfiguracji serwera lub Astro middleware:
- Strict-Transport-Security (HSTS): max-age=31536000; includeSubDomains
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Content-Security-Policy (jeśli applicable)

**CORS policy:**
Jeśli endpoint będzie wywoływany z browser frontend:
- Skonfigurować whitelist dozwolonych origins
- NIE używać wildcard (*) w produkcji
- Access-Control-Allow-Credentials: true (jeśli cookies)

**9.6. Deployment checklist**

**Pre-deployment verification:**
- [ ] Wszystkie testy przeszły w staging environment
- [ ] Environment variables są skonfigurowane w production
- [ ] RLS policies są aktywne w produkcyjnej bazie
- [ ] Indeksy istnieją i są używane
- [ ] Monitoring i alerty są skonfigurowane
- [ ] Rate limiting jest włączone
- [ ] HTTPS jest wymuszony
- [ ] Backup policy jest aktywna

**Deployment strategy:**
- Blue-green deployment lub canary release jeśli możliwe
- Deploy w godzinach niskiego trafficu
- Rollback plan przygotowany
- Health check endpoint działa

**Post-deployment verification:**
- [ ] Endpoint responds na produkcyjnym URL
- [ ] Health check zwraca 200 OK
- [ ] Sample request z produkcyjnym tokenem działa
- [ ] Monitoring pokazuje metryki (requesty wpływają)
- [ ] Logi są widoczne w agregatorze
- [ ] Alerty nie są triggeredowane
- [ ] Database connections są w healthy range

**Smoke testing w produkcji:**
Po deployment wykonać kilka requests:
- Happy path (prawidłowy token + taskId)
- 400 error (nieprawidłowy UUID)
- 404 error (nieistniejący task)
- Zweryfikować że wszystkie zwracają oczekiwane responses

**9.7. Rollback plan**

**W przypadku krytycznych problemów:**

**Natychmiastowy rollback jeśli:**
- Error rate > 20%
- Endpoint nie odpowiada (timeouts)
- Security vulnerability odkryta
- Data corruption w bazie

**Procedura rollback:**
1. Przywrócić poprzednią wersję kodu (revert deploy)
2. Zweryfikować że poprzednia wersja działa
3. Komunikacja do zespołu o rollback
4. Post-mortem analysis problemu
5. Fix w dev → staging → production (proper cycle)

**Partial rollback (feature flag):**
Jeśli nowy endpoint powoduje problemy, ale reszta działa:
- Disable routing do nowego endpointu
- Zwracać 503 Service Unavailable
- Zachować kod w miejscu do debugging

## 10. Podsumowanie

Endpoint `GET /api/tasks/{taskId}` jest prostym, ale kompletnym przykładem RESTful API endpoint z pełną obsługą:
- ✅ Autoryzacji i autentykacji
- ✅ Walidacji danych wejściowych
- ✅ Bezpiecznego dostępu do zasobów (tylko własne zadania)
- ✅ Kompletnej obsługi błędów
- ✅ Optymalnej wydajności zapytań

Implementacja wykorzystuje istniejące wzorce w projekcie (TaskService, Zod validation, Supabase client) i jest spójna z innymi endpointami API.

