# Task List Components

Komponenty widoku listy wszystkich zadań użytkownika z możliwością sortowania, paginacji i usuwania.

## Struktura

```
TaskList (główny kontener)
├── TaskListHeader (nagłówek z licznikiem)
├── TaskSortFilter (kontrolki sortowania)
├── TaskGrid (responsywny grid)
│   └── TaskListCard[] (karty zadań)
├── Pagination (kontrolki paginacji)
├── EmptyState (pusty stan)
├── LoadingState (skeleton loader)
├── ErrorState (błąd z retry)
└── TaskDeleteDialog (modal usuwania)
```

## Komponenty

### TaskList
Główny komponent orkiestrujący cały widok. Używa custom hook `useTaskList` do zarządzania stanem.

**Funkcjonalności:**
- Pobieranie listy zadań z API
- Sortowanie po dacie lub tytule
- Paginacja (50 zadań na stronę)
- Usuwanie zadań z potwierdzeniem

### TaskListHeader
Nagłówek z tytułem i licznikiem zadań.

### TaskSortFilter
Kontrolki sortowania:
- Select: wybór pola (next_due_date / title)
- Button: przełączanie kierunku (asc / desc)

### TaskGrid
Responsywny grid (1/2/3 kolumny) z kartami zadań.

### TaskListCard
Karta pojedynczego zadania z:
- Tytułem i opisem
- Datą następnego wykonania
- Interwałem powtarzania
- Preferowanym dniem tygodnia (opcjonalnie)
- Przyciskiem usunięcia (widoczny na hover)

### Pagination
Kontrolki paginacji z informacją o stronie i zakresie.

### EmptyState
Stan gdy brak zadań.

### LoadingState
Skeleton loader podczas ładowania.

### ErrorState
Komunikat błędu z przyciskiem retry.

### TaskDeleteDialog
Modal potwierdzenia usunięcia zadania.

## Użycie

```tsx
import { TaskList } from "@/components/task-list";

<TaskList client:load />
```

## Custom Hook

`useTaskList` - zarządza stanem widoku:
- `state` - dane listy, loading, error
- `deleteState` - stan dialogu usuwania
- `actions` - handlery akcji użytkownika

## Typy

`src/lib/types/task-list.viewmodel.ts` - typy ViewModels

## API

`src/lib/api/tasks.api.ts` - funkcje API:
- `getTasks()` - pobiera listę z sortowaniem i paginacją
- `deleteTask()` - usuwa zadanie

## Utils

`src/lib/utils/date-format.utils.ts` - formatowanie:
- `formatDate()` - data z względnymi etykietami
- `formatInterval()` - interwał w polskim języku
- `getTasksLabel()` - poprawna forma słowa "zadanie"
- `getDayOfWeekLabel()` - nazwa dnia tygodnia

