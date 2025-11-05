# API Endpoint Implementation Plan: GET /api/tasks/dashboard

## 1. Przegląd punktu końcowego

Endpoint `GET /api/tasks/dashboard` ma na celu dostarczenie skonsolidowanych danych dla widoku dashboardu użytkownika. Zwraca on:

- Listę zadań przeterminowanych (overdue)
- Listę zadań nadchodzących w ciągu najbliższych 7 dni (upcoming)
- Najbliższe zadanie w przyszłości (next_task), jeśli nie ma zadań overdue lub upcoming
- Podsumowanie statystyk (summary)

Endpoint ten agreguje dane z wielu źródeł i wykonuje kalkulacje na poziomie zapytań bazodanowych dla optymalnej wydajności.

### Cel biznesowy

Zapewnienie użytkownikowi szybkiego przeglądu statusu jego zadań cyklicznych, z naciskiem na zadania wymagające pilnej uwagi (przeterminowane) oraz te, które wkrótce będą wymagały działania (nadchodzące).

---

## 2. Szczegóły żądania

### Metoda HTTP

`GET`

### Struktura URL

```
GET /api/tasks/dashboard
```

### Parametry

#### Headers (wymagane)

| Nazwa           | Typ      | Opis                                             |
| --------------- | -------- | ------------------------------------------------ |
| `Authorization` | `string` | Bearer token w formacie: `Bearer {access_token}` |

#### Query Parameters

Brak parametrów query - endpoint zwraca pełne dane dashboardu dla zalogowanego użytkownika.

#### Request Body

Brak - metoda GET nie przyjmuje body.

### Przykładowe żądanie

```http
GET /api/tasks/dashboard HTTP/1.1
Host: example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 3. Wykorzystywane typy

Wszystkie typy są już zdefiniowane w `src/types.ts`:

### Response DTOs

#### `DashboardDTO` (główny typ odpowiedzi)

```typescript
export interface DashboardDTO {
  overdue: TaskWithDaysOverdueDTO[];
  upcoming: TaskWithDaysUntilDueDTO[];
  next_task: NextTaskDTO | null;
  summary: DashboardSummaryDTO;
}
```

#### `TaskWithDaysOverdueDTO`

```typescript
export type TaskWithDaysOverdueDTO = TaskDTO & {
  days_overdue: number; // CURRENT_DATE - next_due_date
};
```

#### `TaskWithDaysUntilDueDTO`

```typescript
export type TaskWithDaysUntilDueDTO = TaskDTO & {
  days_until_due: number; // next_due_date - CURRENT_DATE
};
```

#### `NextTaskDTO`

```typescript
export type NextTaskDTO = Pick<Task, "id" | "title" | "next_due_date"> & {
  days_until_due: number;
};
```

#### `DashboardSummaryDTO`

```typescript
export interface DashboardSummaryDTO {
  total_overdue: number;
  total_upcoming: number;
  total_tasks: number;
}
```

### Error DTOs

#### `ErrorDTO`

```typescript
export interface ErrorDTO {
  error: string;
  details?: string;
}
```

---

## 4. Szczegóły odpowiedzi

### Success Response: 200 OK

#### Headers

```
Content-Type: application/json
```

#### Body

```json
{
  "overdue": [
    {
      "id": "uuid-1",
      "user_id": "uuid-user",
      "title": "Change water filter",
      "description": "Replace water filter in refrigerator",
      "interval_value": 6,
      "interval_unit": "months",
      "preferred_day_of_week": 6,
      "next_due_date": "2025-10-10",
      "last_action_date": "2025-04-10",
      "last_action_type": "completed",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-04-10T00:00:00Z",
      "days_overdue": 5
    }
  ],
  "upcoming": [
    {
      "id": "uuid-2",
      "user_id": "uuid-user",
      "title": "Car inspection",
      "description": null,
      "interval_value": 1,
      "interval_unit": "years",
      "preferred_day_of_week": null,
      "next_due_date": "2025-10-20",
      "last_action_date": null,
      "last_action_type": null,
      "created_at": "2024-10-20T00:00:00Z",
      "updated_at": "2024-10-20T00:00:00Z",
      "days_until_due": 5
    }
  ],
  "next_task": {
    "id": "uuid-3",
    "title": "Replace smoke detector batteries",
    "next_due_date": "2025-11-15",
    "days_until_due": 31
  },
  "summary": {
    "total_overdue": 1,
    "total_upcoming": 1,
    "total_tasks": 25
  }
}
```

#### Uwagi do struktury odpowiedzi:

- **overdue**: Sortowane rosnąco po `next_due_date` (najstarsze przeterminowane zadania na początku)
- **upcoming**: Sortowane rosnąco po `next_due_date` (najbliższe zadania na początku)
- **next_task**: Zwracane tylko gdy `overdue` i `upcoming` są puste. Null w przeciwnym wypadku.
- **days_overdue**: Zawsze liczba dodatnia reprezentująca liczbę dni opóźnienia
- **days_until_due**: Zawsze liczba dodatnia reprezentująca liczbę dni do terminu

### Error Responses

#### 401 Unauthorized

Zwracane gdy:

- Brak nagłówka `Authorization`
- Nieprawidłowy format tokena (brak prefiksu "Bearer")
- Token wygasły lub nieprawidłowy

```json
{
  "error": "Authorization header is missing"
}
```

lub

```json
{
  "error": "Invalid or expired token"
}
```

#### 500 Internal Server Error

Zwracane gdy wystąpi nieoczekiwany błąd po stronie serwera:

```json
{
  "error": "Internal server error",
  "details": "An unexpected error occurred while retrieving dashboard data"
}
```

---

## 5. Przepływ danych

### Architektura warstwowa

```
Client Request
    ↓
[API Endpoint Layer]
└── src/pages/api/tasks/dashboard.ts (GET handler)
    ↓
[Authentication Layer]
└── authenticateUser() - weryfikacja JWT token
    ↓
[Service Layer]
└── TaskService.getDashboardData(userId)
    ↓
[Data Access Layer]
└── Supabase Client (Query Builder)
    ↓
[Database Layer]
└── PostgreSQL Database (tasks table)
    ↓
[Response Transformation]
└── Format do DashboardDTO
    ↓
Client Response (JSON)
```

### Szczegółowy przepływ wykonania

#### Krok 1: Odbieranie żądania

1. Astro odbiera żądanie `GET /api/tasks/dashboard`
2. Middleware (`src/middleware/index.ts`) dodaje `supabaseClient` do `context.locals`

#### Krok 2: Uwierzytelnianie

1. Wywołanie `authenticateUser(request, supabase)`
2. Weryfikacja obecności nagłówka `Authorization`
3. Ekstrakcja tokena Bearer
4. Walidacja tokena przez `supabase.auth.getUser(token)`
5. Zwrócenie obiektu `User` lub błędu 401

#### Krok 3: Logika biznesowa (TaskService)

1. Utworzenie instancji `TaskService(supabase)`
2. Wywołanie `taskService.getDashboardData(user.id)`
3. Wykonanie zapytań do bazy danych:

   **Zapytanie A: Overdue Tasks**

   ```typescript
   // Pseudo-SQL reprezentacja
   SELECT *, (CURRENT_DATE - next_due_date) as days_overdue
   FROM tasks
   WHERE user_id = $userId
     AND next_due_date < CURRENT_DATE
   ORDER BY next_due_date ASC
   ```

   **Zapytanie B: Upcoming Tasks**

   ```typescript
   // Pseudo-SQL reprezentacja
   SELECT *, (next_due_date - CURRENT_DATE) as days_until_due
   FROM tasks
   WHERE user_id = $userId
     AND next_due_date >= CURRENT_DATE
     AND next_due_date <= CURRENT_DATE + INTERVAL '7 days'
   ORDER BY next_due_date ASC
   ```

   **Zapytanie C: Next Task (warunkowo)**

   ```typescript
   // Wykonywane tylko gdy overdue.length === 0 && upcoming.length === 0
   SELECT id, title, next_due_date, (next_due_date - CURRENT_DATE) as days_until_due
   FROM tasks
   WHERE user_id = $userId
     AND next_due_date > CURRENT_DATE + INTERVAL '7 days'
   ORDER BY next_due_date ASC
   LIMIT 1
   ```

   **Zapytanie D: Total Count**

   ```typescript
   // Zliczenie wszystkich zadań użytkownika
   SELECT COUNT(*) as total_tasks
   FROM tasks
   WHERE user_id = $userId
   ```

4. Konstruowanie obiektu `DashboardDTO` z wyników zapytań

#### Krok 4: Konstrukcja odpowiedzi

1. Serializacja `DashboardDTO` do JSON
2. Ustawienie odpowiednich headers (Content-Type)
3. Zwrócenie Response z kodem 200

#### Krok 5: Obsługa błędów

1. Try-catch opakowuje całą logikę
2. Błędy logowane do `console.error()`
3. Zwrócenie generycznego błędu 500 do klienta

### Optymalizacje wydajności

#### Strategia wykonania zapytań

- **Opcja 1 (rekomendowana)**: Sekwencyjne zapytania z early return dla next_task
  - Zapytanie overdue
  - Zapytanie upcoming
  - Jeśli oba puste → zapytanie next_task
  - Równolegle: zapytanie total_count
  - **Zaleta**: Oszczędza zapytanie w przypadku overdue/upcoming

- **Opcja 2**: Użycie Supabase RPC (PostgreSQL function)
  - Stworzenie stored procedure `get_dashboard_data(p_user_id UUID)`
  - Wszystkie kalkulacje po stronie bazy danych
  - Single round-trip
  - **Zaleta**: Najlepsza wydajność, mniej transferu danych
  - **Wada**: Wymaga migracji bazy danych

Dla pierwszej implementacji zalecamy **Opcję 1** ze względu na prostotę. Opcja 2 może być rozważona w przyszłości jako optymalizacja.

---

## 6. Względy bezpieczeństwa

### Uwierzytelnianie

- **Mechanizm**: JWT Bearer token w nagłówku Authorization
- **Walidacja**: Supabase `auth.getUser(token)` weryfikuje podpis i ważność tokena
- **Protokół**: HTTPS wymagany w produkcji dla ochrony tokena

### Autoryzacja

- **Row Level Security (RLS)**: Supabase automatycznie filtruje wyniki na podstawie `user_id`
- **Walidacja user_id**: Token zawiera `user.id`, który jest używany we wszystkich zapytaniach
- **Izolacja danych**: Użytkownik widzi wyłącznie swoje zadania

### Ochrona przed atakami

#### SQL Injection

- **Ochrona**: Supabase Query Builder automatycznie parametryzuje zapytania
- **Zalecenie**: Nigdy nie konstruować raw SQL z danymi użytkownika

#### Information Disclosure

- **Błędy 500**: Zwracają generyczny komunikat bez szczegółów implementacji
- **Logowanie**: Szczegółowe błędy logowane tylko po stronie serwera
- **Stack traces**: Nigdy nie ujawniamy stack trace'ów klientowi

#### Token Security

- **Przechowywanie**: Token powinien być przechowywany bezpiecznie po stronie klienta (httpOnly cookie lub secure storage)
- **Expiration**: Token ma określony czas życia (konfigurowany w Supabase)
- **Refresh**: Implementacja refresh token flow dla długotrwałych sesji

#### Rate Limiting

- **Zalecenie**: Implementacja rate limiting na poziomie reverse proxy (Nginx, Cloudflare)
- **Limit**: Np. 100 requests/minute per IP lub user
- **Ochrona**: Przeciwko DoS i nadużyciom

### CORS (Cross-Origin Resource Sharing)

- **Konfiguracja**: Jeśli frontend na innej domenie, skonfigurować odpowiednie CORS headers
- **Allowed Origins**: Whitelist konkretnych domen (nie używać `*` w produkcji)
- **Credentials**: `Access-Control-Allow-Credentials: true` jeśli używamy cookies

### Headers bezpieczeństwa (zalecane)

```
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## 7. Obsługa błędów

### Klasyfikacja błędów

#### 1. Błędy uwierzytelniania (401 Unauthorized)

**Scenariusz 1: Brak nagłówka Authorization**

```typescript
// Request
GET /api/tasks/dashboard

// Response
Status: 401
{
  "error": "Authorization header is missing"
}
```

**Scenariusz 2: Nieprawidłowy format tokena**

```typescript
// Request
GET /api/tasks/dashboard
Authorization: InvalidFormat

// Response
Status: 401
{
  "error": "Authorization header must use Bearer token format"
}
```

**Scenariusz 3: Token wygasły lub nieprawidłowy**

```typescript
// Request
GET /api/tasks/dashboard
Authorization: Bearer expired_or_invalid_token

// Response
Status: 401
{
  "error": "Invalid or expired token"
}
```

#### 2. Błędy serwera (500 Internal Server Error)

**Scenariusz 1: Brak połączenia z bazą danych**

```typescript
// Logged server-side:
console.error("Error retrieving dashboard data:", error)

// Response
Status: 500
{
  "error": "Internal server error",
  "details": "An unexpected error occurred while retrieving dashboard data"
}
```

**Scenariusz 2: Błąd zapytania Supabase**

```typescript
// Thrown from TaskService
throw new Error(`Failed to retrieve dashboard data: ${error.message}`)

// Caught in API handler
// Response
Status: 500
{
  "error": "Internal server error",
  "details": "An unexpected error occurred while retrieving dashboard data"
}
```

**Scenariusz 3: Nieoczekiwany błąd runtime**

```typescript
// Any unexpected error during execution
// Response
Status: 500
{
  "error": "Internal server error",
  "details": "An unexpected error occurred while retrieving dashboard data"
}
```

### Strategia obsługi błędów

#### W warstwie API endpoint

```typescript
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Walidacja supabase client
    // 2. Uwierzytelnianie (z dedykowanym error response)
    // 3. Wywołanie service layer
    // 4. Zwrócenie success response
  } catch (error) {
    // Logowanie szczegółowe po stronie serwera
    console.error("Error retrieving dashboard data:", error);

    // Zwrócenie generycznego błędu do klienta
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: "An unexpected error occurred while retrieving dashboard data",
      } satisfies ErrorDTO),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

#### W warstwie Service

```typescript
async getDashboardData(userId: string): Promise<DashboardDTO> {
  // Błędy propagowane jako Error z opisowymi komunikatami
  const { data, error } = await this.supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .lt("next_due_date", "CURRENT_DATE");

  if (error) {
    throw new Error(`Failed to retrieve overdue tasks: ${error.message}`);
  }

  // Dalsza logika...
}
```

### Best Practices

1. **Logowanie strukturalne**
   - Używać structured logging (JSON format)
   - Includować request ID, user ID, timestamp
   - Różne poziomy: error, warn, info, debug

2. **Monitoring i alerting**
   - Śledzić rate błędów 500
   - Alertować przy wzroście > 5% requestów
   - Dashboard z metrykami (response time, error rate)

3. **Error recovery**
   - Retry logic dla transient errors (z exponential backoff)
   - Circuit breaker dla external dependencies
   - Graceful degradation gdzie możliwe

4. **User experience**
   - Komunikaty błędów przyjazne dla użytkownika
   - Nie ujawniać szczegółów technicznych
   - Sugerować możliwe rozwiązania

---

## 8. Rozważania dotyczące wydajności

### Analiza wydajności

#### Złożoność czasowa

- **Overdue query**: O(n log n) gdzie n = liczba przeterminowanych zadań (sortowanie)
- **Upcoming query**: O(m log m) gdzie m = liczba nadchodzących zadań (sortowanie)
- **Next task query**: O(1) z LIMIT 1
- **Total count query**: O(k) gdzie k = total tasks (z indeksem na user_id)

#### Złożoność pamięciowa

- **Overdue**: O(n) - wszystkie przeterminowane zadania w pamięci
- **Upcoming**: O(m) - maksymalnie zadania z 7 dni
- **Next task**: O(1) - pojedynczy rekord
- **Total response**: O(n + m) - suma overdue + upcoming

### Optymalizacje bazy danych

#### Indeksy (wymagane)

```sql
-- Index dla szybkiego filtrowania po user_id
CREATE INDEX idx_tasks_user_id ON tasks(user_id);

-- Composite index dla overdue queries
CREATE INDEX idx_tasks_user_overdue ON tasks(user_id, next_due_date)
WHERE next_due_date < CURRENT_DATE;

-- Composite index dla upcoming queries
CREATE INDEX idx_tasks_user_upcoming ON tasks(user_id, next_due_date)
WHERE next_due_date >= CURRENT_DATE;
```

**Uzasadnienie**:

- `user_id` jest w każdym warunku WHERE
- `next_due_date` używane do filtrowania i sortowania
- Partial indexes dla overdue/upcoming oszczędzają miejsce

#### Query optimization

- **Projekcja**: SELECT tylko potrzebne kolumny (w next_task: id, title, next_due_date)
- **Early termination**: Next task z LIMIT 1 minimalizuje skanowanie
- **Date calculations**: Wykonywane po stronie bazy danych (nie w aplikacji)

### Optymalizacje aplikacji

#### Caching strategy

**Client-side caching**

- Cache dashboard data na 30-60 sekund
- Używać `Cache-Control: private, max-age=60`
- Invalidacja po akcjach użytkownika (complete, skip)

**Server-side caching (opcjonalnie)**

- Redis cache dla dashboard data
- TTL: 30 sekund
- Cache key: `dashboard:${userId}`
- Invalidacja przy UPDATE/INSERT/DELETE zadania

**Trade-offs**:

- ✅ Redukcja obciążenia bazy danych
- ✅ Szybsze response times
- ❌ Możliwe stale data (akceptowalne dla dashboard)
- ❌ Dodatkowa złożoność infrastruktury

#### Connection pooling

- Supabase SDK zarządza connection pooling
- Domyślnie: shared connection pool
- W high-traffic: rozważyć dedicated database

#### Response compression

- Włączyć gzip/brotli compression na reverse proxy
- Typowy dashboard response: ~2-5KB
- Po kompresji: ~500 bytes - 1KB
- **Zalecenie**: Brotli dla najlepszego ratio

### Monitoring wydajności

#### Metryki do śledzenia

1. **Response time**
   - P50: < 100ms
   - P95: < 300ms
   - P99: < 500ms

2. **Database query time**
   - Każde zapytanie: < 50ms
   - Całkowity czas DB: < 150ms

3. **Throughput**
   - Target: 1000 requests/second per instance

4. **Error rate**
   - Target: < 0.1% błędów 500

#### Narzędzia

- **APM**: New Relic, DataDog, lub Sentry dla tracing
- **Database monitoring**: Supabase Dashboard lub pganalyze
- **Logs aggregation**: ELK stack lub CloudWatch

### Scalability considerations

#### Horizontal scaling

- Stateless API handlers → łatwe skalowanie
- Load balancer dystrybuuje ruch
- Auto-scaling na podstawie CPU/Memory/Request count

#### Database scaling

- Supabase obsługuje database replicas
- Read replicas dla read-heavy workloads
- Connection pooler (PgBouncer) wbudowany

#### Bottleneck analysis

1. **Database queries** (najprawdopodobniejszy bottleneck)
   - Rozwiązanie: Caching, indexes, query optimization
2. **JSON serialization**
   - Rozwiązanie: Streaming JSON dla dużych response
3. **Network latency**
   - Rozwiązanie: CDN, regional deployments

---

## 9. Etapy wdrożenia

### Krok 1: Rozszerzenie TaskService o metodę getDashboardData

**Plik**: `src/lib/services/task.service.ts`

**Akcje**:

1. Dodać metodę `async getDashboardData(userId: string): Promise<DashboardDTO>`
2. Zaimplementować logikę pobierania danych:
   - Zapytanie o overdue tasks z kalkulacją days_overdue
   - Zapytanie o upcoming tasks z kalkulacją days_until_due
   - Warunkowe zapytanie o next_task (tylko gdy brak overdue i upcoming)
   - Zapytanie o total_tasks count
3. Wykorzystać helper metody do kalkulacji dat (jeśli potrzebne)
4. Zwrócić sformatowany obiekt `DashboardDTO`

**Szczegóły implementacji**:

```typescript
/**
 * Retrieves dashboard data for the authenticated user
 *
 * Includes:
 * - Overdue tasks (next_due_date < CURRENT_DATE)
 * - Upcoming tasks (next_due_date between CURRENT_DATE and CURRENT_DATE + 7 days)
 * - Next task in the future (if no overdue or upcoming tasks exist)
 * - Summary statistics
 *
 * @param userId - ID of the authenticated user
 * @returns DashboardDTO with all dashboard sections
 * @throws Error if database queries fail
 */
async getDashboardData(userId: string): Promise<DashboardDTO> {
  // Implementation steps:

  // 1. Get current date in YYYY-MM-DD format
  const currentDate = this.getCurrentDateISO();
  const sevenDaysLater = this.getDatePlusDaysISO(currentDate, 7);

  // 2. Query overdue tasks
  // SELECT *, (CURRENT_DATE - next_due_date) as days_overdue
  // FROM tasks WHERE user_id = ? AND next_due_date < CURRENT_DATE
  // ORDER BY next_due_date ASC

  // 3. Query upcoming tasks
  // SELECT *, (next_due_date - CURRENT_DATE) as days_until_due
  // FROM tasks WHERE user_id = ?
  //   AND next_due_date >= CURRENT_DATE
  //   AND next_due_date <= CURRENT_DATE + 7
  // ORDER BY next_due_date ASC

  // 4. Conditionally query next_task (if overdue and upcoming are empty)
  // SELECT id, title, next_due_date, (next_due_date - CURRENT_DATE) as days_until_due
  // FROM tasks WHERE user_id = ? AND next_due_date > CURRENT_DATE + 7
  // ORDER BY next_due_date ASC LIMIT 1

  // 5. Count total tasks
  // SELECT COUNT(*) FROM tasks WHERE user_id = ?

  // 6. Construct DashboardDTO
  // {
  //   overdue: [...],
  //   upcoming: [...],
  //   next_task: ... | null,
  //   summary: { total_overdue, total_upcoming, total_tasks }
  // }
}
```

**Helper methods** (do dodania jeśli potrzebne):

```typescript
/**
 * Gets current date as ISO string (YYYY-MM-DD)
 */
private getCurrentDateISO(): string {
  const now = new Date();
  return this.formatDateToISO(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  );
}

/**
 * Adds days to a date and returns ISO string
 */
private getDatePlusDaysISO(isoDate: string, days: number): string {
  const date = new Date(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return this.formatDateToISO(date);
}

/**
 * Calculates difference in days between two dates
 */
private getDaysDifference(laterDate: string, earlierDate: string): number {
  const later = new Date(laterDate);
  const earlier = new Date(earlierDate);
  const diffTime = later.getTime() - earlier.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
```

**Import dodatkowych typów**:

```typescript
import type {
  DashboardDTO,
  TaskWithDaysOverdueDTO,
  TaskWithDaysUntilDueDTO,
  NextTaskDTO,
  DashboardSummaryDTO,
} from "../../types";
```

---

### Krok 2: Stworzenie pliku endpointa dashboard

**Plik**: `src/pages/api/tasks/dashboard.ts`

**Akcje**:

1. Utworzyć nowy plik w strukturze: `src/pages/api/tasks/dashboard.ts`
2. Dodać required imports
3. Skonfigurować `export const prerender = false`
4. Zaimplementować handler `GET`

**Struktura pliku**:

```typescript
import type { APIRoute } from "astro";
import type { DashboardDTO, ErrorDTO } from "../../../types";
import type { SupabaseClient } from "../../../db/supabase.client";
import { TaskService } from "../../../lib/services/task.service";

export const prerender = false;

/**
 * GET /api/tasks/dashboard
 *
 * Retrieves dashboard data for the authenticated user
 * (implementation details...)
 */
export const GET: APIRoute = async ({ request, locals }) => {
  // Implementation in next steps
};
```

---

### Krok 3: Implementacja handler GET z uwierzytelnianiem

**Plik**: `src/pages/api/tasks/dashboard.ts`

**Akcje**:

1. Skopiować funkcję helper `authenticateUser()` z `tasks.ts` lub przenieść ją do osobnego pliku utils (zalecane dla DRY)
2. Zaimplementować logikę uwierzytelniania w handlerze GET
3. Obsłużyć przypadki błędów uwierzytelniania

**Opcja A: Kopiowanie authenticateUser** (szybsze, ale duplikacja)

```typescript
// Copy the authenticateUser function from tasks.ts
async function authenticateUser(
  request: Request,
  supabase: SupabaseClient
): Promise<{ user: User | null; errorResponse: Response | null }> {
  // ... implementation from tasks.ts
}
```

**Opcja B: Utworzenie shared helper** (lepsze long-term)

```typescript
// Create src/lib/utils/auth.utils.ts
export async function authenticateUser(...) { ... }

// Import in dashboard.ts
import { authenticateUser } from "../../../lib/utils/auth.utils";
```

**Implementacja w GET handler**:

```typescript
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Validate supabase client availability
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

    // 2. Authenticate user
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

    // Continue to business logic...
  } catch (error) {
    // Error handling...
  }
};
```

---

### Krok 4: Implementacja logiki biznesowej w handler GET

**Plik**: `src/pages/api/tasks/dashboard.ts`

**Akcje**:

1. Utworzyć instancję `TaskService`
2. Wywołać `getDashboardData(user.id)`
3. Zwrócić odpowiedź success z danymi

**Implementacja**:

```typescript
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // ... authentication logic from Step 3 ...

    // ==========================================
    // 3. Business Logic - Retrieve Dashboard Data
    // ==========================================
    const taskService = new TaskService(supabase);
    const dashboardData: DashboardDTO = await taskService.getDashboardData(user.id);

    // ==========================================
    // 4. Success Response
    // ==========================================
    return new Response(JSON.stringify(dashboardData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Error handling in next step...
  }
};
```

---

### Krok 5: Implementacja obsługi błędów

**Plik**: `src/pages/api/tasks/dashboard.ts`

**Akcje**:

1. Dodać try-catch blok opakowujący całą logikę handlera
2. Logować szczegółowe błędy po stronie serwera
3. Zwrócić generyczną odpowiedź błędu do klienta

**Implementacja**:

```typescript
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // ... all previous logic ...
  } catch (error) {
    // ==========================================
    // 5. Error Handling - Unexpected Errors
    // ==========================================

    // Log error details for debugging (server-side only)
    console.error("Error retrieving dashboard data:", error);

    // Return generic error to client (don't expose internal details)
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: "An unexpected error occurred while retrieving dashboard data",
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

### Krok 6: Testowanie endpointa

**Narzędzia**:

- **cURL** dla szybkich testów
- **Postman** lub **Insomnia** dla bardziej zaawansowanych scenariuszy
- **Automated tests** (opcjonalnie): Vitest, Playwright

**Test Case 1: Success Response**

```bash
curl -X GET http://localhost:4321/api/tasks/dashboard \
  -H "Authorization: Bearer <valid_token>" \
  -H "Accept: application/json"

# Expected: 200 OK with DashboardDTO
```

**Test Case 2: Missing Authorization Header**

```bash
curl -X GET http://localhost:4321/api/tasks/dashboard \
  -H "Accept: application/json"

# Expected: 401 Unauthorized
# {"error": "Authorization header is missing"}
```

**Test Case 3: Invalid Token Format**

```bash
curl -X GET http://localhost:4321/api/tasks/dashboard \
  -H "Authorization: InvalidFormat" \
  -H "Accept: application/json"

# Expected: 401 Unauthorized
# {"error": "Authorization header must use Bearer token format"}
```

**Test Case 4: Expired/Invalid Token**

```bash
curl -X GET http://localhost:4321/api/tasks/dashboard \
  -H "Authorization: Bearer invalid_token_string" \
  -H "Accept: application/json"

# Expected: 401 Unauthorized
# {"error": "Invalid or expired token"}
```

**Test Case 5: User with No Tasks**

```bash
# Using valid token for user with 0 tasks
curl -X GET http://localhost:4321/api/tasks/dashboard \
  -H "Authorization: Bearer <valid_token_no_tasks>" \
  -H "Accept: application/json"

# Expected: 200 OK
# {
#   "overdue": [],
#   "upcoming": [],
#   "next_task": null,
#   "summary": {
#     "total_overdue": 0,
#     "total_upcoming": 0,
#     "total_tasks": 0
#   }
# }
```

**Test Case 6: User with Only Overdue Tasks**

```bash
# Test user with tasks where next_due_date < today
# Expected: overdue populated, upcoming empty, next_task null
```

**Test Case 7: User with Only Upcoming Tasks**

```bash
# Test user with tasks in next 7 days
# Expected: overdue empty, upcoming populated, next_task null
```

**Test Case 8: User with Only Future Tasks**

```bash
# Test user with tasks beyond 7 days
# Expected: overdue empty, upcoming empty, next_task populated
```

---

### Krok 7: Weryfikacja typów TypeScript

**Akcje**:

1. Uruchomić TypeScript compiler check
2. Naprawić ewentualne błędy typów
3. Upewnić się, że wszystkie typy są poprawnie importowane

**Komendy**:

```bash
# TypeScript check
npm run check

# lub
npx tsc --noEmit
```

**Common issues**:

- Brak importu typów z `types.ts`
- Niezgodność typów w response
- Missing properties w `DashboardDTO`

---

### Krok 8: Code review i refactoring

**Checklist**:

✅ **Struktura kodu**

- [ ] Kod zgodny z istniejącymi patterns (tasks.ts jako wzór)
- [ ] Proper error handling we wszystkich miejscach
- [ ] Konsystentne formatowanie

✅ **Bezpieczeństwo**

- [ ] Uwierzytelnianie we wszystkich endpointach
- [ ] Brak SQL injection vulnerabilities
- [ ] Brak information disclosure w error messages

✅ **Wydajność**

- [ ] Zapytania zoptymalizowane (indexes użyte prawidłowo)
- [ ] Brak N+1 query problems
- [ ] Efektywne użycie Supabase Query Builder

✅ **Dokumentacja**

- [ ] JSDoc komentarze dla funkcji publicznych
- [ ] Inline komentarze dla skomplikowanej logiki
- [ ] README zaktualizowane (jeśli potrzebne)

✅ **Testowanie**

- [ ] Wszystkie test cases przeszły pomyślnie
- [ ] Edge cases przetestowane
- [ ] Error scenarios przetestowane

**Potencjalne refactorings**:

1. Wyodrębnić `authenticateUser()` do `src/lib/utils/auth.utils.ts`
2. Dodać shared error response builders dla DRY
3. Rozważyć abstrakcję dla response construction

---

### Krok 9: Dokumentacja API

**Akcje**:

1. Zaktualizować dokumentację API (jeśli istnieje plik)
2. Dodać przykłady użycia
3. Dokumentować expected behavior

**Przykładowa dokumentacja** (markdown):

````markdown
## GET /api/tasks/dashboard

Retrieves dashboard data for the authenticated user, including overdue tasks, upcoming tasks, next task, and summary statistics.

### Authentication

Requires a valid JWT token in the Authorization header.

### Request

```http
GET /api/tasks/dashboard HTTP/1.1
Host: example.com
Authorization: Bearer {access_token}
```
````

### Response

#### Success (200 OK)

Returns a `DashboardDTO` object with all dashboard sections.

#### Error Responses

- `401 Unauthorized`: Missing or invalid authentication token
- `500 Internal Server Error`: Server-side error occurred

### Example

See [full example in API plan document]

```

---

### Krok 10: Deployment checklist

**Pre-deployment**:
- [ ] Wszystkie testy przeszły pomyślnie
- [ ] Code review zakończony
- [ ] TypeScript check passed
- [ ] Linter warnings addressed
- [ ] Environment variables skonfigurowane
- [ ] Database indexes utworzone (jeśli potrzebne)

**Deployment**:
- [ ] Deploy do staging environment
- [ ] Smoke tests w staging
- [ ] Performance testing (jeśli high-traffic endpoint)
- [ ] Deploy do production
- [ ] Monitor error logs po deployment
- [ ] Verify metrics (response time, error rate)

**Post-deployment**:
- [ ] Monitoring dashboard skonfigurowany
- [ ] Alerting rules ustawione
- [ ] Documentation opublikowana
- [ ] Team notification o nowym endpoint

---

## 10. Dalsze kroki i rozszerzenia

### Short-term (następne sprinty)
1. **Filtering & sorting**: Dodać opcjonalne query params dla filtrowania overdue/upcoming
2. **Pagination**: Jeśli użytkownik ma bardzo dużo zadań, rozważyć paginację overdue/upcoming
3. **Caching**: Implementacja Redis cache dla dashboard data

### Medium-term (następne kwartały)
1. **WebSocket updates**: Real-time aktualizacje dashboard gdy task się zmienia
2. **Analytics**: Tracking metryk usage (które sekcje są najczęściej używane)
3. **Personalization**: Customizable dashboard layout per user

### Long-term (road map)
1. **Supabase RPC**: Migracja logiki do stored procedure dla lepszej wydajności
2. **GraphQL API**: Alternatywny endpoint GraphQL dla bardziej flexible queries
3. **Offline support**: Progressive Web App z offline caching

---

## Podsumowanie

Ten plan wdrożenia dostarcza kompleksowe wskazówki dla implementacji endpointa `GET /api/tasks/dashboard`. Kluczowe punkty:

✅ **Zgodność z istniejącym kodem**: Wykorzystuje established patterns z `tasks.ts`
✅ **Bezpieczeństwo**: Proper authentication, authorization, i error handling
✅ **Wydajność**: Zoptymalizowane zapytania, indexes, i caching strategies
✅ **Maintainability**: Clean code, proper documentation, testable structure
✅ **Scalability**: Designed for growth, z jasnym planem optymalizacji

Endpoint jest gotowy do implementacji według opisanych kroków, z jasno określonymi acceptance criteria i test cases dla każdego etapu.

```
