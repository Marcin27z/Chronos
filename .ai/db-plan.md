# Database Schema - Chronos (Cykliczne Zadania)

## 1. Tabele

### 1.1. `tasks`

Tabela przechowująca zadania cykliczne użytkowników.

| Kolumna | Typ danych | Ograniczenia | Opis |
|---------|-----------|--------------|------|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unikalny identyfikator zadania |
| `user_id` | `UUID` | `NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` | Identyfikator właściciela zadania |
| `title` | `VARCHAR(256)` | `NOT NULL` | Tytuł zadania |
| `description` | `TEXT` | `NULL` | Opcjonalny opis zadania |
| `interval_value` | `INTEGER` | `NOT NULL CHECK (interval_value > 0 AND interval_value < 1000)` | Wartość interwału powtarzania |
| `interval_unit` | `interval_unit_type` | `NOT NULL` | Jednostka interwału (ENUM) |
| `preferred_day_of_week` | `SMALLINT` | `NULL CHECK (preferred_day_of_week IS NULL OR (preferred_day_of_week >= 0 AND preferred_day_of_week <= 6))` | Preferowany dzień tygodnia (0=niedziela, 6=sobota, NULL=brak preferencji) |
| `next_due_date` | `DATE` | `NOT NULL` | Data następnego wykonania (kalkulowana przez aplikację) |
| `last_action_date` | `DATE` | `NULL` | Data ostatniej akcji |
| `last_action_type` | `action_type` | `NULL` | Typ ostatniej akcji (ENUM, NULL=nigdy nie wykonane) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Data utworzenia zadania (UTC) |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Data ostatniej aktualizacji (UTC) |

**Ograniczenia tabeli:**
- `PRIMARY KEY (id)`
- `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`
- `CHECK (interval_value > 0 AND interval_value < 1000)`
- `CHECK (preferred_day_of_week IS NULL OR (preferred_day_of_week >= 0 AND preferred_day_of_week <= 6))`

---

### 1.2. `task_templates`

Tabela przechowująca globalne szablony zadań dla funkcji onboardingu i strony pomocy.

| Kolumna | Typ danych | Ograniczenia | Opis |
|---------|-----------|--------------|------|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unikalny identyfikator szablonu |
| `title` | `VARCHAR(256)` | `NOT NULL` | Tytuł szablonu zadania |
| `description` | `TEXT` | `NULL` | Opcjonalny opis szablonu |
| `interval_value` | `INTEGER` | `NOT NULL CHECK (interval_value > 0 AND interval_value < 1000)` | Wartość interwału powtarzania |
| `interval_unit` | `interval_unit_type` | `NOT NULL` | Jednostka interwału (ENUM) |
| `preferred_day_of_week` | `SMALLINT` | `NULL CHECK (preferred_day_of_week IS NULL OR (preferred_day_of_week >= 0 AND preferred_day_of_week <= 6))` | Preferowany dzień tygodnia |
| `category` | `VARCHAR(100)` | `NULL` | Kategoria szablonu dla grupowania w UI |
| `display_order` | `INTEGER` | `NOT NULL UNIQUE` | Kolejność wyświetlania szablonu |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT TRUE` | Czy szablon jest aktywny |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Data utworzenia szablonu (UTC) |

**Ograniczenia tabeli:**
- `PRIMARY KEY (id)`
- `UNIQUE (display_order)`
- `CHECK (interval_value > 0 AND interval_value < 1000)`
- `CHECK (preferred_day_of_week IS NULL OR (preferred_day_of_week >= 0 AND preferred_day_of_week <= 6))`

---

## 2. Typy niestandardowe (ENUMs)

### 2.1. `interval_unit_type`

```sql
CREATE TYPE interval_unit_type AS ENUM (
    'days',
    'weeks',
    'months',
    'years'
);
```

Określa jednostkę czasu dla interwału powtarzania zadania.

---

### 2.2. `action_type`

```sql
CREATE TYPE action_type AS ENUM (
    'completed',
    'skipped'
);
```

Określa typ ostatniej akcji wykonanej na zadaniu.

---

## 3. Relacje między tabelami

### 3.1. `auth.users` → `tasks` (1:N)

- **Typ relacji**: Jeden do wielu (One-to-Many)
- **Klucz obcy**: `tasks.user_id` → `auth.users.id`
- **Działanie przy usunięciu**: `ON DELETE CASCADE`
- **Opis**: Każdy użytkownik może mieć wiele zadań. Usunięcie konta użytkownika automatycznie usuwa wszystkie jego zadania.

### 3.2. `task_templates`

- **Typ**: Tabela referencyjna (lookup table)
- **Relacje**: Brak relacji z innymi tabelami
- **Opis**: Globalna lista szablonów zadań dostępna dla wszystkich użytkowników. Używana w procesie onboardingu i na stronie pomocy.

---

## 4. Indeksy

### 4.1. Indeksy na tabeli `tasks`

| Nazwa indeksu | Typ | Kolumny | Cel |
|---------------|-----|---------|-----|
| `tasks_pkey` | PRIMARY KEY | `id` | Automatyczny indeks dla klucza głównego |
| `idx_tasks_user_next_due` | COMPOSITE | `(user_id, next_due_date)` | Optymalizacja zapytań dashboard (zaległe i nadchodzące zadania) |
| `idx_tasks_user_title` | COMPOSITE | `(user_id, title)` | Optymalizacja sortowania alfabetycznego listy zadań |

**Definicje SQL:**

```sql
-- Indeks automatyczny (PRIMARY KEY)
-- CREATE UNIQUE INDEX tasks_pkey ON tasks(id);

-- Indeks dla zapytań dashboard
CREATE INDEX idx_tasks_user_next_due ON tasks(user_id, next_due_date);

-- Indeks dla sortowania alfabetycznego
CREATE INDEX idx_tasks_user_title ON tasks(user_id, title);
```

### 4.2. Indeksy na tabeli `task_templates`

| Nazwa indeksu | Typ | Kolumny | Cel |
|---------------|-----|---------|-----|
| `task_templates_pkey` | PRIMARY KEY | `id` | Automatyczny indeks dla klucza głównego |
| `task_templates_display_order_key` | UNIQUE | `display_order` | Automatyczny indeks dla ograniczenia UNIQUE |

**Definicje SQL:**

```sql
-- Indeksy automatyczne (PRIMARY KEY i UNIQUE)
CREATE UNIQUE INDEX task_templates_pkey ON task_templates(id);
CREATE UNIQUE INDEX task_templates_display_order_key ON task_templates(display_order);
```

---

## 5. Triggery

### 5.1. Trigger automatycznej aktualizacji `updated_at`

Automatycznie aktualizuje pole `updated_at` w tabeli `tasks` przy każdej modyfikacji wiersza.

**Funkcja triggera:**

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';
```

**Definicja triggera:**

```sql
CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 6. Row Level Security (RLS)

### 6.1. Włączenie RLS na tabeli `tasks`

```sql
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
```

### 6.2. Polityki RLS dla tabeli `tasks`

#### 6.2.1. Polityka SELECT

```sql
CREATE POLICY tasks_select_own 
    ON tasks 
    FOR SELECT 
    USING (auth.uid() = user_id);
```

Użytkownicy mogą wyświetlać tylko własne zadania.

#### 6.2.2. Polityka INSERT

```sql
CREATE POLICY tasks_insert_own 
    ON tasks 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
```

Użytkownicy mogą tworzyć zadania tylko dla siebie.

#### 6.2.3. Polityka UPDATE

```sql
CREATE POLICY tasks_update_own 
    ON tasks 
    FOR UPDATE 
    USING (auth.uid() = user_id);
```

Użytkownicy mogą aktualizować tylko własne zadania.

#### 6.2.4. Polityka DELETE

```sql
CREATE POLICY tasks_delete_own 
    ON tasks 
    FOR DELETE 
    USING (auth.uid() = user_id);
```

Użytkownicy mogą usuwać tylko własne zadania.

### 6.3. Polityki dla tabeli `task_templates`

Tabela `task_templates` pozostaje publicznie dostępna do odczytu dla wszystkich zalogowanych użytkowników. Nie wymaga włączenia RLS, ponieważ jest tabelą referencyjną tylko do odczytu.

**Opcjonalnie** (jeśli wymagane jest jawne zezwolenie):

```sql
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY task_templates_select_all 
    ON task_templates 
    FOR SELECT 
    USING (true);
```

---

## 7. Migracje i kolejność tworzenia

### Kolejność tworzenia obiektów bazy danych:

1. **Typy ENUM**
   - `interval_unit_type`
   - `action_type`

2. **Tabele**
   - `task_templates` (brak zależności)
   - `tasks` (zależność od `auth.users` z Supabase Auth)

3. **Indeksy**
   - `idx_tasks_user_next_due`
   - `idx_tasks_user_title`

4. **Funkcje i triggery**
   - `update_updated_at_column()` - funkcja
   - `update_tasks_updated_at` - trigger

5. **Row Level Security**
   - Włączenie RLS na `tasks`
   - Polityki RLS dla `tasks`

---

## 8. Obsługa wymagań funkcjonalnych (mapowanie PRD → schemat)

### 8.1. Autentykacja (US-001 do US-006)

- **Rejestracja, weryfikacja email, logowanie, reset hasła, wylogowanie**: Obsługiwane przez **Supabase Auth** (`auth.users`)
- **Usuwanie konta (US-015)**: `ON DELETE CASCADE` automatycznie usuwa wszystkie zadania użytkownika

### 8.2. Zarządzanie zadaniami (US-007 do US-010)

- **US-007 (Tworzenie zadania)**: 
  - Pola: `title`, `description`, `interval_value`, `interval_unit`, `preferred_day_of_week`
  - `next_due_date` kalkulowane przez aplikację przy tworzeniu
  
- **US-008 (Przeglądanie listy)**:
  - Indeks `idx_tasks_user_next_due` dla sortowania po dacie
  - Indeks `idx_tasks_user_title` dla sortowania alfabetycznego
  
- **US-009 (Edycja)**:
  - Wszystkie pola edytowalne
  - `updated_at` automatycznie aktualizowane przez trigger
  
- **US-010 (Usuwanie)**:
  - Polityka RLS `tasks_delete_own` umożliwia usuwanie własnych zadań

### 8.3. Pulpit i cykl życia (US-011 do US-013)

- **US-011 (Dashboard)**:
  - Zapytania wspierane przez indeks `idx_tasks_user_next_due`:
    - Zaległe: `WHERE user_id = ? AND next_due_date < CURRENT_DATE`
    - Nadchodzące 7 dni: `WHERE user_id = ? AND next_due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7`
  
- **US-012 (Wykonaj)**:
  - Aktualizacja `last_action_date`, `last_action_type = 'completed'`
  - Przeliczenie `next_due_date` przez aplikację
  
- **US-013 (Pomiń)**:
  - Aktualizacja `last_action_date`, `last_action_type = 'skipped'`
  - Przeliczenie `next_due_date` przez aplikację

### 8.4. Onboarding i pomoc (US-003, US-014)

- **US-003, US-014 (Szablony zadań)**:
  - Tabela `task_templates` z polami `category` i `display_order`
  - Status onboardingu rozpoznawany dynamicznie (np. liczba zadań użytkownika)

---

## 9. Metryki sukcesu - wspierane przez schemat

### 9.1. Aktywacja (>40% użytkowników z ≥5 zadań w 7 dni)

**Query przykładowe:**
```sql
SELECT 
    u.id,
    COUNT(t.id) as tasks_count,
    u.created_at as user_registered_at
FROM auth.users u
LEFT JOIN tasks t ON u.id = t.user_id 
    AND t.created_at <= u.created_at + INTERVAL '7 days'
WHERE u.created_at >= NOW() - INTERVAL '30 days'
GROUP BY u.id
HAVING COUNT(t.id) >= 5;
```

**Wspierane pola:**
- `tasks.created_at` - timestamp utworzenia zadania
- `auth.users.created_at` - timestamp rejestracji użytkownika (Supabase)

### 9.2. Zaangażowanie (>70% zadań wykonanych/pominiętych)

**Query przykładowe:**
```sql
SELECT 
    COUNT(*) FILTER (WHERE last_action_type IS NOT NULL) as tasks_with_action,
    COUNT(*) as total_overdue_tasks,
    ROUND(100.0 * COUNT(*) FILTER (WHERE last_action_type IS NOT NULL) / COUNT(*), 2) as engagement_rate
FROM tasks
WHERE next_due_date < CURRENT_DATE
    AND created_at >= NOW() - INTERVAL '30 days';
```

**Wspierane pola:**
- `last_action_type` - typ akcji (completed/skipped)
- `next_due_date` - identyfikacja zaległych zadań

### 9.3. Retencja (powroty po 7 i 30 dniach)

**Query przykładowe:**
```sql
SELECT 
    u.id,
    u.created_at as registered_at,
    MAX(t.updated_at) as last_activity
FROM auth.users u
LEFT JOIN tasks t ON u.id = t.user_id
WHERE u.created_at >= NOW() - INTERVAL '60 days'
GROUP BY u.id
HAVING MAX(t.updated_at) >= u.created_at + INTERVAL '7 days';
```

**Wspierane pola:**
- `tasks.updated_at` - ostatnia aktywność na zadaniu
- `auth.users.created_at` - data rejestracji

---

## 10. Założenia projektowe i decyzje

### 10.1. Logika aplikacji vs. baza danych

**Kalkulacja `next_due_date`**:
- Wykonywana **wyłącznie w warstwie aplikacji**
- Baza danych przechowuje tylko wynikową wartość typu `DATE`
- Nie używamy triggerów bazodanowych do kalkulacji dat
- Upraszcza to logikę i ułatwia testowanie biznesowej logiki

**Uzasadnienie**: 
- Większa kontrola nad logiką biznesową
- Łatwiejsze debugowanie i testowanie
- Elastyczność w implementacji skomplikowanych reguł (np. `preferred_day_of_week`)
- Unikanie rozproszonej logiki między aplikacją a bazą danych

### 10.2. Historia zadań

**Decyzja**: Przechowywanie tylko ostatniej akcji
- Pola: `last_action_date`, `last_action_type`
- Brak dedykowanej tabeli historii (`task_history`)

**Uzasadnienie dla MVP**:
- Uproszczenie schematu
- Wystarczające dla wymagań funkcjonalnych PRD
- Możliwość rozbudowy w przyszłości (dodanie tabeli historii)

### 10.3. Soft delete vs. fizyczne usuwanie

**Decyzja**: Fizyczne usuwanie (DELETE)
- Brak pola `deleted_at` czy `is_deleted`

**Uzasadnienie**:
- Prostsze zapytania (brak potrzeby filtrowania `WHERE deleted_at IS NULL`)
- Zgodność z wymaganiami RODO (prawo do bycia zapomnianym)
- Możliwość rozbudowy o archiwizację w przyszłości

### 10.4. Timestampy i strefy czasowe

**Decyzja**: 
- `created_at`, `updated_at` jako `TIMESTAMPTZ` (UTC)
- `next_due_date`, `last_action_date` jako `DATE` (bez czasu)

**Uzasadnienie**:
- Zadania cykliczne nie wymagają precyzji czasu (wystarczy dzień)
- Typ `DATE` upraszcza porównania i zapytania dashboard
- `TIMESTAMPTZ` dla audytu zapewnia precyzyjne timestampy w UTC

### 10.5. Limity i constrainty

**Decyzje**:
- `interval_value`: `CHECK (interval_value > 0 AND interval_value < 1000)`
  - Górny limit 1000 zapobiega błędom (np. 1000 lat = wartość nierealna)
- `title`: `VARCHAR(256)` zamiast `TEXT`
  - Wystarczający limit dla tytułów zadań
  - Zapobiega nadmiernie długim tytułom psującym UI
- `description`: `TEXT`
  - Brak sztywnych limitów dla opisów
  - Walidacja na poziomie aplikacji

### 10.6. Globalne szablony vs. szablony użytkownika

**Decyzja**: Tylko globalne szablony w `task_templates`
- Brak powiązania `user_id` w tabeli szablonów
- Szablony administrowane centralnie

**Uzasadnienie dla MVP**:
- Uproszczenie funkcjonalności
- Wystarczające dla onboardingu i strony pomocy
- Możliwość rozbudowy: dodanie pola `user_id` (NULL = globalny, wartość = prywatny)

### 10.7. Status onboardingu

**Decyzja**: Brak dedykowanego pola
- Status rozpoznawany dynamicznie (np. `COUNT(tasks) = 0`)

**Uzasadnienie**:
- Unikanie redundantnych danych
- Elastyczność w definicji "ukończonego onboardingu"

### 10.8. Indeksowanie

**Strategia**: 
- Composite indeksy dla najczęstszych zapytań
- `(user_id, next_due_date)` - główny index dla dashboard
- `(user_id, title)` - index dla sortowania

**Uzasadnienie**:
- PostgreSQL efektywnie wykorzystuje composite indeksy
- Covering index dla typowych zapytań
- Brak nadmiernego indeksowania (3 indeksy total + PK)

---

## 11. Bezpieczeństwo

### 11.1. Row Level Security (RLS)

**Implementacja**:
- Włączone na tabeli `tasks`
- Cztery polityki (SELECT, INSERT, UPDATE, DELETE)
- Wykorzystanie `auth.uid()` z Supabase Auth

**Korzyści**:
- Zabezpieczenie na poziomie bazy danych (defense in depth)
- Automatyczna filtracja wyników zapytań
- Zgodność z best practices Supabase

### 11.2. Integralność danych

**Mechanizmy**:
- `FOREIGN KEY` z `ON DELETE CASCADE` - automatyczne czyszczenie
- `CHECK` constraints - walidacja wartości
- `UNIQUE` constraints - zapobieganie duplikatom
- `NOT NULL` constraints - wymagane pola
- ENUM types - ograniczenie dozwolonych wartości

### 11.3. Supabase Auth

**Korzyści**:
- Wbudowana weryfikacja email
- Bezpieczne resetowanie hasła
- Haszowanie haseł (bcrypt)
- JWT tokens dla sesji
- Rate limiting

---

## 12. Wydajność i skalowalność

### 12.1. Szacunki wydajności

**Założenia**:
- Średni użytkownik: 10-50 zadań
- 10,000 użytkowników = 100,000 - 500,000 rekordów w `tasks`

**Wydajność zapytań**:
- Dashboard query z indexem `(user_id, next_due_date)`: < 10ms
- Lista zadań z sortowaniem: < 20ms
- INSERT/UPDATE pojedynczego zadania: < 5ms

### 12.2. Brak sztywnych limitów

**Decyzja**: Nie wprowadzamy limitów na liczbę zadań użytkownika

**Uzasadnienie**:
- Indeksy zapewniają wydajność nawet przy dużych zbiorach danych
- Możliwość monitorowania i wprowadzenia limitów w przyszłości
- Elastyczność dla power users

### 12.3. Optymalizacje przyszłościowe

**Możliwe rozszerzenia**:
- Partycjonowanie tabeli `tasks` po `user_id` (przy > 10M rekordów)
- Materialized views dla dashboardu (cache)
- Archiwizacja zakończonych/nieaktywnych zadań

---

## 13. Plan wdrożenia

### 13.1. Migracja początkowa

1. Utworzenie typów ENUM
2. Utworzenie tabeli `task_templates`
3. Utworzenie tabeli `tasks`
4. Utworzenie indeksów
5. Utworzenie funkcji i triggerów
6. Włączenie RLS i utworzenie polityk
7. Seed data dla `task_templates` (TBD)

### 13.2. Supabase Migrations

Wykorzystanie Supabase CLI do zarządzania migracjami:
- Pliki w `supabase/migrations/`
- Naming convention: `YYYYMMDDHHMMSS_description.sql`
- Automatyczne wersjonowanie w tabeli `supabase_migrations.schema_migrations`

### 13.3. Seed data (do uzupełnienia)

Przykładowe kategorie szablonów:
- Dom i ogród
- Auto i transport
- Zdrowie i uroda
- Administracja i dokumenty
- Technologia i sprzęt

---

## 14. Diagram ERD (opis tekstowy)

```
┌─────────────────┐
│  auth.users     │ (Supabase Auth)
│  ─────────────  │
│  id (PK)        │
│  email          │
│  created_at     │
│  ...            │
└────────┬────────┘
         │
         │ 1:N
         │ ON DELETE CASCADE
         │
         ▼
┌─────────────────────────────┐
│  tasks                      │
│  ─────────────────────────  │
│  id (PK)                    │
│  user_id (FK) ──────────────┼─── auth.users.id
│  title                      │
│  description                │
│  interval_value             │
│  interval_unit (ENUM)       │
│  preferred_day_of_week      │
│  next_due_date              │
│  last_action_date           │
│  last_action_type (ENUM)    │
│  created_at                 │
│  updated_at                 │
└─────────────────────────────┘

┌─────────────────────────────┐
│  task_templates             │ (Tabela referencyjna)
│  ─────────────────────────  │
│  id (PK)                    │
│  title                      │
│  description                │
│  interval_value             │
│  interval_unit (ENUM)       │
│  preferred_day_of_week      │
│  category                   │
│  display_order (UNIQUE)     │
│  is_active                  │
│  created_at                 │
└─────────────────────────────┘

ENUM: interval_unit_type
├── 'days'
├── 'weeks'
├── 'months'
└── 'years'

ENUM: action_type
├── 'completed'
└── 'skipped'
```

---

## 15. Podsumowanie

Schemat bazy danych został zaprojektowany z myślą o:

✅ **Prostocie** - minimalna liczba tabel, jasne relacje, brak nadmiernej normalizacji  
✅ **Wydajności** - strategiczne indeksy dla kluczowych zapytań dashboard  
✅ **Bezpieczeństwie** - RLS policies, integralność referencyjna, Supabase Auth  
✅ **Skalowalności** - przygotowany na wzrost liczby użytkowników i zadań  
✅ **Spełnieniu wymagań PRD** - pełne pokrycie user stories z dokumentu wymagań  
✅ **Zgodności z tech stack** - optymalizacja pod Supabase i PostgreSQL  
✅ **Elastyczności** - możliwość rozbudowy (historia, archiwizacja, prywatne szablony)  

Schemat jest gotowy do implementacji w formie migracji Supabase i stanowi solidną podstawę dla MVP aplikacji Chronos.

