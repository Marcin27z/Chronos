# API Endpoint Implementation Plan: DELETE Task

## 1. Przegląd punktu końcowego

**Cel:** Trwałe usunięcie zadania cyklicznego użytkownika z bazy danych.

**Funkcjonalność:**
- Umożliwia użytkownikowi usunięcie zadania po jego identyfikatorze UUID
- Weryfikuje, że zadanie należy do zalogowanego użytkownika przed usunięciem
- Zwraca odpowiedź 204 No Content po pomyślnym usunięciu (brak treści odpowiedzi)
- Wymaga uwierzytelnienia przez Bearer token

**Przypadki użycia:**
- Użytkownik chce definitywnie usunąć zadanie, które nie jest już potrzebne
- Użytkownik usuwa błędnie utworzone zadanie
- Użytkownik czyści listę zadań z nieaktualnych pozycji

## 2. Szczegóły żądania

### Metoda HTTP
`DELETE`

### Struktura URL
```
/api/tasks/{taskId}
```

### Parametry

**URL Parameters (wymagane):**
- `taskId` (UUID) - Unikalny identyfikator zadania do usunięcia

**Request Headers (wymagane):**
```
Authorization: Bearer {access_token}
Content-Type: application/json (opcjonalny, nie wymaga body)
```

**Request Body:**
- Brak (DELETE nie wymaga body)

### Przykład żądania
```http
DELETE /api/tasks/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. Wykorzystywane typy

### Istniejące typy z `types.ts`

**Response DTOs:**
- `ErrorDTO` - dla odpowiedzi błędów (400, 401, 404, 500)

**Validation:**
- `taskIdParamSchema` z `validation.utils.ts` - walidacja UUID taskId

**Brak potrzeby nowych typów:**
- DELETE zwraca 204 No Content (brak body w odpowiedzi sukcesu)
- Nie ma Request Body
- Wykorzystujemy istniejące typy błędów

## 4. Szczegóły odpowiedzi

### Sukces - 204 No Content

**Status:** `204 No Content`

**Headers:**
```
Content-Length: 0
```

**Body:** Brak (puste)

**Znaczenie:** Zadanie zostało pomyślnie usunięte. Brak treści w odpowiedzi zgodnie ze standardem REST dla DELETE.

---

### Błąd - 400 Bad Request

**Status:** `400 Bad Request`

**Body:**
```json
{
  "error": "Invalid task ID format",
  "details": "taskId must be a valid UUID"
}
```

**Kiedy:** Parametr `taskId` nie jest poprawnym UUID.

---

### Błąd - 401 Unauthorized

**Status:** `401 Unauthorized`

**Body:**
```json
{
  "error": "Unauthorized",
  "details": "Missing or invalid authentication token"
}
```

**Kiedy:** 
- Brak nagłówka `Authorization`
- Token Bearer jest nieprawidłowy lub wygasły
- Token nie może być zweryfikowany

---

### Błąd - 404 Not Found

**Status:** `404 Not Found`

**Body:**
```json
{
  "error": "Task not found"
}
```

**Kiedy:**
- Zadanie o podanym `taskId` nie istnieje w bazie danych
- Zadanie istnieje, ale należy do innego użytkownika (z punktu widzenia bezpieczeństwa traktujemy to tak samo)

---

### Błąd - 500 Internal Server Error

**Status:** `500 Internal Server Error`

**Body:**
```json
{
  "error": "Internal server error",
  "details": "Error message (only in DEV mode)"
}
```

**Kiedy:**
- Błąd połączenia z bazą danych
- Nieoczekiwany błąd po stronie serwera
- Błąd w logice aplikacji

## 5. Przepływ danych

### Diagram przepływu

```
1. Request → DELETE /api/tasks/{taskId}
              ↓
2. Middleware → Inicjalizacja Supabase Client (locals.supabase)
              ↓
3. API Route Handler → Rozpoczęcie obsługi żądania
              ↓
4. Walidacja → Sprawdzenie dostępności Supabase Client
              ↓ (brak) → 500 Internal Server Error
              ↓ (ok)
5. Uwierzytelnienie → authenticateUser(request, supabase)
              ↓ (błąd) → 401 Unauthorized
              ↓ (ok)
6. Walidacja parametrów → taskIdParamSchema.safeParse(params.taskId)
              ↓ (błąd) → 400 Bad Request
              ↓ (ok)
7. Service Layer → taskService.deleteTask(userId, taskId)
              ↓
8. Database Query → DELETE FROM tasks 
                    WHERE id = taskId AND user_id = userId
              ↓ (not found) → throw Error
              ↓ (ok)
9. Response → 204 No Content (puste body)
```

### Szczegółowy opis kroków

**Krok 1-2: Request & Middleware**
- Żądanie DELETE przychodzi do endpointa
- Middleware Astro inicjalizuje Supabase Client i dodaje go do `locals`

**Krok 3-4: Inicjalizacja handlera**
- Handler sprawdza dostępność `locals.supabase`
- Jeśli brak - zwraca 500 Internal Server Error

**Krok 5: Uwierzytelnienie**
- Wywołanie `authenticateUser(request, supabase)` z `auth.utils.ts`
- Ekstrakcja i weryfikacja Bearer token z nagłówka Authorization
- Pobranie danych użytkownika z Supabase Auth
- Jeśli błąd - zwraca 401 Unauthorized

**Krok 6: Walidacja parametrów URL**
- Walidacja `taskId` za pomocą `taskIdParamSchema`
- Sprawdzenie czy jest to poprawny UUID v4
- Jeśli błąd - zwraca 400 Bad Request z szczegółami

**Krok 7: Service Layer**
- Utworzenie instancji `TaskService`
- Wywołanie `taskService.deleteTask(userId, taskId)`

**Krok 8: Database Query**
- Service wykonuje DELETE query
- Wykorzystuje `eq("id", taskId).eq("user_id", userId)` dla bezpieczeństwa
- Supabase RLS dodatkowo weryfikuje właściciela
- Jeśli nie znaleziono (0 wierszy usuniętych) - throw Error
- Jeśli znaleziono - usuwa zadanie

**Krok 9: Response**
- Sukces - zwraca Response z statusem 204 i pustym body
- Błąd 404 - jeśli zadanie nie znalezione (catch w handlerze)
- Błąd 500 - jeśli inny nieoczekiwany błąd (catch w handlerze)

### Interakcje z bazą danych

**Tabela:** `tasks`

**Query:**
```sql
DELETE FROM tasks 
WHERE id = $1 AND user_id = $2
RETURNING id;
```

**Parametry:**
- `$1` - taskId (UUID z URL)
- `$2` - userId (UUID z sesji użytkownika)

**RLS Policy:** Row Level Security automatycznie weryfikuje czy użytkownik ma dostęp do wiersza

**Cascade:** Jeśli istnieją powiązane dane (nie ma w obecnym schemacie), zostaną usunięte przez `ON DELETE CASCADE`

## 6. Względy bezpieczeństwa

### Uwierzytelnienie

**Wymagania:**
- Bearer token w nagłówku Authorization
- Token musi być aktywny i nieważny
- Token musi pochodzić z Supabase Auth

**Implementacja:**
- Wykorzystanie funkcji `authenticateUser` z `auth.utils.ts`
- Automatyczna weryfikacja przez Supabase Client
- Zwrot 401 w przypadku braku lub błędnego tokena

### Autoryzacja

**Zasada:** Użytkownik może usunąć tylko własne zadania

**Implementacja wielowarstwowa:**

1. **Application Level (Service):**
   ```typescript
   .eq("id", taskId)
   .eq("user_id", userId)  // Weryfikacja właściciela
   ```

2. **Database Level (RLS):**
   - Supabase Row Level Security policy na tabeli `tasks`
   - Automatyczne filtrowanie wierszy po `user_id`

3. **Consistent Error Response:**
   - Zarówno "nie istnieje" jak i "nie należy do użytkownika" → 404 Not Found
   - Zapobiega wyciekowi informacji o istnieniu zasobów innych użytkowników

### Walidacja danych wejściowych

**taskId validation:**
- Walidacja UUID v4 przez Zod schema
- Regex pattern: `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`
- Zapobiega SQL injection (choć Supabase używa prepared statements)
- Zapobiega błędom w kwerendach

**Content-Type:**
- Opcjonalne dla DELETE (brak body)
- Nie wymaga sprawdzania Content-Type

### Bezpieczeństwo na poziomie bazy danych

**Foreign Key Constraints:**
- `user_id REFERENCES auth.users(id) ON DELETE CASCADE`
- Zadania są automatycznie usuwane gdy użytkownik zostanie usunięty

**RLS Policies:**
- Supabase automatycznie stosuje polityki bezpieczeństwa
- Dodatkowa warstwa ochrony poza weryfikacją w kodzie

### Zapobieganie atakom

**CSRF Protection:**
- Bearer token w nagłówku (nie w cookie)
- Astro middleware zapewnia podstawową ochronę

**Rate Limiting:**
- Zalecane dla produkcji (nie w obecnym zakresie)
- Można dodać middleware lub wykorzystać Supabase rate limiting

**Timing Attacks:**
- Identyczna odpowiedź 404 dla "nie istnieje" i "nie należy do użytkownika"
- Brak różnic w czasie odpowiedzi

## 7. Obsługa błędów

### Hierarchia obsługi błędów

```
try {
  // Główna logika handlera
  
  // 1. Sprawdzenie Supabase Client
  // 2. Uwierzytelnienie
  // 3. Walidacja parametrów
  // 4. Service call
  
} catch (error) {
  // Obsługa nieoczekiwanych błędów
  // → 500 Internal Server Error
}
```

### Katalog błędów

| Scenariusz | Status | Error Message | Details | Kiedy |
|-----------|--------|---------------|---------|-------|
| Brak Supabase Client | 500 | "Database client not available" | - | Błąd konfiguracji middleware |
| Brak tokena | 401 | "Unauthorized" | "Missing or invalid authentication token" | Brak nagłówka Authorization |
| Nieprawidłowy token | 401 | "Unauthorized" | "Missing or invalid authentication token" | Token wygasły lub błędny |
| Błąd uwierzytelnienia | 500 | "Authentication failed" | - | Błąd w procesie auth (rzadkie) |
| Nieprawidłowy UUID | 400 | "Invalid task ID format" | "taskId must be a valid UUID" | taskId nie jest UUID v4 |
| Zadanie nie znalezione | 404 | "Task not found" | - | Zadanie nie istnieje lub należy do innego użytkownika |
| Błąd bazy danych | 500 | "Internal server error" | Error message (tylko DEV) | Błąd połączenia lub query |
| Nieoczekiwany błąd | 500 | "Internal server error" | Error message (tylko DEV) | Wszystkie inne błędy |

### Logowanie błędów

**Console Error Logs:**
```typescript
console.error("[DeleteTask] Unexpected error:", error);
```

**Informacje logowane:**
- Nazwa endpointa: `[DeleteTask]`
- Pełny obiekt błędu (stack trace)
- Timestamp (automatycznie przez console)

**Środowiska:**
- **DEV:** Szczegółowe error details w response body
- **PRODUCTION:** Ogólne error messages bez ujawniania szczegółów wewnętrznych

**Bezpieczeństwo logowania:**
- Nie logować tokenów uwierzytelnienia
- Nie logować danych osobowych (UUID użytkownika jest ok)
- Nie ujawniać szczegółów bazy danych w odpowiedzi produkcyjnej

### Response Format

Wszystkie błędy zwracają spójny format zgodny z `ErrorDTO`:

```typescript
{
  error: string;      // Główny komunikat błędu
  details?: string;   // Opcjonalne szczegóły (często tylko w DEV)
}
```

## 8. Rozważania dotyczące wydajności

### Optymalizacja zapytań

**Single Database Query:**
- DELETE wykonuje tylko jedną operację na bazie danych
- Wykorzystanie indeksów: `PRIMARY KEY (id)` i `user_id` (prawdopodobnie indeksowany)
- WHERE klauzula z AND jest efektywna dla indeksowanych kolumn

**Brak RETURNING clause:**
- Nie ma potrzeby zwracać usuniętych danych (204 No Content)
- Zmniejsza transfer danych z bazy
- Optional: można dodać `RETURNING id` tylko dla weryfikacji

### Connection Pooling

- Supabase automatycznie zarządza connection pooling
- Client jest inicjalizowany w middleware i przekazywany przez `locals`
- Brak nowych połączeń w każdym requeście

### Potencjalne wąskie gardła

**1. Uwierzytelnienie Supabase:**
- Każde żądanie weryfikuje token przez API Supabase
- **Mitigacja:** Supabase cache'uje tokeny po stronie serwera

**2. Database Locks:**
- DELETE tworzy exclusive lock na wiersz
- W praktyce nie stanowi problemu dla pojedynczych operacji
- **Mitigacja:** Operacja jest bardzo szybka (< 10ms)

**3. Network Latency:**
- Połączenie z Supabase przez sieć
- **Mitigacja:** Używać Supabase w tym samym regionie co aplikacja

### Zalecenia optymalizacyjne

**Nie wymagane obecnie (prosta operacja):**
- Brak potrzeby cache'owania (DELETE to side effect)
- Brak potrzeby batch deletions (pojedyncze zadanie)
- Brak potrzeby soft delete (specyfikacja wymaga trwałego usunięcia)

**Możliwe przyszłe optymalizacje:**
- **Soft Delete:** Dodać kolumnę `deleted_at` zamiast fizycznego usuwania
  - Umożliwia odzyskanie usuniętych zadań
  - Wymaga zmiany logiki query (WHERE deleted_at IS NULL)
- **Audit Log:** Zapisywać historię usuniętych zadań w osobnej tabeli
- **Rate Limiting:** Ograniczenie liczby DELETE na użytkownika/minutę

### Monitoring

**Metryki do śledzenia:**
- Czas odpowiedzi endpointa (p50, p95, p99)
- Liczba błędów 404 (może wskazywać na próby nieautoryzowanego dostępu)
- Liczba błędów 500 (problemy z bazą danych)
- Liczba pomyślnych usunięć na użytkownika (wykrywanie nadużyć)

## 9. Etapy wdrożenia

### Faza 1: Implementacja Service Layer

**Plik:** `src/lib/services/task.service.ts`

**Zadanie:** Dodać metodę `deleteTask` do klasy `TaskService`

**Wymagania:**
- Metoda przyjmuje `userId` i `taskId` jako parametry
- Wykonuje operację DELETE na tabeli `tasks` z weryfikacją właściciela
- Używa opcji `count: "exact"` aby sprawdzić liczbę usuniętych wierszy
- Rzuca błąd z odpowiednim komunikatem jeśli zadanie nie zostało znalezione lub usunięte
- Zwraca `Promise<void>` (brak zwracanej wartości przy sukcesie)
- Obsługa błędów spójna z innymi metodami w serwisie

---

### Faza 2: Implementacja API Route Handler

**Plik:** `src/pages/api/tasks/[taskId].ts`

**Zadanie:** Dodać handler `DELETE` do istniejącego pliku

**Wymagania:**
- Eksportować funkcję `DELETE` jako `APIRoute`
- Sprawdzić dostępność Supabase Client z `locals`
- Uwierzytelnić użytkownika za pomocą `authenticateUser` utility
- Walidować parametr `taskId` używając `taskIdParamSchema`
- Wywołać metodę `taskService.deleteTask()` z userId i taskId
- Obsłużyć błąd "not found" i zwrócić odpowiedź 404
- Zwrócić odpowiedź 204 No Content (z pustym body) przy sukcesie
- Obsłużyć nieoczekiwane błędy i zwrócić 500 z odpowiednim logowaniem
- Zachować spójność struktury z istniejącymi handlerami GET i PUT

---

### Faza 3: Testowanie

**Scenariusze testowe do przeprowadzenia:**

#### Test 1: Pomyślne usunięcie zadania
- Wysłać DELETE request z poprawnym UUID i tokenem uwierzytelnienia
- Oczekiwać statusu 204 No Content z pustym body
- Zweryfikować że zadanie zostało usunięte z bazy danych
- Sprawdzić że GET na ten sam taskId zwraca 404

#### Test 2: Nieautoryzowany dostęp (brak tokena)
- Wysłać DELETE request bez nagłówka Authorization
- Oczekiwać statusu 401 Unauthorized z komunikatem o brakującym tokenie

#### Test 3: Nieprawidłowy UUID
- Wysłać DELETE request z niepoprawnym formatem taskId
- Oczekiwać statusu 400 Bad Request z komunikatem o nieprawidłowym formacie UUID

#### Test 4: Zadanie nie istnieje
- Wysłać DELETE request z poprawnym UUID który nie istnieje w bazie
- Oczekiwać statusu 404 Not Found

#### Test 5: Zadanie należy do innego użytkownika
- Wysłać DELETE request z UUID zadania należącego do innego użytkownika
- Oczekiwać statusu 404 Not Found (taka sama odpowiedź jak dla nieistniejącego zadania)

#### Test 6: Nieprawidłowy lub wygasły token
- Wysłać DELETE request z wygasłym lub nieprawidłowym tokenem
- Oczekiwać statusu 401 Unauthorized

---

### Faza 4: Dokumentacja

**Pliki do aktualizacji:**

1. **API Documentation** (jeśli istnieje):
   - Dodać endpoint DELETE /api/tasks/{taskId}
   - Opisać parametry, headers, responses
   - Przykłady użycia

2. **OpenAPI/Swagger** (jeśli używane):
   - Dodać definicję endpointa
   - Zdefiniować security schemes (Bearer)

3. **README.md** (jeśli zawiera info o API):
   - Dodać do listy dostępnych endpoints

4. **Changelog:**
   - Dodać wpis o nowym endpoincie DELETE

---

### Faza 5: Code Review Checklist

**Przed merge do main:**

- [ ] Service method `deleteTask` poprawnie zaimplementowana
- [ ] API handler DELETE dodany do `[taskId].ts`
- [ ] Wszystkie importy są poprawne
- [ ] Walidacja parametrów działa zgodnie z schema
- [ ] Uwierzytelnienie wymuszane przed operacją
- [ ] Weryfikacja właściciela zadania (double-check)
- [ ] Response 204 z pustym body
- [ ] Error handling dla wszystkich scenariuszy
- [ ] Console logging dla błędów
- [ ] Brak logowania wrażliwych danych
- [ ] Kod spójny z istniejącym stylem (GET, PUT handlers)
- [ ] TypeScript types użyte poprawnie (`satisfies`)
- [ ] ESLint passes (no warnings)
- [ ] Wszystkie testy przechodzą
- [ ] Dokumentacja zaktualizowana

---

### Faza 6: Deployment

**Kroki:**

1. **Merge do main branch**
   - Po zatwierdzeniu code review
   - Wszystkie testy green

2. **Weryfikacja CI/CD**
   - GitHub Actions build passes
   - Type check passes
   - Lint check passes

3. **Deployment na staging** (jeśli istnieje):
   - Smoke tests
   - Manual verification

4. **Deployment na production:**
   - Monitor error rates
   - Monitor response times
   - Check logs for unexpected errors

5. **Post-deployment verification:**
   - Test DELETE endpoint na produkcji
   - Verify 204 response
   - Check database (zadanie faktycznie usunięte)
   - Monitor przez 24h

---

## 10. Podsumowanie

### Kluczowe punkty implementacji

1. **Service Layer:**
   - Metoda `deleteTask` w `TaskService`
   - Weryfikacja właściciela przez `.eq("user_id", userId)`
   - Throw error jeśli nie znaleziono (0 rows deleted)

2. **API Handler:**
   - Export `DELETE` w `src/pages/api/tasks/[taskId].ts`
   - Uwierzytelnienie → Walidacja → Service → Response
   - 204 No Content z pustym body

3. **Bezpieczeństwo:**
   - Bearer token required
   - UUID validation
   - Ownership verification (application + RLS)
   - Consistent 404 responses

4. **Error Handling:**
   - 400 dla invalid UUID
   - 401 dla unauthorized
   - 404 dla not found
   - 500 dla server errors
   - Console logging dla debugowania

5. **Wydajność:**
   - Single database query
   - Indexed columns (id, user_id)
   - No RETURNING clause (nie potrzebne)

### Dependencies

**Istniejące komponenty (bez zmian):**
- `authenticateUser` z `auth.utils.ts`
- `taskIdParamSchema` z `validation.utils.ts`
- `ErrorDTO` z `types.ts`
- Middleware Supabase initialization

**Nowe komponenty:**
- `TaskService.deleteTask()` method
- `DELETE` API handler

### Ryzyko i mitigacje

| Ryzyko | Prawdopodobieństwo | Impact | Mitigacja |
|--------|-------------------|--------|-----------|
| Przypadkowe usunięcie | Niskie | Wysokie | Brak soft delete, wymaga świadomej akcji użytkownika |
| Nieautoryzowany dostęp | Niskie | Wysokie | Multi-layer authorization (app + RLS) |
| Database errors | Niskie | Średnie | Error handling + logging |
| Rate limiting abuse | Średnie | Niskie | Zalecane: dodać rate limiting middleware |

### Przyszłe rozszerzenia (opcjonalne)

1. **Soft Delete:**
   - Dodać kolumnę `deleted_at`
   - Filtrować soft-deleted w queries
   - Endpoint do permanent delete

2. **Audit Trail:**
   - Osobna tabela `task_deletions`
   - Zapisywać: task_id, user_id, deleted_at, task_snapshot

3. **Undo Delete:**
   - Endpoint POST /api/tasks/{taskId}/restore
   - Wymaga soft delete

4. **Batch Delete:**
   - DELETE /api/tasks?ids=uuid1,uuid2,uuid3
   - Transakcja dla wszystkich

5. **Cascade Handling:**
   - Jeśli pojawią się related entities (np. task_attachments)
   - Informować użytkownika przed usunięciem
   - Lub implementować cascade delete

---

**Plan gotowy do implementacji. Wszystkie kroki są jasno zdefiniowane i zgodne z istniejącym kodem oraz najlepszymi praktykami.**

