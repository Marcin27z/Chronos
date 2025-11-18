## API Endpoint Implementation Plan: PUT /api/tasks/{taskId}

## 1. Przegląd punktu końcowego

Endpoint służy do aktualizacji istniejącego zadania cyklicznego użytkownika. Umożliwia częściową aktualizację wybranych pól (wszystkie pola w żądaniu są opcjonalne, ale co najmniej jedno musi być przekazane), przy jednoczesnym zapewnieniu spójności danych i bezpieczeństwa dostępu. Gdy zmienione zostaną ustawienia interwału (`interval_value`, `interval_unit`, `preferred_day_of_week`), `next_due_date` jest ponownie obliczane na podstawie nowej konfiguracji i aktualnej daty, zgodnie z logiką biznesową warstwy serwisu.

**Główne funkcjonalności:**
- **Aktualizacja danych zadania**: tytułu, opisu oraz parametrów interwału.
- **Przeliczenie `next_due_date`** po zmianie ustawień interwału od bieżącej daty.
- **Weryfikacja własności**: użytkownik może aktualizować tylko własne zadania.
- **Spójna obsługa błędów**: walidacja, autentykacja, autoryzacja, błędy bazy danych.

Endpoint musi być spójny z istniejącymi endpointami `GET /api/tasks/{taskId}`, `GET /api/tasks`, `POST /api/tasks` oraz logiką serwisu `TaskService` w warstwie `src/lib/services`.

## 2. Szczegóły żądania

- **Metoda HTTP**: `PUT`
- **Struktura URL**: `/api/tasks/{taskId}`
- **Wymagane uwierzytelnianie**: nagłówek `Authorization: Bearer {access_token}` (Supabase Auth)
- **Format treści**: `Content-Type: application/json`

### 2.1. Parametry

- **Parametry URL (wymagane):**
  - **`taskId`**:
    - Typ: identyfikator w formacie UUID (string).
    - Źródło: segment ścieżki URL `{taskId}`.
    - Walidacja: musi być poprawnym UUID; w przeciwnym razie 400 Bad Request.

- **Nagłówki HTTP (wymagane):**
  - **`Authorization`**:
    - Format: `Bearer {access_token}`.
    - Wymagany w każdym żądaniu; brak lub nieprawidłowy token powoduje 401 Unauthorized.
  - **`Content-Type`**:
    - Wymagany: `application/json`.
    - Nieprawidłowy lub brakujący typ powoduje traktowanie treści jako nieprawidłowej (400 Bad Request).

- **Query parameters:**
  - Brak (endpoint nie używa parametrów zapytania).

### 2.2. Body żądania

Body jest wymagane i musi zawierać co najmniej jedno pole spośród poniższych. Wszystkie pola są opcjonalne, ale żądanie bez żadnych pól skutkuje błędem walidacji (400 Bad Request).

- **`title`**:
  - Typ: tekst.
  - Opcjonalne, ale jeśli podane:
    - Nie może być pustym stringiem po przycięciu białych znaków.
    - Maksymalna długość: 256 znaków (zgodnie z `VARCHAR(256)` w tabeli `tasks`).

- **`description`**:
  - Typ: tekst lub `null`.
  - Opcjonalne:
    - `null` oznacza wyczyszczenie opisu.
    - Tekst może być dowolnej długości, ale zalecana walidacja na rozsądny rozmiar (np. maksymalnie kilka kB), aby uniknąć nadużyć.

- **`interval_value`**:
  - Typ: liczba całkowita.
  - Opcjonalne, ale jeśli podane:
    - Wartość > 0 i < 1000 (zgodnie z ograniczeniem w bazie).
    - Powinno być liczbą całkowitą, nie dopuszczamy wartości ułamkowych.

- **`interval_unit`**:
  - Typ: enum tekstowy.
  - Opcjonalne, ale jeśli podane:
    - Dopuszczalne wartości: `days`, `weeks`, `months`, `years` (zgodnie z typem `interval_unit_type`).

- **`preferred_day_of_week`**:
  - Typ: liczba całkowita lub `null`.
  - Opcjonalne, ale jeśli podane:
    - `null` oznacza brak preferowanego dnia tygodnia.
    - Liczba całkowita w zakresie od 0 do 6, gdzie 0 = niedziela, 6 = sobota (zgodnie z ograniczeniem bazy danych).

**Reguły kombinacji pól:**
- Co najmniej jedno z pól `title`, `description`, `interval_value`, `interval_unit`, `preferred_day_of_week` musi być obecne w body.
- Jeśli zmieniane są jakiekolwiek ustawienia interwału (`interval_value`, `interval_unit`, `preferred_day_of_week`), `next_due_date` musi zostać przeliczona:
  - Na podstawie bieżącej daty (UTC, bez części czasowej).
  - Z użyciem logiki identycznej jak przy tworzeniu zadania (`calculateNextDueDate` w `TaskService`).
- Możliwe jest przesłanie tylko części konfiguracji interwału:
  - Jeśli podane jest tylko `interval_unit`, nowy interwał jest liczony z istniejącej wartości `interval_value` i nowej jednostki.
  - Jeśli podane jest tylko `interval_value`, używana jest dotychczasowa jednostka `interval_unit`.
  - Jeśli podany jest tylko `preferred_day_of_week`, interwał jest liczony na podstawie dotychczasowych `interval_value` i `interval_unit`, ale wynik dostosowywany do nowego preferowanego dnia tygodnia.

## 3. Wykorzystywane typy (DTOs i Command Modele)

### 3.1. Command model wejściowy

- **`UpdateTaskCommand`** (istniejący w `src/types.ts`):
  - Reprezentuje zestaw danych możliwych do aktualizacji na zadaniu.
  - Typowo zawiera następujące pola (wszystkie opcjonalne, zgodne z tabelą `tasks`):
    - `title` (tekst).
    - `description` (tekst lub `null`).
    - `interval_value` (liczba całkowita > 0 i < 1000).
    - `interval_unit` (jedna z wartości `days`, `weeks`, `months`, `years`).
    - `preferred_day_of_week` (liczba całkowita 0–6 lub `null`).
  - Model jest używany w warstwie serwisu (`TaskService`) jako kontrakt dla operacji aktualizacji.

### 3.2. DTO odpowiedzi

- **`TaskDTO`** (alias encji `Task` w `src/types.ts`):
  - Reprezentuje pełny wiersz tabeli `tasks` i jest używany we wszystkich odpowiedziach dotyczących pojedynczego zadania.
  - Zawiera pola:
    - `id` (UUID zadania).
    - `user_id` (UUID właściciela).
    - `title`.
    - `description` (tekst lub `null`).
    - `interval_value`.
    - `interval_unit`.
    - `preferred_day_of_week` (`0–6` lub `null`).
    - `next_due_date` (data w formacie `YYYY-MM-DD`).
    - `last_action_date` (data lub `null`).
    - `last_action_type` (`completed`, `skipped` lub `null`).
    - `created_at` (znacznik czasu UTC).
    - `updated_at` (znacznik czasu UTC, aktualizowany przez trigger bazy).

- **`ErrorDTO`**:
  - Struktura błędu ogólnego:
    - `error`: główna wiadomość błędu (krótki opis).
    - `details` (opcjonalne): dodatkowe informacje (ujawniane tylko w środowisku developerskim).

- **`ValidationErrorDTO`**:
  - Struktura błędu walidacji danych wejściowych:
    - `error`: ogólne podsumowanie błędu walidacji (np. „Invalid request payload”).
    - `details`: lista szczegółów (`ValidationErrorDetail`) dla poszczególnych pól.

- **`ValidationErrorDetail`**:
  - Struktura pojedynczego błędu pola:
    - `field`: nazwa pola, które nie przeszło walidacji (np. `interval_value`).
    - `message`: czytelny opis problemu (np. „interval_value must be an integer between 1 and 999”).

### 3.3. Typy pomocnicze walidacji

- **`TaskIdParam`**:
  - Typ danych dla parametru URL `taskId`, oparty na schemacie walidacji UUID.
  - Używany do bezpiecznego typowania wartości po walidacji.

- **Schematy Zod (poziom HTTP, w `validation.utils.ts`):**
  - **`taskIdParamSchema`** (istniejący):
    - Zapewnia walidację formatu UUID dla parametru `taskId`.
  - **`updateTaskBodySchema`** (nowy):
    - Obiekt z polami `title`, `description`, `interval_value`, `interval_unit`, `preferred_day_of_week` (wszystkie opcjonalne).
    - Dodatkowa reguła walidacji, która wymusza, aby co najmniej jedno pole było obecne.
    - Wbudowane ograniczenia zgodne z definicją tabeli `tasks` (długości, zakresy, dozwolone wartości).
    - Na podstawie schematu można wyprowadzić typ pomocniczy do dalszego mapowania na `UpdateTaskCommand`.

## 4. Szczegóły odpowiedzi

### 4.1. Sukces – 200 OK

- **Warunki:**
  - Użytkownik jest prawidłowo uwierzytelniony.
  - Parametr `taskId` jest poprawnym UUID.
  - Zadanie istnieje i należy do zalogowanego użytkownika.
  - Body żądania przeszło wszystkie reguły walidacji.
  - Operacja aktualizacji w bazie danych zakończyła się powodzeniem.

- **Nagłówki odpowiedzi:**
  - `Content-Type: application/json`.

- **Body odpowiedzi:**
  - Obiekt typu `TaskDTO` reprezentujący stan zadania po aktualizacji, w tym:
    - Zaktualizowane pola przekazane w żądaniu.
    - Zaktualizowane `next_due_date`, jeśli zmieniono ustawienia interwału.
    - Zaktualizowane `updated_at` (ustawione przez trigger bazy).

### 4.2. Błąd – 400 Bad Request

- **Typowe scenariusze:**
  - Nieprawidłowy format `taskId` (nie-UUID).
  - Niepoprawne body żądania:
    - Brak jakichkolwiek pól do aktualizacji.
    - Nieprawidłowe typy (np. `interval_value` jako string).
    - Naruszenie ograniczeń (np. `interval_value` poza zakresem, `title` zbyt długie).
    - Nieprawidłowa wartość `interval_unit` spoza dozwolonego zbioru.
    - `preferred_day_of_week` poza zakresem `0–6`.

- **Struktura odpowiedzi:**
  - `ValidationErrorDTO` z:
    - `error`: ogólny komunikat o błędzie walidacji.
    - `details`: lista błędów poszczególnych pól, jeśli to możliwe.

### 4.3. Błąd – 401 Unauthorized

- **Typowe scenariusze:**
  - Brak nagłówka `Authorization`.
  - Nieprawidłowy format nagłówka (np. brak prefiksu `Bearer`).
  - Token JWT nieprawidłowy, wygasły lub odwołany.

- **Struktura odpowiedzi:**
  - `ErrorDTO` z:
    - `error`: np. „Unauthorized” lub „Authentication required”.
    - `details`: opis błędu w środowisku developerskim (np. typ błędu zwrócony przez Supabase).

### 4.4. Błąd – 404 Not Found

- **Typowe scenariusze:**
  - Zadanie o podanym `taskId` nie istnieje.
  - Zadanie istnieje, ale należy do innego użytkownika (próba eskalacji poziomej uprawnień).

- **Strategia bezpieczeństwa:**
  - W obu przypadkach zwracamy identyczną odpowiedź 404, aby nie ujawniać informacji o istnieniu zasobu należącego do innego użytkownika.

- **Struktura odpowiedzi:**
  - `ErrorDTO` z:
    - `error`: np. „Task not found”.
    - Bez pola `details` w środowisku produkcyjnym.

### 4.5. Błąd – 500 Internal Server Error

- **Typowe scenariusze:**
  - Błąd bazy danych (np. utrata połączenia, timeout).
  - Nieoczekiwany błąd w kodzie serwisu lub endpointu (np. wyjątek w logice `calculateNextDueDate`).
  - Brak klienta Supabase w `locals` (błąd konfiguracji middleware).

- **Struktura odpowiedzi:**
  - `ErrorDTO` z:
    - `error`: „Internal server error”.
    - `details`: dodatkowy opis błędu w środowisku developerskim (np. komunikat wyjątku).

## 5. Przepływ danych

### 5.1. Ogólny przepływ

1. **Klient** wysyła żądanie `PUT /api/tasks/{taskId}` z nagłówkiem `Authorization` i body JSON.
2. **Astro Middleware**:
   - Odczytuje nagłówek `Authorization`.
   - Inicjalizuje klienta Supabase i umieszcza go w `context.locals.supabase`.
3. **API Route Handler (`src/pages/api/tasks/[taskId].ts`, metoda `PUT`)**:
   - Waliduje obecność klienta Supabase w `locals`.
   - Używa funkcji `authenticateUser` do uwierzytelnienia użytkownika poprzez Supabase Auth.
   - Waliduje parametr `taskId` za pomocą `taskIdParamSchema`.
   - Odczytuje body JSON i waliduje je przy pomocy `updateTaskBodySchema`.
   - Przekształca wynik walidacji na `UpdateTaskCommand`.
   - Tworzy instancję `TaskService` z klientem Supabase.
   - Wywołuje metodę `updateTask(userId, taskId, command)`.
   - Na podstawie wyniku:
     - Zwraca 200 z `TaskDTO` w przypadku sukcesu.
     - Zwraca 404 w przypadku braku zadania lub braku uprawnień.
     - Zwraca 500 w przypadku innych błędów serwera.
4. **TaskService (`src/lib/services/task.service.ts`)**:
   - Pobiera istniejące zadanie z tabeli `tasks` filtrując po `id` i `user_id`.
   - Jeśli zadanie nie istnieje lub należy do innego użytkownika, rzuca błąd biznesowy (np. z komunikatem „Task not found or does not belong to user”).
   - Buduje obiekt aktualizacji z pól obecnych w `UpdateTaskCommand`.
   - Jeśli zmieniono ustawienia interwału, oblicza nowe `next_due_date` z użyciem istniejącej funkcji obliczającej datę.
   - Wykonuje aktualizację rekordu w `tasks` i zwraca zaktualizowany obiekt jako `TaskDTO`.
5. **Baza danych (Supabase / PostgreSQL)**:
   - Zastosowanie RLS (Row Level Security) zapewnia dodatkową warstwę filtracji po `user_id`.
   - Trigger aktualizuje pole `updated_at`.

### 5.2. Interakcje z bazą danych

- **Zapytanie odczytu (w `updateTask`)**:
  - Tabela: `tasks`.
  - Filtry: `id = :taskId` oraz `user_id = :userId`.
  - Oczekiwany wynik: dokładnie jeden rekord lub brak (błąd).
  - Cel: potwierdzenie własności oraz odczyt aktualnych wartości interwału.

- **Zapytanie aktualizacji**:
  - Tabela: `tasks`.
  - Aktualizowane pola:
    - Tylko pola obecne w `UpdateTaskCommand` (podejście „whitelist”).
    - Opcjonalnie `next_due_date`, jeśli wymagana jest rekalkulacja.
  - Filtry: `id = :taskId` oraz `user_id = :userId`.
  - Zwracany wynik: zaktualizowany rekord (pełna struktura zadania).

- **Zależność od logiki dat:**
  - Funkcja odpowiedzialna za obliczanie `next_due_date` musi działać spójnie z innymi operacjami (`createTask`, `performTaskAction`).
  - Podstawą jest aktualna data UTC, bez części czasowej (tylko dzień).

## 6. Względy bezpieczeństwa

### 6.1. Uwierzytelnianie (Authentication)

- **Mechanizm**:
  - Token JWT Supabase Auth przekazywany w nagłówku `Authorization`.
  - Funkcja `authenticateUser` weryfikuje token, zwraca obiekt użytkownika lub odpowiedź błędu.

- **Założenia**:
  - Wszystkie żądania do tego endpointu muszą być wykonywane z ważnym tokenem.
  - Brak tokenu lub błędny token skutkuje odpowiedzią 401 bez wykonywania zapytań do bazy.

### 6.2. Autoryzacja (Authorization)

- **Poziomy zabezpieczeń:**
  - Na poziomie aplikacji:
    - Serwis `TaskService` zawsze filtruje zapytania po `user_id` (przekazanym z kontekstu uwierzytelnionego użytkownika).
    - Aktualizacja jest wykonywana tylko, gdy zadanie należy do użytkownika.
  - Na poziomie bazy danych:
    - RLS na tabeli `tasks` ogranicza operacje do rekordów, których `user_id` jest równy `auth.uid()`.
    - Dodatkowa warstwa „defense in depth” nawet w przypadku błędu w logice aplikacji.

- **Ochrona przed eskalacją poziomą (horizontal privilege escalation):**
  - Użytkownik nie może aktualizować zadań innych użytkowników za pomocą „zgadywania” identyfikatorów UUID.
  - W takich przypadkach serwis traktuje zadanie jak nieistniejące i endpoint zwraca 404, nie 403.

### 6.3. Walidacja danych wejściowych

- **Cele walidacji:**
  - Odrzucenie nieprawidłowych żądań jak najwcześniej (zasada „fail fast”).
  - Zapewnienie zgodności z ograniczeniami bazy danych.
  - Ochrona przed błędami runtime (np. błędy podczas konwersji typów).

- **Zakres walidacji:**
  - `taskId`:
    - Walidacja formatu UUID przed jakimkolwiek zapytaniem do bazy.
  - Body:
    - Sprawdzenie, że co najmniej jedno pole zostało przekazane.
    - Sprawdzenie typów i zakresów (np. `interval_value`, `preferred_day_of_week`).
    - Sprawdzenie dozwolonych wartości enum (`interval_unit`).
    - Upewnienie się, że `title` nie jest pusty i mieści się w limicie długości.
    - Dopuszczenie `null` dla pól, gdzie jest to semantycznie właściwe (`description`, `preferred_day_of_week`).

### 6.4. Ograniczenie zakresu aktualizowanych pól (mass assignment protection)

- **Zasada:**
  - Nigdy nie należy przekazywać kompletnie sparsowanego body bezpośrednio do operacji `update` w bazie.
  - Zamiast tego należy tworzyć obiekt aktualizacji poprzez jawne wylistowanie możliwych pól (`whitelist`).

- **Pola, które nie mogą być aktualizowane przez ten endpoint:**
  - `id`, `user_id` (identyfikatory).
  - `next_due_date` (zarządzane przez logikę serwisu).
  - `last_action_date`, `last_action_type`.
  - `created_at`, `updated_at`.

### 6.5. Ograniczenie ujawniania informacji (information disclosure)

- **Zasady:**
  - Odpowiedzi dla przypadków „zadanie nie istnieje” i „zadanie należy do innego użytkownika” są identyczne (404).
  - Szczegóły wyjątków technicznych (`details`) są zwracane tylko w środowisku developerskim.
  - Tokeny i inne wrażliwe dane nie są logowane w konsoli.

## 7. Obsługa błędów

### 7.1. Scenariusze błędów i kody statusu

- **Błąd walidacji parametru URL – 400 Bad Request:**
  - Warunek: `taskId` nie jest poprawnym UUID.
  - Działanie:
    - Zwrócenie `ValidationErrorDTO` z informacją o polu `taskId`.
    - Brak zapytań do bazy danych.

- **Błąd walidacji body – 400 Bad Request:**
  - Warunki:
    - Body jest puste lub nie zawiera żadnego z oczekiwanych pól.
    - Nieprawidłowy typ lub wartość dla któregoś z pól.
  - Działanie:
    - Zwrócenie `ValidationErrorDTO` z listą błędów dla poszczególnych pól.

- **Brak autoryzacji – 401 Unauthorized:**
  - Warunki:
    - Brak lub nieprawidłowy nagłówek `Authorization`.
    - Nieprawidłowy lub wygasły token JWT.
  - Działanie:
    - Zwrócenie `ErrorDTO` z komunikatem mówiącym o konieczności uwierzytelnienia.

- **Zadanie nie istnieje lub należy do innego użytkownika – 404 Not Found:**
  - Warunki:
    - `TaskService` nie znajduje zadania o danym `taskId` i `user_id`.
  - Działanie:
    - Zwrócenie `ErrorDTO` z ogólnym komunikatem „Task not found”.
    - W logach można zapisać więcej kontekstu (np. `taskId` i `userId`).

- **Błąd bazy danych lub nieoczekiwany wyjątek – 500 Internal Server Error:**
  - Warunki:
    - Błędy Supabase (np. problem z połączeniem lub zapytaniem).
    - Nieoczekiwane wyjątki w logice biznesowej lub handlerze.
  - Działanie:
    - Logowanie błędu na poziomie `error` z kontekstem (np. identyfikatory, wiadomość, stack trace).
    - Zwrócenie `ErrorDTO` z ogólnym komunikatem „Internal server error”.

### 7.2. Strategia logowania błędów

- **Poziomy logowania:**
  - Błędy 500: logowane jako `error` wraz z pełnym kontekstem i stack trace (bez wrażliwych danych).
  - Błędy 400 i 401: logowane jako `warn` (mogą sygnalizować niewłaściwe użycie lub próby ataku).
  - Błędy 404: logowane jako `info` (typowe w normalnym działaniu).

- **Struktura logów:**
  - Log powinien zawierać:
    - Znacznik czasu.
    - Nazwę endpointu (`PUT /api/tasks/{taskId}`).
    - `taskId` (jeśli dostępne).
    - `userId` (jeśli użytkownik jest znany).
    - Typ błędu (np. „ValidationError”, „DatabaseError”).
    - Krótki opis i ewentualnie stack trace.

- **Rejestracja w tabeli błędów (jeśli zostanie wprowadzona):**
  - Obecnie schemat bazy nie przewiduje dedykowanej tabeli logów błędów.
  - W przyszłości można rozważyć wprowadzenie tabeli `error_logs` z polami takimi jak:
    - `id`, `timestamp`, `user_id`, `endpoint`, `status_code`, `error_message`, `stack_trace`, `context`.
  - Endpoint może wtedy, w bloku obsługi błędów 500, zapisywać wpis do tej tabeli obok logowania do konsoli.

## 8. Rozważania dotyczące wydajności

### 8.1. Liczba zapytań do bazy danych

- Każde żądanie `PUT` wykonuje:
  - Jedno zapytanie odczytu (`SELECT`) do pobrania zadania i weryfikacji własności.
  - Jedno zapytanie aktualizujące (`UPDATE`) z pobraniem zaktualizowanego rekordu.
- Jest to akceptowalne z punktu widzenia wydajności:
  - Zapytania filtrowane są po zindeksowanych kolumnach (`id`, `user_id`).
  - Liczba rekordów na użytkownika jest relatywnie niewielka.

### 8.2. Indeksy i RLS

- Indeksy:
  - `tasks_pkey` (indeks po `id`).
  - Indeksy złożone z `user_id` wykorzystywane do optymalizacji zapytań.
- RLS:
  - Polityki RLS dodają niewielki narzut, ale znacząco poprawiają bezpieczeństwo.
  - Ich wpływ na wydajność jest minimalny w typowych scenariuszach.

### 8.3. Algorytm obliczania `next_due_date`

- Algorytm używany do obliczania `next_due_date`:
  - Operuje wyłącznie na obiektach daty w pamięci.
  - Ma złożoność stałą (brak pętli zależnych od danych).
- Potencjalne miejsca optymalizacji:
  - Unikanie ponownego przeliczania `next_due_date`, jeśli wartości interwału w żądaniu są identyczne jak aktualne (możliwe dopiero po pobraniu zadania).
  - W pierwszej wersji można przyjąć prostszą logikę: każda zmiana któregokolwiek z pól interwału powoduje przeliczenie.

### 8.4. Skalowalność

- Endpoint jest bezstanowy (stateless):
  - Brak przechowywania stanu w pamięci między żądaniami.
  - Łatwy do poziomego skalowania (wiele instancji aplikacji za load balancerem).
- Supabase zapewnia connection pooling i skalowalność bazy danych:
  - Aplikacja powinna korzystać z tego samego klienta per żądanie (dostarczanego przez middleware).

### 8.5. Monitoring i metryki

- Kluczowe metryki:
  - Czas odpowiedzi endpointu (`p50`, `p95`, `p99`).
  - Odsetek błędów 4xx i 5xx.
  - Czas wykonania zapytań do bazy danych (monitorowany po stronie Supabase).
- Ewentualne problemy:
  - Wzrost liczby błędów 500 może sygnalizować problemy z bazą danych.
  - Wzrost średniego czasu odpowiedzi może skłonić do optymalizacji logiki lub skalowania infrastruktury.

## 9. Etapy wdrożenia

### 9.1. Krok 1: Rozszerzenie warstwy walidacji (Zod)

- **Cel:** Zdefiniowanie schematu walidacji dla body żądania aktualizacji (`updateTaskBodySchema`) oraz zapewnienie, że zawiera on biznesowe reguły walidacji.
- **Lokalizacja:** plik `src/lib/utils/validation.utils.ts`.

**Zadania:**
- Dodać schemat obiektu reprezentujący body żądania:
  - Pola `title`, `description`, `interval_value`, `interval_unit`, `preferred_day_of_week` jako opcjonalne.
  - Walidacja typów i ograniczeń (długość, zakres, dozwolone wartości).
- Dodać dodatkową regułę (np. `refine`), która weryfikuje, że co najmniej jedno pole jest obecne.
- Zapewnić, że komunikaty błędów są czytelne i pomagają w debugowaniu.
- Opcjonalnie wyeksportować powiązany typ TypeScript wyprowadzony z tego schematu (dla użycia w handlerze i serwisie).

**Przypadki testowe (manualne lub jednostkowe):**
- Body z pojedynczym poprawnym polem (np. tylko `title`) powinno przechodzić walidację.
- Body ze wszystkimi polami poprawnymi powinno przechodzić walidację.
- Body bez żadnych pól powinno generować błąd walidacji.
- Wartości poza zakresem (`interval_value`, `preferred_day_of_week`) powinny generować odpowiednie komunikaty.

### 9.2. Krok 2: Rozszerzenie `TaskService` o metodę aktualizacji

- **Cel:** Dodanie nowej publicznej metody `updateTask` realizującej logikę aktualizacji zadania z zapewnieniem własności i ponownego przeliczenia `next_due_date` w razie potrzeby.
- **Lokalizacja:** plik `src/lib/services/task.service.ts`.

**Założenia dla `updateTask(userId, taskId, command)`:**
- Argumenty:
  - `userId`: identyfikator zalogowanego użytkownika (UUID).
  - `taskId`: identyfikator aktualizowanego zadania (UUID).
  - `command`: obiekt `UpdateTaskCommand` z polami do aktualizacji.

**Kroki wewnątrz metody:**
- Pobranie zadania:
  - Wykonać zapytanie `SELECT` po `id` i `user_id`.
  - Jeśli brak danych lub błąd: rzucić błąd biznesowy informujący, że zadanie nie istnieje lub nie należy do użytkownika.
- Zbudowanie obiektu aktualizacji:
  - Rozpocząć od pustego obiektu.
  - Dla każdego pola z `command`, które jest zdefiniowane, dodać odpowiednią właściwość do obiektu aktualizacji (np. `title`, `description`, `interval_value`, `interval_unit`, `preferred_day_of_week`).
- Rekalkulacja `next_due_date`:
  - Sprawdzić, czy którykolwiek z atrybutów interwału jest obecny w `command`.
  - Wyznaczyć końcowe wartości interwału:
    - Dla pól nieobecnych w `command` użyć wartości z aktualnego zadania.
  - Użyć istniejącej logiki obliczania daty (`calculateNextDueDate`) do wyznaczenia nowego `next_due_date` na podstawie:
    - Aktualnej daty (z funkcji opisującej bieżącą datę w UTC).
    - Końcowych wartości `interval_value`, `interval_unit`, `preferred_day_of_week`.
  - Dodać `next_due_date` do obiektu aktualizacji.
- Wykonanie aktualizacji:
  - Wykonać zapytanie `UPDATE` na tabeli `tasks` z zastosowaniem filtra `id` i `user_id`.
  - Zwrócić zaktualizowany rekord jako `TaskDTO`.
  - W przypadku błędów (brak rekordu, błąd bazodanowy) rzucić odpowiedni wyjątek.

**Spójność z istniejącym kodem:**
- Użyć już istniejących metod pomocniczych do pracy z datami (`calculateNextDueDate`, funkcje do obliczania aktualnej daty).
- Zastosować analogiczny sposób obsługi błędów jak w metodzie `performTaskAction`.
- Zapewnić dokumentację JSDoc opisującą parametry, zwracaną wartość oraz możliwe wyjątki.

### 9.3. Krok 3: Implementacja handlera `PUT` w pliku `[taskId].ts`

- **Cel:** Dodanie obsługi metody `PUT` w istniejącym pliku `src/pages/api/tasks/[taskId].ts` zgodnie z konwencją Astro i spójnie z istniejącym handlerem `GET`.

**Zadania w handlerze `PUT`:**
- Konfiguracja:
  - Upewnić się, że `export const prerender = false` pozostaje zdefiniowane (już istnieje dla `GET`).
- Uwierzytelnianie:
  - Odczytać klienta Supabase z `locals`.
  - Jeśli klient nie jest dostępny, zwrócić 500.
  - Wywołać `authenticateUser(request, supabase)` i obsłużyć potencjalną odpowiedź błędną (401).
- Walidacja `taskId`:
  - Używać `taskIdParamSchema` do walidacji parametru `taskId`.
  - W przypadku błędu walidacji zwrócić 400 z informacją o błędzie.
- Walidacja body:
  - Odczytać body jako JSON.
  - Jeśli body jest niepoprawne (np. nieudana deserializacja), zwrócić 400.
  - Przetestować body za pomocą `updateTaskBodySchema`.
  - W przypadku błędów walidacji zbudować `ValidationErrorDTO` z listą błędów i zwrócić 400.
- Wywołanie serwisu:
  - Utworzyć instancję `TaskService` z klientem Supabase.
  - Wywołać `updateTask(user.id, taskId, command)` z poprawnie zmapowanym `command`.
  - Obsłużyć błąd „not found or does not belong to user” jako 404 Not Found.
- Sukces:
  - Zwrócić 200 OK z obiektem `TaskDTO`.
- Obsługa pozostałych błędów:
  - Osłonić główną część handlera blokiem `try-catch`.
  - Logować błędy na poziomie `error`.
  - Dla nieoczekiwanych błędów zwracać 500 z ogólnym komunikatem.

### 9.4. Krok 4: Testy manualne endpointu

- **Cel:** Zweryfikowanie poprawności działania nowego endpointu w typowych i brzegowych scenariuszach.

**Scenariusze sukcesu:**
- Aktualizacja tylko tytułu zadania:
  - Sprawdzić, że `title` się zmienił, a `next_due_date` pozostało bez zmian.
- Aktualizacja jedynie parametrów interwału:
  - Sprawdzić, że `next_due_date` jest przeliczane od bieżącej daty zgodnie z nową konfiguracją.
- Aktualizacja kilku pól jednocześnie (np. `title` i `interval_value`).

**Scenariusze błędne:**
- Żądanie bez jakichkolwiek pól w body:
  - Oczekiwany status: 400, z informacją o braku pól do aktualizacji.
- Nieprawidłowy `taskId` (nie-UUID):
  - Oczekiwany status: 400.
- Brak nagłówka autoryzacji:
  - Oczekiwany status: 401.
- Próba aktualizacji zadania innego użytkownika:
  - Oczekiwany status: 404 z ogólnym komunikatem.

### 9.5. Krok 5: Weryfikacja integracji i jakości

- **Integracja z middleware:**
  - Upewnić się, że `locals.supabase` jest dostępne w handlerze.
  - Zweryfikować, że `authenticateUser` działa poprawnie w scenariuszach sukcesu i błędu.

- **Linting i kompilacja:**
  - Uruchomić linter oraz kompilację TypeScript.
  - Naprawić wszystkie błędy i istotne ostrzeżenia.

- **Spójność z innymi endpointami:**
  - Sprawdzić, że struktura odpowiedzi i obsługa błędów jest spójna z:
    - `GET /api/tasks/{taskId}`.
    - `POST /api/tasks`.
    - Handlerami `complete` i `skip`.

- **Dokumentacja:**
  - Upewnić się, że niniejszy plan jest aktualny i odzwierciedla ostateczną implementację.
  - Opcjonalnie dodać przykłady użycia endpointu do dokumentacji API, aby ułatwić pracę zespołowi frontend.


