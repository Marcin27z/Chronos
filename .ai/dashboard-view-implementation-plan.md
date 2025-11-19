# Plan implementacji widoku Dashboard

## 1. Przegląd

Dashboard jest głównym widokiem aplikacji, wyświetlanym bezpośrednio po zalogowaniu użytkownika. Jego celem jest dostarczenie natychmiastowego przeglądu statusu zadań użytkownika z podziałem na:
- Zadania zaległe (przeterminowane)
- Zadania nadchodzące (w ciągu najbliższych 7 dni)
- Najbliższe zadanie w przyszłości (jeśli brak zaległych i nadchodzących)

Widok umożliwia szybkie wykonywanie akcji na zadaniach (oznaczanie jako wykonane lub pomijanie) bez konieczności nawigacji do szczegółów zadania.

## 2. Routing widoku

**Ścieżka:** `/`

**Typ strony:** Astro page z dynamicznym komponentem React

**Plik:** `src/pages/index.astro`

**Wymagania:**
- Wymaga uwierzytelnienia użytkownika
- Przekierowanie do `/login` jeśli użytkownik nie jest zalogowany
- SSR (Server-Side Rendering) włączony

## 3. Struktura komponentów

```
index.astro (Astro Page)
└── Dashboard.tsx (React Client Component - client:load)
    ├── DashboardHeader
    │   ├── UserGreeting
    │   └── CurrentDate
    ├── DashboardContent
    │   ├── LoadingState (warunkowe)
    │   ├── ErrorState (warunkowe)
    │   ├── EmptyState (warunkowe)
    │   └── DashboardSections
    │       ├── OnboardingSection (warunkowe)
    │       ├── OverdueTasksSection (warunkowe)
    │       │   └── TaskCard[] (wariant: overdue)
    │       │       ├── TaskInfo
    │       │       ├── DaysOverdueBadge
    │       │       └── TaskActions (Wykonaj + Pomiń)
    │       ├── UpcomingTasksSection (warunkowe)
    │       │   └── TaskCard[] (wariant: upcoming)
    │       │       ├── TaskInfo
    │       │       ├── DaysUntilDueBadge
    │       │       └── TaskActions (tylko Wykonaj)
    │       ├── NextTaskPreview (warunkowe)
    │       └── DashboardSummary
    └── Toast/Notification (dla feedbacku)
```

## 4. Szczegóły komponentów

### 4.1. `index.astro`

**Opis:** Strona Astro pełniąca rolę entry point dla widoku Dashboard. Odpowiada za weryfikację autentykacji po stronie serwera i przekazanie początkowych danych do komponentu React.

**Główne elementy:**
- Import `Layout.astro` jako wrapper
- Sprawdzenie autentykacji przez `locals.supabase`
- Opcjonalne SSR pre-fetching danych dashboard (dla lepszego UX)
- Montowanie komponentu `<Dashboard client:load />`

**Obsługiwane interakcje:**
- Brak (strona Astro)

**Obsługiwana walidacja:**
- Weryfikacja autentykacji użytkownika (przekierowanie do `/login` jeśli brak)
- Sprawdzenie dostępności `locals.supabase`

**Typy:**
- Brak specyficznych typów (używa locals z middleware)

**Propsy:**
- Brak (dane pobierane przez komponent React)

---

### 4.2. `Dashboard.tsx`

**Opis:** Główny kontener React dla całego widoku Dashboard. Zarządza pobieraniem danych, stanem globalnym widoku oraz orkiestruje wszystkie podkomponenty. Wykorzystuje custom hook `useDashboard()` do zarządzania logiką biznesową.

**Główne elementy:**
- `<div className="container mx-auto px-4 py-8">`
- `<DashboardHeader />`
- Warunkowe renderowanie: `<LoadingState />`, `<ErrorState />`, `<EmptyState />`, lub `<DashboardContent />`

**Obsługiwane interakcje:**
- Pobieranie danych przy montowaniu komponentu
- Obsługa akcji complete/skip z podkomponentów
- Retry po błędzie

**Obsługiwana walidacja:**
- Sprawdzenie stanu ładowania (isLoading)
- Sprawdzenie stanu błędu (error !== null)
- Sprawdzenie pustego stanu (data === null || total_tasks === 0)

**Typy:**
- `DashboardDTO`
- `ErrorDTO`
- `DashboardState` (ViewModel)

**Propsy:**
- Brak (root component)

---

### 4.3. `DashboardHeader`

**Opis:** Komponent wyświetlający nagłówek Dashboard z powitaniem użytkownika i aktualną datą. Zapewnia kontekst czasowy dla wyświetlanych zadań.

**Główne elementy:**
- `<header className="mb-8">`
- `<h1>` z powitaniem
- `<p>` z sformatowaną aktualną datą (format: "DD MMMM YYYY" po polsku)

**Obsługiwane interakcje:**
- Brak (komponent prezentacyjny)

**Obsługiwana walidacja:**
- Brak

**Typy:**
- Brak specyficznych typów (używa `Date`)

**Propsy:**
```typescript
interface DashboardHeaderProps {
  userName?: string; // Opcjonalne imię użytkownika
}
```

---

### 4.4. `OverdueTasksSection`

**Opis:** Sekcja wyświetlająca listę zadań zaległych (przeterminowanych) z podkreśleniem pilności przez odpowiedni styling (np. czerwony border). Każde zadanie w tej sekcji ma dwie akcje: Wykonaj i Pomiń.

**Główne elementy:**
- `<section className="mb-8">`
- `<h2 className="text-2xl font-semibold mb-4 text-destructive">Zaległe</h2>`
- `<div className="space-y-4">` zawierający listę `<TaskCard />`
- Wyświetlenie liczby zadań w nagłówku

**Obsługiwane interakcje:**
- Przekazywanie callbacków `onComplete` i `onSkip` do TaskCard
- Propagacja akcji do rodzica

**Obsługiwana walidacja:**
- Renderowanie tylko gdy `tasks.length > 0`
- Przekazywanie informacji o przetwarzanych zadaniach do TaskCard

**Typy:**
- `TaskWithDaysOverdueDTO[]`

**Propsy:**
```typescript
interface OverdueTasksSectionProps {
  tasks: TaskWithDaysOverdueDTO[];
  onComplete: (taskId: string) => Promise<void>;
  onSkip: (taskId: string) => Promise<void>;
  processingTasks: Set<string>;
}
```

---

### 4.5. `UpcomingTasksSection`

**Opis:** Sekcja wyświetlająca listę zadań nadchodzących (w ciągu najbliższych 7 dni). Zadania pokazują ile dni pozostało do terminu. Każde zadanie ma tylko akcję Wykonaj (brak Pomiń).

**Główne elementy:**
- `<section className="mb-8">`
- `<h2 className="text-2xl font-semibold mb-4">Nadchodzące (7 dni)</h2>`
- `<div className="space-y-4">` zawierający listę `<TaskCard />`
- Wyświetlenie liczby zadań w nagłówku

**Obsługiwane interakcje:**
- Przekazywanie callbacku `onComplete` do TaskCard
- Propagacja akcji do rodzica

**Obsługiwana walidacja:**
- Renderowanie tylko gdy `tasks.length > 0`
- Przekazywanie informacji o przetwarzanych zadaniach do TaskCard

**Typy:**
- `TaskWithDaysUntilDueDTO[]`

**Propsy:**
```typescript
interface UpcomingTasksSectionProps {
  tasks: TaskWithDaysUntilDueDTO[];
  onComplete: (taskId: string) => Promise<void>;
  processingTasks: Set<string>;
}
```

---

### 4.6. `TaskCard`

**Opis:** Uniwersalny komponent karty zadania, który może działać w dwóch wariantach: 'overdue' (z przyciskami Wykonaj i Pomiń) oraz 'upcoming' (tylko przycisk Wykonaj). Wyświetla szczegóły zadania i umożliwia szybkie akcje.

**Główne elementy:**
- `<div className="card">` (z odpowiednim stylowaniem według wariantu)
- `<div className="card-header">` z tytułem i badge'em dni
- `<div className="card-content">` z opisem (jeśli istnieje)
- `<div className="card-footer">` z przyciskami akcji
- Opcjonalny spinner/disabled state podczas przetwarzania

**Obsługiwane interakcje:**
- Click na przycisk "Wykonaj" → wywołanie `onComplete(taskId)`
- Click na przycisk "Pomiń" → wywołanie `onSkip(taskId)` (tylko overdue)
- Click na tytuł → nawigacja do szczegółów zadania (opcjonalne w MVP)

**Obsługiwana walidacja:**
- Walidacja `taskId` jako UUID (sprawdzone przez TypeScript)
- Wyłączenie przycisków gdy `isProcessing === true`
- Wyświetlenie przycisku Pomiń tylko dla wariantu 'overdue'
- Walidacja minimalnego rozmiaru przycisków (44px dla mobile)

**Typy:**
- `TaskWithDaysOverdueDTO | TaskWithDaysUntilDueDTO`
- `TaskCardVariant` (ViewModel)

**Propsy:**
```typescript
type TaskCardVariant = 'overdue' | 'upcoming';

interface TaskCardProps {
  task: TaskWithDaysOverdueDTO | TaskWithDaysUntilDueDTO;
  variant: TaskCardVariant;
  onComplete: (taskId: string) => Promise<void>;
  onSkip?: (taskId: string) => Promise<void>; // tylko dla overdue
  isProcessing?: boolean;
}
```

---

### 4.7. `NextTaskPreview`

**Opis:** Komponent wyświetlany gdy użytkownik nie ma zadań zaległych ani nadchodzących w ciągu 7 dni. Pokazuje najbliższe zadanie w przyszłości jako informację planistyczną.

**Główne elementy:**
- `<div className="card info-card">`
- Ikona kalendarza
- Tytuł najbliższego zadania
- Data wykonania
- Informacja o liczbie dni do wykonania

**Obsługiwane interakcje:**
- Brak akcji (tylko informacja)

**Obsługiwana walidacja:**
- Renderowanie tylko gdy `overdue.length === 0 && upcoming.length === 0 && nextTask !== null`

**Typy:**
- `NextTaskDTO | null`

**Propsy:**
```typescript
interface NextTaskPreviewProps {
  nextTask: NextTaskDTO | null;
}
```

---

### 4.8. `DashboardSummary`

**Opis:** Komponent wyświetlający statystyki użytkownika: całkowita liczba zadań, liczba zaległych, liczba nadchodzących. Umieszczony na dole Dashboard jako podsumowanie.

**Główne elementy:**
- `<div className="grid grid-cols-3 gap-4">`
- Trzy karty statystyk:
  - Wszystkie zadania
  - Zaległe
  - Nadchodzące

**Obsługiwane interakcje:**
- Brak (komponent prezentacyjny)

**Obsługiwana walidacja:**
- Brak

**Typy:**
- `DashboardSummaryDTO`

**Propsy:**
```typescript
interface DashboardSummaryProps {
  summary: DashboardSummaryDTO;
}
```

---

### 4.9. `LoadingState`

**Opis:** Skeleton loader wyświetlany podczas początkowego ładowania danych Dashboard. Odzwierciedla strukturę docelowego widoku dla lepszego UX.

**Główne elementy:**
- Skeleton dla nagłówka
- 2-3 skeleton cards dla zadań
- Skeleton dla statystyk

**Obsługiwane interakcje:**
- Brak

**Obsługiwana walidacja:**
- Wyświetlany tylko gdy `isLoading === true`

**Typy:**
- Brak

**Propsy:**
- Brak

---

### 4.10. `ErrorState`

**Opis:** Komponent wyświetlany gdy wystąpi błąd podczas ładowania danych Dashboard. Pokazuje przyjazny komunikat błędu i przycisk retry.

**Główne elementy:**
- Ikona błędu
- Komunikat błędu (zależny od typu błędu)
- Przycisk "Spróbuj ponownie"

**Obsługiwane interakcje:**
- Click na przycisk retry → wywołanie `onRetry()`

**Obsługiwana walidacja:**
- Wyświetlany tylko gdy `error !== null`

**Typy:**
- `ErrorDTO`

**Propsy:**
```typescript
interface ErrorStateProps {
  error: ErrorDTO;
  onRetry: () => void;
}
```

---

### 4.11. `EmptyState`

**Opis:** Komponent wyświetlany gdy użytkownik nie ma żadnych zadań. Zachęca do utworzenia pierwszego zadania.

**Główne elementy:**
- Ilustracja/ikona pustego stanu
- Komunikat zachęcający
- Przycisk "Utwórz pierwsze zadanie" (link do /tasks/new)

**Obsługiwane interakcje:**
- Click na przycisk → nawigacja do formularza tworzenia zadania

**Obsługiwana walidacja:**
- Wyświetlany tylko gdy `data !== null && summary.total_tasks === 0`

**Typy:**
- Brak

**Propsy:**
- Brak

---

### 4.12. `OnboardingSection`

**Opis:** Sekcja onboardingowa dla nowych użytkowników, wyświetlająca listę sugerowanych zadań do szybkiego zaimportowania. Opcjonalnie zwijana po pierwszym użyciu.

**Główne elementy:**
- `<section className="mb-8 card">`
- Nagłówek z opisem
- Lista sugerowanych zadań z przyciskami "Dodaj"
- Opcjonalnie przycisk "Zwiń" jeśli użytkownik już ma zadania

**Obsługiwane interakcje:**
- Click na "Dodaj" → utworzenie zadania z szablonu
- Click na "Zwiń" → ukrycie sekcji

**Obsługiwana walidacja:**
- Renderowanie zgodnie z logiką onboardingu
- Dezaktywacja przycisku "Dodaj" gdy zadanie jest dodawane

**Typy:**
- `TaskTemplateDTO[]`

**Propsy:**
```typescript
interface OnboardingSectionProps {
  templates: TaskTemplateDTO[];
  onAddTemplate: (templateId: string) => Promise<void>;
  onDismiss: () => void;
  isVisible: boolean;
}
```

## 5. Typy

### 5.1. Typy istniejące (z `src/types.ts`)

Wykorzystywane bezpośrednio z pliku typów:

```typescript
// Typy dla zadań
export type TaskDTO = Task;
export type TaskWithDaysOverdueDTO = TaskDTO & { days_overdue: number };
export type TaskWithDaysUntilDueDTO = TaskDTO & { days_until_due: number };
export type NextTaskDTO = Pick<Task, "id" | "title" | "next_due_date"> & { days_until_due: number };

// Typy dla Dashboard
export interface DashboardDTO {
  overdue: TaskWithDaysOverdueDTO[];
  upcoming: TaskWithDaysUntilDueDTO[];
  next_task: NextTaskDTO | null;
  summary: DashboardSummaryDTO;
}

export interface DashboardSummaryDTO {
  total_overdue: number;
  total_upcoming: number;
  total_tasks: number;
}

// Typy dla błędów
export interface ErrorDTO {
  error: string;
  details?: string;
}
```

### 5.2. Nowe typy ViewModel (do utworzenia)

Utworzyć w nowym pliku `src/lib/types/dashboard.viewmodel.ts`:

```typescript
import type { DashboardDTO, ErrorDTO } from '../../types';

/**
 * Stan widoku Dashboard
 */
export interface DashboardState {
  /** Dane dashboard lub null jeśli nie załadowane */
  data: DashboardDTO | null;
  /** Flaga ładowania początkowego */
  isLoading: boolean;
  /** Błąd jeśli wystąpił */
  error: ErrorDTO | null;
}

/**
 * Wariant karty zadania
 */
export type TaskCardVariant = 'overdue' | 'upcoming';

/**
 * Typ akcji na zadaniu
 */
export type TaskActionType = 'complete' | 'skip';

/**
 * Stan akcji na zadaniu (dla optymistycznych aktualizacji)
 */
export interface TaskActionState {
  /** ID zadania */
  taskId: string;
  /** Typ akcji */
  action: TaskActionType;
  /** Czy akcja jest w trakcie przetwarzania */
  isProcessing: boolean;
}

/**
 * Wynik akcji na zadaniu
 */
export interface TaskActionResult {
  /** Czy akcja zakończyła się sukcesem */
  success: boolean;
  /** Błąd jeśli wystąpił */
  error?: ErrorDTO;
}

/**
 * Konfiguracja dla optymistycznych aktualizacji
 */
export interface OptimisticUpdateConfig {
  /** Czy włączyć optymistyczne aktualizacje */
  enabled: boolean;
  /** Timeout dla rollback (ms) */
  rollbackTimeout: number;
}
```

### 5.3. Typy dla API Client (do utworzenia)

Utworzyć w `src/lib/api/dashboard.api.ts`:

```typescript
import type { DashboardDTO, TaskDTO } from '../../types';

/**
 * Opcje zapytania API
 */
export interface ApiRequestOptions {
  /** Token autoryzacji */
  token: string;
  /** Sygnał do przerwania zapytania */
  signal?: AbortSignal;
}

/**
 * Response wrapper z metadanymi
 */
export interface ApiResponse<T> {
  /** Dane odpowiedzi */
  data: T | null;
  /** Błąd jeśli wystąpił */
  error: ErrorDTO | null;
  /** Status HTTP */
  status: number;
}
```

## 6. Zarządzanie stanem

### 6.1. Custom Hook: `useDashboard()`

**Lokalizacja:** `src/lib/hooks/useDashboard.ts`

**Cel:** Zarządzanie całym stanem widoku Dashboard, pobieranie danych, wykonywanie akcji na zadaniach z optymistycznymi aktualizacjami.

**Implementacja:**

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { DashboardDTO, ErrorDTO, TaskDTO } from '../../types';
import type { DashboardState, TaskActionResult } from '../types/dashboard.viewmodel';

interface UseDashboardReturn {
  // Stan
  data: DashboardDTO | null;
  isLoading: boolean;
  error: ErrorDTO | null;
  processingTasks: Set<string>;
  
  // Akcje
  completeTask: (taskId: string) => Promise<TaskActionResult>;
  skipTask: (taskId: string) => Promise<TaskActionResult>;
  refetch: () => Promise<void>;
}

export function useDashboard(): UseDashboardReturn {
  // Główny stan Dashboard
  const [state, setState] = useState<DashboardState>({
    data: null,
    isLoading: true,
    error: null,
  });
  
  // Set ID-ów zadań będących w trakcie przetwarzania
  const [processingTasks, setProcessingTasks] = useState<Set<string>>(new Set());

  // Funkcja pobierająca dane dashboard
  const fetchDashboard = useCallback(async () => {
    // Implementacja fetch z API
  }, []);

  // Funkcja wykonująca akcję Complete
  const completeTask = useCallback(async (taskId: string): Promise<TaskActionResult> => {
    // 1. Dodaj taskId do processingTasks
    // 2. Optymistycznie usuń zadanie z listy
    // 3. Wywołaj POST /api/tasks/{taskId}/complete
    // 4. W przypadku błędu: przywróć zadanie, pokaż błąd
    // 5. W przypadku sukcesu: usuń z processingTasks
  }, [state.data]);

  // Funkcja wykonująca akcję Skip
  const skipTask = useCallback(async (taskId: string): Promise<TaskActionResult> => {
    // Analogicznie do completeTask
  }, [state.data]);

  // Inicjalne pobranie danych
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    data: state.data,
    isLoading: state.isLoading,
    error: state.error,
    processingTasks,
    completeTask,
    skipTask,
    refetch: fetchDashboard,
  };
}
```

**Stan zarządzany przez hook:**
1. `data: DashboardDTO | null` - Dane dashboard
2. `isLoading: boolean` - Flaga ładowania
3. `error: ErrorDTO | null` - Błąd
4. `processingTasks: Set<string>` - Set ID-ów zadań w trakcie przetwarzania

**Metody eksportowane:**
1. `completeTask(taskId)` - Oznacz zadanie jako wykonane
2. `skipTask(taskId)` - Pomiń zadanie
3. `refetch()` - Ponowne pobranie danych

### 6.2. Optymistyczne aktualizacje

Hook implementuje optymistyczne aktualizacje dla lepszego UX:

1. **Przed wywołaniem API:**
   - Dodanie `taskId` do `processingTasks`
   - Optymistyczne usunięcie zadania z odpowiedniej listy (overdue/upcoming)
   - Aktualizacja statystyk summary

2. **Po sukcesie API:**
   - Usunięcie `taskId` z `processingTasks`
   - Wyświetlenie sukcesu (toast/notification)
   - Stan pozostaje zaktualizowany

3. **Po błędzie API:**
   - Rollback: przywrócenie zadania do listy
   - Przywrócenie statystyk
   - Usunięcie `taskId` z `processingTasks`
   - Wyświetlenie błędu

### 6.3. Strategia refetch

Po wykonaniu akcji można:
- **Opcja A (preferowana dla MVP):** Pełny refetch dashboard po sukcesie
- **Opcja B:** Optymistyczna aktualizacja bez refetch (wymaga ręcznego zarządzania stanem)

Dla MVP zalecana jest **Opcja A** - prostsza implementacja, gwarantuje spójność danych.

## 7. Integracja API

### 7.1. API Client

**Lokalizacja:** `src/lib/api/dashboard.api.ts`

**Funkcje:**

```typescript
/**
 * Pobiera dane dashboard
 * @param token - Token autoryzacji
 * @returns DashboardDTO lub ErrorDTO
 */
export async function getDashboard(token: string): Promise<ApiResponse<DashboardDTO>> {
  try {
    const response = await fetch('/api/tasks/dashboard', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error: ErrorDTO = await response.json();
      return { data: null, error, status: response.status };
    }

    const data: DashboardDTO = await response.json();
    return { data, error: null, status: response.status };
  } catch (error) {
    return {
      data: null,
      error: {
        error: 'Network error',
        details: 'Nie udało się połączyć z serwerem',
      },
      status: 0,
    };
  }
}

/**
 * Oznacza zadanie jako wykonane
 * @param taskId - ID zadania
 * @param token - Token autoryzacji
 * @returns TaskDTO lub ErrorDTO
 */
export async function completeTask(taskId: string, token: string): Promise<ApiResponse<TaskDTO>> {
  try {
    const response = await fetch(`/api/tasks/${taskId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error: ErrorDTO = await response.json();
      return { data: null, error, status: response.status };
    }

    const data: TaskDTO = await response.json();
    return { data, error: null, status: response.status };
  } catch (error) {
    return {
      data: null,
      error: {
        error: 'Network error',
        details: 'Nie udało się oznaczyć zadania jako wykonane',
      },
      status: 0,
    };
  }
}

/**
 * Pomija zadanie
 * @param taskId - ID zadania
 * @param token - Token autoryzacji
 * @returns TaskDTO lub ErrorDTO
 */
export async function skipTask(taskId: string, token: string): Promise<ApiResponse<TaskDTO>> {
  // Analogiczna implementacja do completeTask
}
```

### 7.2. Mapowanie endpointów

| Akcja Frontend | HTTP Method | Endpoint | Request Type | Response Type |
|----------------|-------------|----------|--------------|---------------|
| Pobranie danych dashboard | GET | `/api/tasks/dashboard` | - | `DashboardDTO` |
| Oznaczenie jako wykonane | POST | `/api/tasks/{taskId}/complete` | - | `TaskDTO` |
| Pominięcie zadania | POST | `/api/tasks/{taskId}/skip` | - | `TaskDTO` |

### 7.3. Obsługa tokenów

Token autoryzacji powinien być:
1. Pobrany z kontekstu Supabase w komponencie Astro
2. Przekazany do komponentu React przez props lub context
3. Wykorzystany w każdym zapytaniu API w headerze `Authorization: Bearer {token}`

**Implementacja w Astro:**

```astro
---
// src/pages/index.astro
const supabase = Astro.locals.supabase;
const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  return Astro.redirect('/login');
}

const token = session.access_token;
---

<Layout title="Dashboard">
  <Dashboard client:load token={token} />
</Layout>
```

## 8. Interakcje użytkownika

### 8.1. Ładowanie widoku

**Przepływ:**
1. Użytkownik wchodzi na `/`
2. Astro sprawdza autentykację (middleware)
3. Jeśli niezalogowany → redirect do `/login`
4. Jeśli zalogowany → renderowanie strony z komponentem React
5. Komponent React montuje się i wywołuje `useDashboard()`
6. Hook wywołuje `getDashboard()` z API
7. Podczas ładowania wyświetlany jest `<LoadingState />`
8. Po pobraniu danych wyświetlane są sekcje Dashboard

**Stany UI:**
- `isLoading = true` → `<LoadingState />`
- `error !== null` → `<ErrorState />`
- `total_tasks = 0` → `<EmptyState />`
- W przeciwnym razie → `<DashboardContent />`

### 8.2. Oznaczanie zadania jako wykonane

**Przepływ:**
1. Użytkownik klika przycisk "Wykonaj" na zadaniu
2. Przycisk staje się disabled, pokazuje spinner
3. Zadanie jest optymistycznie usuwane z listy (fadeout animation)
4. Wywołanie `completeTask(taskId)` z hooka
5. Hook wywołuje `POST /api/tasks/{taskId}/complete`
6. **Sukces:** 
   - Zadanie pozostaje usunięte
   - Wyświetlenie toast "Zadanie wykonane"
   - Opcjonalnie: refetch danych
7. **Błąd:**
   - Zadanie wraca na listę (fade-in animation)
   - Przycisk aktywny ponownie
   - Wyświetlenie toast z błędem
   - Możliwość retry

**Szczegóły techniczne:**
- Przycisk: `<Button onClick={() => onComplete(task.id)} disabled={isProcessing}`
- ARIA: `aria-label="Wykonaj zadanie: {task.title}"`
- Animacja: CSS transition lub Framer Motion
- Timeout optymistycznej aktualizacji: 5000ms

### 8.3. Pomijanie zadania

**Przepływ:**
Analogiczny do oznaczania jako wykonane, z różnicami:
1. Przycisk "Pomiń" dostępny tylko dla zadań zaległych
2. Wywołanie `skipTask(taskId)`
3. Toast: "Zadanie pominięte"

**Różnice UI:**
- Przycisk "Pomiń" ma wariant `secondary` lub `outline`
- Tylko w sekcji `OverdueTasksSection`

### 8.4. Retry po błędzie

**Przepływ:**
1. Wystąpił błąd ładowania dashboard
2. Wyświetlony `<ErrorState />` z przyciskiem "Spróbuj ponownie"
3. Użytkownik klika retry
4. Wywołanie `refetch()` z hooka
5. Powrót do stanu loading → próba ponownego pobrania

### 8.5. Nawigacja do szczegółów zadania

**Przepływ (opcjonalne w MVP):**
1. Użytkownik klika na tytuł zadania w `<TaskCard />`
2. Nawigacja do `/tasks/{taskId}`
3. Wyświetlenie szczegółów/edycji zadania

## 9. Warunki i walidacja

### 9.1. Warunki renderowania komponentów

| Komponent | Warunek renderowania |
|-----------|---------------------|
| `LoadingState` | `isLoading === true` |
| `ErrorState` | `error !== null && !isLoading` |
| `EmptyState` | `data !== null && summary.total_tasks === 0` |
| `OnboardingSection` | Logika onboardingu (np. total_tasks < 3) |
| `OverdueTasksSection` | `overdue.length > 0` |
| `UpcomingTasksSection` | `upcoming.length > 0` |
| `NextTaskPreview` | `overdue.length === 0 && upcoming.length === 0 && next_task !== null` |
| `DashboardSummary` | `data !== null` (zawsze gdy są dane) |

### 9.2. Walidacja przycisków akcji

**Przycisk "Wykonaj":**
- Disabled gdy: `isProcessing === true` (zadanie jest przetwarzane)
- Wymagania: `taskId` jest poprawnym UUID (gwarantowane przez TS)
- Min. rozmiar: 44px × 44px (mobile touch target)

**Przycisk "Pomiń":**
- Disabled gdy: `isProcessing === true`
- Renderowany tylko gdy: `variant === 'overdue'`
- Wymagania: `taskId` jest poprawnym UUID
- Min. rozmiar: 44px × 44px

### 9.3. Walidacja danych z API

Walidacje wykonywane w `useDashboard()`:

1. **Token:**
   - Musi istnieć przed wywołaniem API
   - Musi być niepusty string
   - Brak tokenu → nie wywołuj API, przekieruj do login

2. **Task ID:**
   - Musi być poprawnym UUID v4
   - TypeScript gwarantuje typ, runtime walidacja opcjonalna

3. **Response Dashboard:**
   - `overdue` musi być array (może być pusty)
   - `upcoming` musi być array (może być pusty)
   - `next_task` może być null
   - `summary` musi zawierać wszystkie pola liczbowe

### 9.4. Walidacja accessibility

1. **Przyciski akcji:**
   - Muszą mieć `aria-label` z kontekstem zadania
   - Przykład: `aria-label="Wykonaj zadanie: Wymiana filtra wody"`

2. **Sekcje:**
   - Nagłówki semantyczne (h1, h2, h3)
   - Kolejność logiczna: Zaległe → Nadchodzące → Następne

3. **Keyboard navigation:**
   - Tab order: header → overdue tasks → upcoming tasks → summary
   - Enter/Space na przyciskach wykonuje akcję
   - Escape zamyka ewentualne modale/toasty

4. **Screen reader:**
   - Komunikaty o akcjach przez ARIA live regions
   - Status przetwarzania: `aria-busy="true"`

## 10. Obsługa błędów

### 10.1. Kategorie błędów

| Kod błędu | Typ | Obsługa Frontend |
|-----------|-----|------------------|
| 401 | Unauthorized | Przekierowanie do `/login` + wylogowanie |
| 404 | Task Not Found | Refetch dashboard + toast "Zadanie nie istnieje" |
| 500 | Server Error | Wyświetlenie `<ErrorState />` + opcja retry |
| 0 | Network Error | Wyświetlenie `<ErrorState />` + opcja retry + sprawdzenie połączenia |

### 10.2. Błędy ładowania Dashboard

**Scenariusz:** Błąd podczas `GET /api/tasks/dashboard`

**Obsługa:**
1. Przejście do stanu: `isLoading = false`, `error = ErrorDTO`
2. Wyświetlenie `<ErrorState error={error} onRetry={refetch} />`
3. Użytkownik może kliknąć "Spróbuj ponownie"
4. Retry wykonuje ponownie `fetchDashboard()`

**Komunikaty:**
- 401: "Sesja wygasła. Zaloguj się ponownie."
- 500: "Wystąpił problem z serwerem. Spróbuj ponownie za chwilę."
- Network: "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."

### 10.3. Błędy akcji na zadaniach

**Scenariusz:** Błąd podczas `POST /api/tasks/{taskId}/complete` lub `skip`

**Obsługa:**
1. Rollback optymistycznej aktualizacji (zadanie wraca na listę)
2. Usunięcie `taskId` z `processingTasks`
3. Wyświetlenie toast z błędem
4. Użytkownik może spróbować ponownie klikając przycisk

**Komunikaty:**
- 401: "Sesja wygasła. Zaloguj się ponownie." + redirect
- 404: "Zadanie nie istnieje." + refetch dashboard
- 500: "Nie udało się wykonać akcji. Spróbuj ponownie."
- Network: "Brak połączenia. Spróbuj ponownie."

### 10.4. Timeout i retry

**Ustawienia:**
- Timeout zapytania API: 10 sekund
- Rollback timeout (optymistic): 5 sekund
- Maksymalna liczba automatycznych retry: 0 (użytkownik musi ręcznie)

**Implementacja timeout:**
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);

fetch(url, { signal: controller.signal })
  .finally(() => clearTimeout(timeoutId));
```

### 10.5. Error boundaries

Dla nieprzewidzianych błędów React:

**Lokalizacja:** `src/components/ErrorBoundary.tsx`

**Funkcja:**
- Przechwytywanie błędów renderowania
- Wyświetlenie fallback UI
- Logowanie błędu (console.error lub zewnętrzny serwis)
- Opcja "Odśwież stronę"

**Użycie:**
```tsx
<ErrorBoundary>
  <Dashboard />
</ErrorBoundary>
```

## 11. Kroki implementacji

### Faza 1: Przygotowanie struktury (1-2h)

1. **Utworzenie struktury plików:**
   ```
   src/
   ├── pages/
   │   └── index.astro (modyfikacja istniejącego)
   ├── components/
   │   └── dashboard/
   │       ├── Dashboard.tsx
   │       ├── DashboardHeader.tsx
   │       ├── OverdueTasksSection.tsx
   │       ├── UpcomingTasksSection.tsx
   │       ├── TaskCard.tsx
   │       ├── NextTaskPreview.tsx
   │       ├── DashboardSummary.tsx
   │       ├── LoadingState.tsx
   │       ├── ErrorState.tsx
   │       └── EmptyState.tsx
   ├── lib/
   │   ├── api/
   │   │   └── dashboard.api.ts
   │   ├── hooks/
   │   │   └── useDashboard.ts
   │   └── types/
   │       └── dashboard.viewmodel.ts
   ```

2. **Utworzenie typów ViewModel:**
   - Utworzyć plik `dashboard.viewmodel.ts` z typami opisanymi w sekcji 5.2

3. **Przygotowanie API Client:**
   - Utworzyć `dashboard.api.ts` z funkcjami: `getDashboard()`, `completeTask()`, `skipTask()`

### Faza 2: Komponenty prezentacyjne (3-4h)

4. **`LoadingState.tsx`:**
   - Skeleton UI odzwierciedlające strukturę Dashboard
   - Użycie Shadcn/ui Skeleton component

5. **`ErrorState.tsx`:**
   - Ikona błędu (z Lucide icons)
   - Wyświetlenie komunikatu błędu
   - Przycisk "Spróbuj ponownie"

6. **`EmptyState.tsx`:**
   - Ilustracja/ikona pustego stanu
   - Komunikat zachęcający
   - Przycisk CTA "Utwórz pierwsze zadanie"

7. **`DashboardHeader.tsx`:**
   - H1 z powitaniem
   - Sformatowana aktualna data (date-fns + locale pl)

8. **`DashboardSummary.tsx`:**
   - Grid 3 kolumn ze statystykami
   - Ikony dla każdej statystyki
   - Responsywność (mobile: 1 kolumna)

9. **`NextTaskPreview.tsx`:**
   - Karta informacyjna z ikoną kalendarza
   - Tytuł najbliższego zadania
   - Data i liczba dni

### Faza 3: TaskCard i sekcje (4-5h)

10. **`TaskCard.tsx`:**
    - Wariant 'overdue': czerwony border, badge dni zaległości, przyciski Wykonaj + Pomiń
    - Wariant 'upcoming': neutralny border, badge dni do terminu, przycisk Wykonaj
    - Obsługa stanu `isProcessing` (disabled buttons, spinner)
    - ARIA labels z kontekstem
    - Animacje (opcjonalnie: Framer Motion)

11. **`OverdueTasksSection.tsx`:**
    - Nagłówek "Zaległe" z licznikiem
    - Mapowanie `tasks` na `<TaskCard variant="overdue" />`
    - Propagacja callbacków `onComplete` i `onSkip`
    - Przekazywanie `processingTasks` do każdej karty

12. **`UpcomingTasksSection.tsx`:**
    - Nagłówek "Nadchodzące (7 dni)" z licznikiem
    - Mapowanie `tasks` na `<TaskCard variant="upcoming" />`
    - Propagacja callbacku `onComplete`

### Faza 4: Zarządzanie stanem (4-5h)

13. **`useDashboard.ts` hook:**
    - Stan: `data`, `isLoading`, `error`, `processingTasks`
    - Funkcja `fetchDashboard()`:
      - Wywołanie `getDashboard(token)` z API client
      - Obsługa stanów loading/error/success
    - Funkcja `completeTask(taskId)`:
      - Dodanie do `processingTasks`
      - Optymistyczne usunięcie z listy
      - Wywołanie `completeTask(taskId, token)` z API
      - Rollback przy błędzie lub refetch przy sukcesie
    - Funkcja `skipTask(taskId)`:
      - Analogicznie do `completeTask`
    - useEffect do inicjalnego pobrania danych

14. **Implementacja optymistycznych aktualizacji:**
    - Helper do usuwania zadania z odpowiedniej listy
    - Helper do przywracania zadania (rollback)
    - Aktualizacja statystyk summary

### Faza 5: Główny komponent i integracja (3-4h)

15. **`Dashboard.tsx`:**
    - Użycie `useDashboard()` hook
    - Warunkowe renderowanie: Loading → Error → Empty → Content
    - Przekazywanie danych i callbacków do podkomponentów
    - Wrapper dla toast notifications (np. Shadcn/ui Toast)

16. **`index.astro`:**
    - Sprawdzenie autentykacji (getSession)
    - Przekierowanie do `/login` jeśli brak sesji
    - Pobranie tokenu z sesji
    - Montowanie `<Dashboard client:load token={token} />`
    - Użycie `Layout.astro` jako wrapper

### Faza 6: Stylowanie i responsywność (2-3h)

17. **Tailwind styling:**
    - Użycie klas Tailwind zgodnie z design system
    - Responsywność: mobile-first approach
    - Dark mode (jeśli w scope)

18. **Shadcn/ui components:**
    - Button z wariantami (primary, secondary, outline)
    - Card dla TaskCard, NextTaskPreview, DashboardSummary
    - Toast dla notyfikacji
    - Skeleton dla LoadingState

19. **Animacje:**
    - Fade-out przy usuwaniu zadania
    - Fade-in przy rollback
    - Success animation po akcji (opcjonalnie)
    - CSS transitions lub Framer Motion

### Faza 7: Accessibility i UX (2-3h)

20. **Accessibility:**
    - ARIA labels na wszystkich przyciskach
    - Semantic HTML (h1, h2, section, article)
    - Keyboard navigation testing
    - Screen reader testing (NVDA/JAWS/VoiceOver)
    - Focus indicators

21. **UX improvements:**
    - Min. 44px touch targets (mobile)
    - Loading states z skeleton
    - Error messages przyjazne użytkownikowi
    - Success feedback (toast)
    - Smooth animations

### Faza 8: Testowanie i debugging (2-3h)

22. **Manual testing:**
    - Test wszystkich interakcji użytkownika
    - Test na różnych rozdzielczościach (mobile, tablet, desktop)
    - Test z różnymi stanami danych (puste, 1 zadanie, wiele zadań)
    - Test błędów (brak sieci, 500, 404, 401)

23. **Edge cases:**
    - Użytkownik bez zadań
    - Tylko zaległe zadania
    - Tylko nadchodzące zadania
    - Wszystkie zadania w przyszłości (next_task)
    - Szybkie wielokrotne kliknięcia (race conditions)

24. **Debugging:**
    - Sprawdzenie console.log/errors
    - Network tab: weryfikacja wywołań API
    - React DevTools: sprawdzenie stanu komponentów

### Faza 9: Optymalizacja (opcjonalne, 1-2h)

25. **Performance:**
    - Memoizacja komponentów (React.memo)
    - useCallback dla callbacków
    - useMemo dla złożonych obliczeń
    - Code splitting jeśli potrzebne

26. **Bundle size:**
    - Sprawdzenie rozmiaru bundla
    - Tree shaking
    - Lazy loading komponentów

### Faza 10: Dokumentacja i finalizacja (1h)

27. **Komentarze w kodzie:**
    - JSDoc dla funkcji API
    - Komentarze dla złożonej logiki

28. **README:**
    - Aktualizacja dokumentacji projektu
    - Opis struktury komponentów Dashboard

29. **Review:**
    - Code review
    - Sprawdzenie zgodności z PRD i User Stories
    - Finalne testy

---

## Podsumowanie

Ten plan implementacji szczegółowo opisuje wszystkie aspekty budowy widoku Dashboard dla aplikacji Chronos. Implementacja powinna zająć około 25-30 godzin pracy dla doświadczonego frontend developera.

**Kluczowe punkty:**
- Widok główny aplikacji z trzema sekcjami: Zaległe, Nadchodzące, Następne
- Custom hook `useDashboard()` zarządzający stanem i akcjami
- Optymistyczne aktualizacje z rollback przy błędach
- Pełna accessibility (ARIA, keyboard, screen reader)
- Responsywny design (mobile-first)
- Obsługa błędów z retry mechanism
- Integracja z istniejącymi endpointami API

Plan zapewnia wszystkie wymagania z PRD i User Stories (US-011, US-012, US-013), wykorzystuje zdefiniowane typy oraz endpointy API.

