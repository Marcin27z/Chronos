# API Endpoint Implementation Plan: GET /api/tasks

## 1. Przegląd punktu końcowego

Endpoint `GET /api/tasks` służy do pobierania wszystkich zadań cyklicznych zalogowanego użytkownika z opcjonalnym sortowaniem i paginacją. Endpoint zwraca listę zadań wraz z metadanymi paginacji (łączna liczba zadań, limit, offset, informacja o dostępności kolejnych stron).

**Główne funkcjonalności:**
- Pobieranie wszystkich zadań użytkownika z filtrowaną przez RLS w Supabase
- Sortowanie po dacie następnego wykonania lub tytule (rosnąco/malejąco)
- Paginacja z konfigurowalnymi wartościami limit i offset
- Zwrócenie kompletnej struktury TaskListDTO z danymi i metadanymi

## 2. Szczegóły żądania

### Metoda HTTP
`GET`

### Struktura URL
```
/api/tasks?sort={sortField}&limit={limitValue}&offset={offsetValue}
```

### Nagłówki żądania
```
Authorization: Bearer {access_token}
```

### Parametry Query

#### Wymagane
Brak parametrów wymaganych (oprócz nagłówka Authorization)

#### Opcjonalne

| Parametr | Typ | Domyślna wartość | Opis | Walidacja |
|----------|-----|------------------|------|-----------|
| `sort` | string | `next_due_date` | Pole i kierunek sortowania | Enum: `next_due_date`, `-next_due_date`, `title`, `-title` |
| `limit` | number | `50` | Liczba wyników na stronę | Zakres: 1-100 |
| `offset` | number | `0` | Liczba wyników do pominięcia | Min: 0 |

**Szczegóły parametru sort:**
- `next_due_date` - sortowanie po dacie następnego wykonania rosnąco (najwcześniejsze na początku)
- `-next_due_date` - sortowanie po dacie następnego wykonania malejąco (najpóźniejsze na początku)
- `title` - sortowanie alfabetyczne po tytule rosnąco (A-Z)
- `-title` - sortowanie alfabetyczne po tytule malejąco (Z-A)

## 3. Wykorzystywane typy

### DTOs (z src/types.ts)

**TaskDTO:**
**TaskListDTO:**
**PaginationDTO:**
**ErrorDTO:**
**ValidationErrorDTO:**

### Zod Schemas (do utworzenia)

**GetTasksQuerySchema:**
```typescript
const GetTasksQuerySchema = z.object({
  sort: z.enum(['next_due_date', '-next_due_date', 'title', '-title'])
    .optional()
    .default('next_due_date'),
  
  limit: z.coerce.number()
    .int()
    .min(1, "Limit must be at least 1")
    .max(100, "Limit must not exceed 100")
    .optional()
    .default(50),
  
  offset: z.coerce.number()
    .int()
    .min(0, "Offset must be non-negative")
    .optional()
    .default(0),
});
```

## 4. Szczegóły odpowiedzi

### Sukces - 200 OK

**Zawartość**
TaskListDTO

**Nagłówki:**
```
Content-Type: application/json
```

### Błędy

#### 400 Bad Request - Nieprawidłowe parametry

**Zawartość**
ValidationErrorDTO

#### 401 Unauthorized - Brak lub nieprawidłowa autoryzacja

**Zawartość**
ErrorDTO

## 5. Przepływ danych

### Diagram przepływu

```
1. Klient → GET /api/tasks?sort=title&limit=10&offset=0
   ↓
2. Endpoint API (tasks.ts - GET handler)
   ↓
3. Walidacja nagłówka Authorization
   ↓
4. Supabase Auth - weryfikacja tokenu → user.id
   ↓
5. Walidacja query params (Zod schema)
   ↓
6. TaskService.getTasks(userId, sort, limit, offset)
   ↓
7. Supabase Query:
   - SELECT * FROM tasks WHERE user_id = $1
   - ORDER BY {parsowane pole sortowania}
   - LIMIT {limit}
   - OFFSET {offset}
   ↓
8. Supabase Query (count):
   - SELECT COUNT(*) FROM tasks WHERE user_id = $1
   ↓
9. Konstrukcja TaskListDTO:
   - data: wyniki z query
   - pagination: { total, limit, offset, has_more }
   ↓
10. Response 200 OK z TaskListDTO
```

### Szczegóły interakcji z bazą danych

#### Query 1: Pobieranie zadań z sortowaniem i paginacją


#### Query 2: Liczenie łącznej liczby zadań



## 6. Względy bezpieczeństwa

### Uwierzytelnianie
1. **Bearer Token Authentication**
   - Każde żądanie musi zawierać nagłówek `Authorization: Bearer {token}`
   - Token jest weryfikowany przez `supabase.auth.getUser(token)`
   - Nieprawidłowy lub wygasły token → 401 Unauthorized

2. **Walidacja formatu tokenu**
   - Token musi być w formacie Bearer
   - Regex: `/^Bearer\s+/i`

### Autoryzacja
1. **Row Level Security (RLS)**
   - Polityki RLS w Supabase zapewniają, że użytkownik może pobierać tylko swoje zadania
   - Query automatycznie filtruje po `user_id` z tokenu
   - Nawet jeśli klient spróbuje zmodyfikować query, RLS uniemożliwi dostęp do cudzych danych

2. **User ID z tokenu**
   - User ID jest wyciągane z zweryfikowanego tokenu (nie z parametrów żądania)
   - Gwarantuje to, że użytkownik może pobierać tylko swoje dane

### Walidacja danych wejściowych
1. **Query Parameters**
   - Wszystkie parametry query są walidowane przez Zod schema
   - Wartość `sort` ograniczona do enum (unikanie SQL injection)
   - `limit` i `offset` są konwertowane na liczby i sprawdzane pod kątem zakresów

2. **Sanityzacja sortowania**
   - Wartość `sort` jest parsowana na bezpieczne kolumny bazy danych
   - Nie ma możliwości wstrzyknięcia dowolnego SQL przez parametr sort
   - Whitelist dozwolonych kolumn: `next_due_date`, `title`

### Ochrona przed atakami
1. **SQL Injection**
   - Supabase client używa prepared statements
   - Parametry query są walidowane przez enum
   - Mapowanie sort → column jest hardcoded

2. **Rate Limiting**
   - Zalecenie: implementacja rate limiting na poziomie API Gateway lub middleware
   - Limit np. 100 żądań/minutę na użytkownika

3. **Paginacja**
   - Limit maksymalny 100 wyników zapobiega DoS przez duże queries
   - Offset walidowany jako liczba nieujemna

## 7. Obsługa błędów

### Kategorie błędów

#### 1. Błędy autoryzacji (401)

| Scenariusz | Warunek | Komunikat |
|------------|---------|-----------|
| Brak nagłówka | `!request.headers.get('authorization')` | "Authorization header is missing" |
| Nieprawidłowy format | Token nie zaczyna się od "Bearer " | "Authorization header must use Bearer token format" |
| Nieprawidłowy token | `supabase.auth.getUser()` zwraca błąd | "Invalid or expired token" |
| Brak użytkownika | `user === null` po weryfikacji | "Invalid or expired token" |

#### 2. Błędy walidacji (400)

| Scenariusz | Warunek | Komunikat |
|------------|---------|-----------|
| Nieprawidłowa wartość sort | sort nie jest w enum | "Invalid enum value. Expected 'next_due_date' \| '-next_due_date' \| 'title' \| '-title'" |
| Limit za mały | limit < 1 | "Limit must be at least 1" |
| Limit za duży | limit > 100 | "Limit must not exceed 100" |
| Limit nie jest liczbą | isNaN(limit) | "Expected number, received nan" |
| Ujemny offset | offset < 0 | "Offset must be non-negative" |
| Offset nie jest liczbą | isNaN(offset) | "Expected number, received nan" |

#### 3. Błędy serwera (500)

| Scenariusz | Warunek | Komunikat |
|------------|---------|-----------|
| Brak Supabase client | `!locals.supabase` | "Database client not available" |
| Błąd bazy danych | Supabase query error | "An unexpected error occurred while retrieving tasks" |
| Nieoczekiwany błąd | catch block | "An unexpected error occurred while retrieving tasks" |

### Implementacja obsługi błędów

```typescript
// Przykład struktury try-catch
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Autoryzacja
    // 2. Walidacja query params
    // 3. Wywołanie service
    // 4. Zwrot odpowiedzi
  } catch (error) {
    console.error('Error retrieving tasks:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: 'An unexpected error occurred while retrieving tasks'
      } satisfies ErrorDTO),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
```

### Logowanie błędów

- Wszystkie błędy są logowane przez `console.error()` (dla produkcji: zamienić na profesjonalny system logowania)
- Logi zawierają szczegóły błędu, ale szczegóły nie są wysyłane do klienta
- W odpowiedzi do klienta wysyłane są tylko bezpieczne, generyczne komunikaty

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła

1. **Duża liczba zadań użytkownika**
   - Problem: użytkownik z tysiącami zadań może spowolnić query
   - Rozwiązanie: paginacja z limitem max 100

2. **Brak indeksów**
   - Problem: sortowanie po `next_due_date` lub `title` może być wolne
   - Rozwiązanie: upewnić się, że w bazie są indeksy:
     ```sql
     CREATE INDEX idx_tasks_user_next_due ON tasks(user_id, next_due_date);
     CREATE INDEX idx_tasks_user_title ON tasks(user_id, title);
     ```

3. **Dwa zapytania do bazy**
   - Problem: jedno query dla danych, drugie dla count
   - Rozwiązanie: potencjalnie połączyć w jedno query z window functions (optymalizacja przyszłościowa)

4. **N+1 problem**
   - Nie dotyczy: pobieramy wszystkie dane zadania w jednym query, brak relacji do innych tabel

### Strategie optymalizacji

#### Indeksy bazy danych
```sql
-- Indeks dla sortowania po next_due_date
CREATE INDEX IF NOT EXISTS idx_tasks_user_next_due 
ON tasks(user_id, next_due_date);

-- Indeks dla sortowania po title
CREATE INDEX IF NOT EXISTS idx_tasks_user_title 
ON tasks(user_id, title);

-- Indeks domyślny na user_id (już istnieje przez FOREIGN KEY)
```

#### Caching (opcjonalnie - przyszłościowa optymalizacja)
- Rozważyć cache dla często używanych queries (np. Redis)
- Invalidacja cache po utworzeniu/aktualizacji/usunięciu zadania
- Cache per user z TTL 5-10 minut

#### Query Optimization
```typescript
// Wykorzystanie .range() zamiast .limit().offset()
// .range() jest bardziej efektywne w Supabase
query.range(offset, offset + limit - 1);
```

#### Pagination best practices
- Limit default 50, max 100 zapobiega dużym transferom danych
- Offset validation zapobiega negatywnym wartościom
- `has_more` flag w pagination pozwala klientowi wiedzieć, czy są kolejne strony bez potrzeby kolejnego query

### Metryki do monitorowania

1. **Response time**
   - Target: < 200ms dla większości queries
   - Alert: > 1s

2. **Database query time**
   - Target: < 100ms
   - Alert: > 500ms

3. **Error rate**
   - Target: < 1%
   - Alert: > 5%

4. **Cache hit rate** (jeśli implementowane)
   - Target: > 80%

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie schematu walidacji query parameters

**Plik:** `src/pages/api/tasks.ts`

**Cel:** Utworzenie schema walidacji Zod dla parametrów URL (sort, limit, offset), która zapewni bezpieczeństwo i spójność danych wejściowych.

**Szczegółowy opis:**

1. **Import biblioteki walidacji**
   - Zaimportować bibliotekę Zod na początku pliku
   - Będzie użyta do runtime validation query parameters

2. **Definicja schema walidacji**
   - Utworzyć schema z trzema polami: `sort`, `limit`, `offset`
   - Każde pole powinno być opcjonalne i posiadać wartość domyślną

3. **Pole `sort`**
   - Zdefiniować jako enumerację z dokładnie czterema dozwolonymi wartościami: `'next_due_date'`, `'-next_due_date'`, `'title'`, `'-title'`
   - Wartość domyślna: `'next_due_date'`
   - Ograniczenie do enumeracji zapewnia whitelist dozwolonych wartości, chroniąc przed SQL injection

4. **Pole `limit`**
   - Automatycznie konwertować wartość tekstową z URL na liczbę
   - Dodać walidację na liczby całkowite
   - Dodać walidację minimalnej wartości 1 z komunikatem: "Limit must be at least 1"
   - Dodać walidację maksymalnej wartości 100 z komunikatem: "Limit must not exceed 100"
   - Wartość domyślna: `50`
   - Konwersja jest konieczna ponieważ query params zawsze przychodzą jako stringi

5. **Pole `offset`**
   - Automatycznie konwertować wartość tekstową na liczbę
   - Dodać walidację na liczby całkowite
   - Dodać walidację minimalnej wartości 0 z komunikatem: "Offset must be non-negative"
   - Wartość domyślna: `0`

6. **Typ TypeScript dla walidacji**
   - Utworzyć alias typu `GetTasksQuery` wyprowadzony automatycznie ze schema
   - Pozwoli to TypeScript automatycznie znać strukturę zwalidowanych danych

**Uwagi implementacyjne:**
- Wszystkie komunikaty błędów muszą być po angielsku (zgodnie z API specification)
- Schema będzie użyta w handlerze GET do walidacji przed wywołaniem service layer
- Wartości domyślne zostaną użyte gdy parametr nie jest podany w URL

### Krok 2: Dodanie metody getTasks do TaskService

**Plik:** `src/lib/services/task.service.ts`

**Cel:** Rozszerzenie istniejącego TaskService o metodę pobierania listy zadań z sortowaniem i paginacją.

**Szczegółowy opis:**

1. **Import typów**
   - Zaimportować typy `TaskListDTO`, `TaskDTO`, `PaginationDTO` z pliku types
   - Typy są już zdefiniowane i gotowe do użycia

2. **Definicja metody publicznej getTasks**
   - Metoda powinna być asynchroniczna i zwracać obiekt TaskListDTO
   - Przyjmuje cztery parametry:
     - ID zalogowanego użytkownika (z tokenu autoryzacji)
     - Wartość parametru sort (już zwalidowana przez schema)
     - Maksymalna liczba wyników (1-100)
     - Liczba wyników do pominięcia (≥0)
   - W przypadku błędu bazy danych powinna zgłosić wyjątek

3. **Parsowanie parametru sortowania**
   - Utworzyć prywatną metodę pomocniczą do parsowania sort
   - Metoda powinna rozpoznać nazwę kolumny i kierunek sortowania (rosnąco/malejąco)
   - Zwrócić te informacje w formacie odpowiednim dla zapytania do bazy

4. **Zapytanie 1: Pobieranie listy zadań**
   - Pobrać zadania z tabeli tasks
   - Wybrać wszystkie kolumny zadania
   - Filtrować wyniki po ID użytkownika
   - Posortować wyniki według określonej kolumny i kierunku
   - Zastosować paginację (offset i limit)
   - UWAGA: Mechanizm range używa granic włącznych, więc końcowy indeks to offset + limit - 1
   - W przypadku błędu rzucić wyjątek z komunikatem

5. **Zapytanie 2: Liczenie wszystkich zadań**
   - Wykonać osobne zapytanie do zliczenia wszystkich zadań użytkownika
   - Pobrać tylko liczbę wyników, bez samych danych (optymalizacja)
   - Filtrować po ID użytkownika
   - Obsłużyć błąd podobnie jak w pierwszym zapytaniu
   - Wyciągnąć wartość licznika, używając 0 jako wartości domyślnej

6. **Obliczenie flagi has_more**
   - Obliczyć czy istnieją kolejne strony wyników
   - Formuła: czy suma offset i limit jest mniejsza od total
   - True oznacza że są dostępne kolejne wyniki

7. **Konstrukcja obiektu odpowiedzi**
   - Utworzyć obiekt zgodny ze strukturą TaskListDTO
   - Pole `data`: lista zadań z pierwszego zapytania, z pustą tablicą jako fallback
   - Pole `pagination`: obiekt zawierający total, limit, offset, has_more

8. **Metoda pomocnicza parseSortParam**
   - Przyjmuje parametr sort jako string
   - Zwraca nazwę kolumny i kierunek sortowania
   - Wykrywa czy wartość zaczyna się od `-` (sortowanie malejące)
   - Usuwa prefix jeśli istnieje, aby uzyskać nazwę pola
   - Mapuje przyjazne nazwy z API na rzeczywiste nazwy kolumn bazy danych
   - Obsługuje wartość domyślną (next_due_date) dla nierozpoznanych wartości

**Uwagi implementacyjne:**
- Metoda wykorzystuje dwa osobne zapytania do bazy - można to zoptymalizować w przyszłości
- Row Level Security automatycznie filtruje po user_id, ale filtr jest dodany jawnie dla klarowności
- Błędy z warstwy serwisu będą złapane w handlerze API i zwrócone jako 500 Internal Server Error
- Metoda parsowania sortowania jest prywatna jako szczegół implementacji

### Krok 3: Implementacja handlera GET w endpoincie API

**Plik:** `src/pages/api/tasks.ts`

**Cel:** Utworzenie nowego handlera GET w istniejącym pliku API tasks.ts, który obsłuży żądania pobierania listy zadań.

**Szczegółowy opis:**

1. **Import typów**
   - Zaimportować typ `TaskListDTO` do istniejących importów
   - Będzie użyty jako typ zwracany w odpowiedzi sukcesu

2. **Struktura funkcji handlera**
   - Utworzyć i wyeksportować handler GET jako funkcję endpoint API
   - Funkcja powinna być asynchroniczna i przyjmować request oraz locals
   - Cała logika powinna być zabezpieczona blokiem obsługi błędów

3. **Blok 1: Uwierzytelnianie użytkownika**
   - Zaimplementować logikę autoryzacji analogiczną do handlera POST
   - Sprawdzić obecność nagłówka autoryzacji
   - Wyekstrahować token Bearer z nagłówka (format: "Bearer {token}")
   - Zweryfikować token z użytkownikiem w systemie autoryzacji
   - Zwrócić błąd 401 Unauthorized gdy autoryzacja się nie powiedzie
   - Po sukcesie uzyskać obiekt użytkownika z jego ID

4. **Blok 2: Wyciągnięcie parametrów z URL**
   - Sparsować URL żądania
   - Wyciągnąć parametry query string: sort, limit, offset
   - Przygotować obiekt z parametrami do walidacji
   - Użyć undefined dla brakujących parametrów (pozwoli to użyć wartości domyślnych)

5. **Blok 3: Walidacja parametrów zapytania**
   - Przepuścić parametry przez schema walidacji
   - Sprawdzić czy walidacja zakończyła się sukcesem
   - W przypadku błędów walidacji:
     - Przekształcić błędy walidacji na format ValidationErrorDTO
     - Dla każdego błędu utworzyć obiekt z nazwą pola i komunikatem
     - Zwrócić odpowiedź z kodem 400 Bad Request i listą błędów
   - W przypadku sukcesu:
     - Wyciągnąć zwalidowane i przetworzone parametry
     - Wartości tekstowe będą już skonwertowane na odpowiednie typy

6. **Blok 4: Wywołanie logiki biznesowej**
   - Utworzyć instancję serwisu zadań z klientem bazy danych
   - Wywołać metodę pobierania zadań z parametrami:
     - ID użytkownika z autoryzacji
     - Zwalidowana wartość sortowania
     - Zwalidowany limit wyników
     - Zwalidowany offset paginacji
   - Otrzymać obiekt TaskListDTO z danymi i metadanymi paginacji
   - Błędy z warstwy serwisowej zostaną automatycznie przechycone

7. **Blok 5: Odpowiedź sukcesu**
   - Zwrócić odpowiedź HTTP z:
     - Treścią: serializowany JSON z danymi zadań
     - Kodem statusu: 200 OK
     - Nagłówkiem typu zawartości: application/json

8. **Blok obsługi wyjątków**
   - Przechwyć dowolny nieoczekiwany błąd
   - Zaloguj szczegóły błędu dla celów debugowania (tylko po stronie serwera)
   - W produkcji użyć profesjonalnego systemu logowania
   - Zwrócić użytkownikowi odpowiedź z:
     - Generycznym komunikatem błędu (bez ujawniania szczegółów wewnętrznych)
     - Kodem statusu: 500 Internal Server Error
     - Nagłówkiem typu zawartości: application/json

9. **Dokumentacja kodu**
   - Dodać komentarz dokumentacyjny nad funkcją
   - Opisać przeznaczenie endpointu
   - Wymienić wymagania (autoryzacja Bearer token)
   - Wylistować możliwe kody odpowiedzi i warunki ich wystąpienia

**Uwagi implementacyjne:**
- Handler powinien być umieszczony w tym samym pliku co POST handler
- Logika autoryzacji jest duplikowana - można to zrefaktoryzować w Kroku 4
- Każdy blok logiki powinien być oznaczony komentarzem dla czytelności
- Należy zapewnić bezpieczeństwo typów dla obiektów ErrorDTO i ValidationErrorDTO

### Krok 4: Refaktoryzacja - ekstrakcja logiki autoryzacji (opcjonalnie)

**Plik:** `src/pages/api/tasks.ts`

**Cel:** Eliminacja duplikacji kodu autoryzacji między handlerami GET i POST poprzez wyodrębnienie do osobnej funkcji pomocniczej.

**Szczegółowy opis:**

1. **Utworzenie funkcji pomocniczej do autoryzacji**
   - Funkcja powinna być asynchroniczna i dostępna w pliku endpointu
   - Przyjmuje dwa parametry:
     - Obiekt żądania HTTP
     - Kontekst lokalny Astro z dostępem do klienta bazy
   - Zwraca Promise z jednym z dwóch wariantów:
     - Sukces: obiekt użytkownika oraz null dla błędu
     - Niepowodzenie: null dla użytkownika oraz gotowa odpowiedź HTTP

2. **Logika procesu autoryzacji**
   - Wyodrębnić całą logikę sprawdzania autoryzacji z handlerów
   - Proces składa się z następujących kroków:
     a) Sprawdzenie obecności nagłówka Authorization
     b) Wydobycie tokenu (usunięcie prefiksu "Bearer ")
     c) Sprawdzenie poprawności formatu tokenu
     d) Weryfikacja dostępności klienta bazy danych
     e) Zweryfikowanie tokenu i pobranie danych użytkownika
     f) Sprawdzenie czy użytkownik został pomyślnie zidentyfikowany

3. **Obsługa różnych scenariuszy błędów**
   - Każdy krok procesu może zakończyć się niepowodzeniem
   - Dla każdego typu błędu przygotować odpowiednią odpowiedź HTTP:
     - Brak nagłówka: 401 "Authorization header is missing"
     - Nieprawidłowy format: 401 "Authorization header must use Bearer token format"
     - Brak klienta bazy: 500 "Database client not available"
     - Nieprawidłowy token: 401 "Invalid or expired token"
   - Odpowiedzi powinny być spójne z resztą API

4. **Wykorzystanie funkcji w handlerach**
   - W handlerze GET i POST wywołać funkcję autoryzacji
   - Sprawdzić czy autoryzacja zakończyła się sukcesem
   - Jeśli nie, zwrócić gotową odpowiedź błędu
   - Jeśli tak, kontynuować przetwarzanie z danymi użytkownika

5. **Bezpieczeństwo typów**
   - Rozważyć użycie konkretnego typu User zamiast generycznego
   - Można zaimportować typ z biblioteki Supabase lub własnych definicji
   - Zapewni to lepsze wsparcie IDE i bezpieczeństwo typów

**Uwagi implementacyjne:**
- To jest opcjonalny krok, ale znacznie poprawia łatwość utrzymania kodu
- Eliminuje około 50 linii zduplikowanego kodu
- Ułatwia dodawanie kolejnych endpointów wymagających autoryzacji
- Można rozszerzyć w przyszłości o kontrolę dostępu bazującą na rolach

### Krok 5: Testowanie endpointu

**Narzędzia:**
- Postman, Insomnia, lub curl
- Supabase Dashboard do weryfikacji danych

**Scenariusze testowe:**

1. **Test sortowania domyślnego:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:4321/api/tasks
   ```
   Oczekiwany wynik: 200, zadania posortowane po next_due_date rosnąco

2. **Test sortowania malejącego:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:4321/api/tasks?sort=-next_due_date"
   ```
   Oczekiwany wynik: 200, zadania posortowane po next_due_date malejąco

3. **Test sortowania po tytule:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:4321/api/tasks?sort=title"
   ```
   Oczekiwany wynik: 200, zadania posortowane alfabetycznie

4. **Test paginacji:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:4321/api/tasks?limit=10&offset=0"
   ```
   Oczekiwany wynik: 200, pierwszych 10 zadań, has_more = true (jeśli jest więcej)

5. **Test nieprawidłowego sort:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:4321/api/tasks?sort=invalid"
   ```
   Oczekiwany wynik: 400, validation error

6. **Test limit poza zakresem:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:4321/api/tasks?limit=150"
   ```
   Oczekiwany wynik: 400, "Limit must not exceed 100"

7. **Test braku autoryzacji:**
   ```bash
   curl http://localhost:4321/api/tasks
   ```
   Oczekiwany wynik: 401, "Authorization header is missing"

8. **Test nieprawidłowego tokenu:**
   ```bash
   curl -H "Authorization: Bearer invalid_token" \
     http://localhost:4321/api/tasks
   ```
   Oczekiwany wynik: 401, "Invalid or expired token"

### Krok 6: Dodanie indeksów do bazy danych (opcjonalnie)

**Plik:** Nowa migracja Supabase (np. `20251028_add_tasks_indexes.sql`)

**Cel:** Optymalizacja wydajności queries poprzez dodanie odpowiednich indeksów na kolumny używane w sortowaniu.

**Szczegółowy opis:**

1. **Utworzenie pliku migracji bazy danych**
   - Ścieżka: katalog migrations Supabase
   - Format nazwy pliku: data (YYYYMMDD) + opisowa nazwa
   - Przykład: `20251028_add_tasks_indexes.sql`

2. **Indeks dla sortowania po dacie wykonania**
   - Utworzyć złożony indeks na dwóch kolumnach: user_id i next_due_date
   - Zapewnić idempotencję (można uruchomić wielokrotnie)
   - Nazwa: `idx_tasks_user_next_due`
   - Uzasadnienie: będzie najczęściej używany (domyślne sortowanie)

3. **Indeks dla sortowania alfabetycznego**
   - Utworzyć złożony indeks na kolumnach: user_id i title
   - Zapewnić idempotencję operacji
   - Nazwa: `idx_tasks_user_title`
   - Uzasadnienie: używany przy sortowaniu po tytule

4. **Uzasadnienie użycia indeksów złożonych**
   - Wszystkie zapytania filtrują najpierw po user_id
   - Dlatego user_id powinno być pierwszą kolumną w indeksie
   - Druga kolumna odpowiada polu sortowania
   - Indeks złożony pozwala na efektywne wykonanie obu operacji jednocześnie

5. **Dokumentacja w kodzie SQL**
   - Dodać komentarze wyjaśniające cel każdego indeksu
   - Zaznaczyć że osobny indeks na user_id już istnieje (utworzony przez klucz obcy)
   - Dołączyć datę utworzenia migracji i krótki opis

6. **Uruchomienie migracji**
   - Dla lokalnego środowiska: reset bazy lub uruchomienie migracji
   - Dla zdalnego środowiska: wysłanie przez CLI lub interfejs webowy
   - Zweryfikować poprawne utworzenie indeksów po migracji

**Uwagi implementacyjne:**
- To opcjonalny krok, ale krytyczny dla wydajności przy dużej liczbie zadań
- Indeksy zajmują miejsce i spowalniają operacje INSERT/UPDATE, ale przyspieszają SELECT
- Można przetestować plan wykonania zapytań przed i po dodaniu indeksów
- Dla małych zbiorów danych (poniżej 1000 zadań) różnica może być niezauważalna

### Krok 7: Dokumentacja i podsumowanie

**Cel:** Zaktualizowanie dokumentacji projektu i upewnienie się, że wszystkie scenariusze działają poprawnie.

**Szczegółowy opis:**

1. **Aktualizacja README.md**
   - Dodać sekcję "API Endpoints" lub rozszerzyć istniejącą
   - Udokumentować endpoint GET /api/tasks z przykładami użycia
   - Opisać wszystkie query parameters (sort, limit, offset)
   - Pokazać przykładowe wywołania z curl lub JavaScript
   - Opisać strukturę odpowiedzi (lista zadań z metadanymi paginacji)

2. **Aktualizacja przykładów API**
   - Sprawdzić czy istnieje plik z przykładami użycia API
   - Jeśli tak, dodać przykłady wywołań GET /api/tasks:
     - Przykład z domyślnymi parametrami
     - Przykład z sortowaniem malejącym
     - Przykład z paginacją
     - Przykład obsługi błędów
   - Użyć biblioteki zgodnie z konwencją projektu

3. **Testowanie wszystkich scenariuszy**
   - Wykonać wszystkie 8 testów z Kroku 5
   - Sprawdzić logi serwera pod kątem błędów
   - Zweryfikować strukturę odpowiedzi zgodnie z definicjami typów
   - Sprawdzić czy paginacja działa poprawnie (flaga has_more)
   - Przetestować przypadki brzegowe (użytkownik bez zadań, bardzo duży offset)

4. **Lista sprawdzająca do code review**
   - Sprawdzić czy kod przestrzega konwencji projektu
   - Zweryfikować czy wszystkie importy są poprawne
   - Upewnić się, że nie ma nieużywanych zmiennych
   - Sprawdzić czy komunikaty błędów są spójne z resztą API
   - Zweryfikować czy komentarze dokumentacyjne są kompletne

**Uwagi implementacyjne:**
- To jest ostatni krok przed merge do głównej gałęzi
- Dokumentacja jest kluczowa dla innych developerów korzystających z API
- Warto dodać informacje o rate limiting jeśli zostało zaimplementowane

## 10. Checklist wdrożeniowa

### Przed rozpoczęciem
- [ ] Przeczytać cały plan implementacji
- [ ] Upewnić się, że środowisko deweloperskie jest uruchomione
- [ ] Sprawdzić, czy Supabase jest skonfigurowane i dostępne

### Implementacja
- [ ] Krok 1: Przygotowanie schematu walidacji query parameters
- [ ] Krok 2: Dodanie metody getTasks do TaskService
- [ ] Krok 3: Implementacja handlera GET w endpoincie API
- [ ] Krok 4: (Opcjonalnie) Refaktoryzacja - ekstrakcja logiki autoryzacji
- [ ] Krok 5: Testowanie endpointu - wszystkie 8 scenariuszy
- [ ] Krok 6: (Opcjonalnie) Dodanie indeksów do bazy danych
- [ ] Krok 7: Dokumentacja i podsumowanie

### Po implementacji
- [ ] Sprawdzić linter errors (`npm run lint`)
- [ ] Uruchomić build (`npm run build`)
- [ ] Przetestować w środowisku deweloperskim
- [ ] Code review
- [ ] Merge do głównej gałęzi
- [ ] Deploy

## 11. Potencjalne problemy i rozwiązania

### Problem 1: RLS nie działa poprawnie
**Symptom:** Użytkownik widzi zadania innych użytkowników
**Rozwiązanie:** 
- Sprawdzić polityki RLS w Supabase Dashboard
- Upewnić się, że polityka SELECT ma warunek `user_id = auth.uid()`
- Sprawdzić, czy RLS jest włączone dla tabeli tasks

### Problem 2: Sortowanie nie działa
**Symptom:** Zadania nie są posortowane zgodnie z parametrem sort
**Rozwiązanie:**
- Sprawdzić funkcję parseSortParam
- Sprawdzić czy wartość `ascending` jest poprawnie przekazana do `.order()`
- Zweryfikować w Supabase Dashboard wykonane query

### Problem 3: Pagination zwraca nieprawidłowe has_more
**Symptom:** has_more jest true, gdy nie ma więcej wyników
**Rozwiązanie:**
- Sprawdzić logikę: `hasMore = offset + limit < total`
- Upewnić się, że `count` query zwraca prawidłową liczbę

### Problem 4: Query params nie są parsowane
**Symptom:** Domyślne wartości są zawsze używane
**Rozwiązanie:**
- Sprawdzić `url.searchParams.get()` czy zwraca wartości
- Upewnić się, że Zod schema używa `z.coerce.number()` dla limit/offset
- Sprawdzić czy URL jest prawidłowy (zawiera query string)

### Problem 5: Wydajność jest niska
**Symptom:** Query trwa > 1s
**Rozwiązanie:**
- Sprawdzić czy indeksy są utworzone (EXPLAIN ANALYZE w SQL)
- Rozważyć zmniejszenie limitu default do 20
- Dodać cache dla często używanych queries

## 12. Przyszłe usprawnienia

1. **Cursor-based pagination** zamiast offset-based
   - Bardziej wydajne dla dużych zbiorów danych
   - Unikanie problemów z offset przy dużych wartościach

2. **Filtering**
   - Filtrowanie po `interval_unit`
   - Filtrowanie po zakresie dat `next_due_date`
   - Filtrowanie po `last_action_type`

3. **Full-text search**
   - Wyszukiwanie po `title` i `description`
   - Wykorzystanie PostgreSQL full-text search

4. **Caching**
   - Redis cache dla często pobieranych danych
   - Invalidacja przy zmianach
   - TTL 5-10 minut

5. **GraphQL endpoint**
   - Alternatywa dla REST API
   - Pozwala klientowi wybrać dokładnie potrzebne pola

6. **Rate limiting**
   - Ochrona przed abuse
   - Limit per user/IP

7. **Response compression**
   - Gzip/Brotli compression dla dużych odpowiedzi
   - Zmniejszenie transferu danych

