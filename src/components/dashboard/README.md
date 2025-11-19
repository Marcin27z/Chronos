# Dashboard Components

Dokumentacja komponentów widoku Dashboard dla aplikacji Chronos.

## Struktura komponentów

```
Dashboard (główny kontener)
├── DashboardHeader (nagłówek z powitaniem i datą)
├── LoadingState | ErrorState | EmptyState (stany)
└── DashboardContent
    ├── OverdueTasksSection (zadania zaległe)
    │   └── TaskCard[] (variant: overdue)
    ├── UpcomingTasksSection (zadania nadchodzące)
    │   └── TaskCard[] (variant: upcoming)
    ├── NextTaskPreview (najbliższe zadanie)
    └── DashboardSummary (statystyki)
```

## Komponenty

### Dashboard.tsx

**Opis:** Główny kontener React dla całego widoku Dashboard.

**Props:**
```typescript
interface DashboardProps {
  token: string;        // Token autoryzacji Supabase
  userName?: string;    // Opcjonalne imię użytkownika
}
```

**Użycie:**
```tsx
<Dashboard client:load token={token} userName={userName} />
```

**Zarządzanie stanem:**
- Używa hooka `useDashboard({ token })`
- Obsługuje stany: loading, error, empty, success
- Orchestruje wszystkie podkomponenty

---

### DashboardHeader.tsx

**Opis:** Nagłówek z powitaniem i aktualną datą.

**Props:**
```typescript
interface DashboardHeaderProps {
  userName?: string;
}
```

**Przykład renderowania:**
- `"Witaj, Jan!"` + data: "środa, 18 listopada 2025"

---

### TaskCard.tsx

**Opis:** Uniwersalny komponent karty zadania z dwoma wariantami.

**Props:**
```typescript
interface TaskCardProps {
  task: TaskWithDaysOverdueDTO | TaskWithDaysUntilDueDTO;
  variant: 'overdue' | 'upcoming';
  onComplete: (taskId: string) => Promise<void>;
  onSkip?: (taskId: string) => Promise<void>;  // tylko dla overdue
  isProcessing?: boolean;
}
```

**Warianty:**
- **overdue**: czerwony border, przyciski "Wykonaj" + "Pomiń"
- **upcoming**: neutralny border, tylko przycisk "Wykonaj"

**Accessibility:**
- ARIA labels z kontekstem zadania
- Min. 44px touch targets (mobile)
- Keyboard navigation support

---

### OverdueTasksSection.tsx

**Opis:** Sekcja zadań zaległych (przeterminowanych).

**Props:**
```typescript
interface OverdueTasksSectionProps {
  tasks: TaskWithDaysOverdueDTO[];
  onComplete: (taskId: string) => Promise<void>;
  onSkip: (taskId: string) => Promise<void>;
  processingTasks: Set<string>;
}
```

**Renderowanie:**
- Tylko gdy `tasks.length > 0`
- Nagłówek czerwony (destructive color)
- Licznik zadań w nagłówku

---

### UpcomingTasksSection.tsx

**Opis:** Sekcja zadań nadchodzących (7 dni).

**Props:**
```typescript
interface UpcomingTasksSectionProps {
  tasks: TaskWithDaysUntilDueDTO[];
  onComplete: (taskId: string) => Promise<void>;
  processingTasks: Set<string>;
}
```

**Renderowanie:**
- Tylko gdy `tasks.length > 0`
- Neutralny styling
- Bez przycisku "Pomiń"

---

### NextTaskPreview.tsx

**Opis:** Podgląd najbliższego zadania w przyszłości.

**Props:**
```typescript
interface NextTaskPreviewProps {
  nextTask: NextTaskDTO | null;
}
```

**Renderowanie:**
- Tylko gdy brak zaległych i nadchodzących zadań
- Informacyjna karta z ikoną kalendarza

---

### DashboardSummary.tsx

**Opis:** Statystyki użytkownika w 3 kartach.

**Props:**
```typescript
interface DashboardSummaryProps {
  summary: DashboardSummaryDTO;
}
```

**Statystyki:**
- Wszystkie zadania (ListTodo icon)
- Zaległe (AlertCircle icon)
- Nadchodzące (Clock icon)

**Responsywność:**
- Mobile: 1 kolumna
- Desktop: 3 kolumny

---

### LoadingState.tsx

**Opis:** Skeleton loader podczas ładowania danych.

**Props:** Brak

**Elementy:**
- Skeleton header (2 linie)
- 3x skeleton task cards
- Skeleton summary (3 karty)

---

### ErrorState.tsx

**Opis:** Ekran błędu z opcją retry.

**Props:**
```typescript
interface ErrorStateProps {
  error: ErrorDTO;
  onRetry: () => void;
}
```

**Funkcje:**
- Mapowanie błędów na przyjazne komunikaty
- Ikona błędu (AlertCircle)
- Przycisk "Spróbuj ponownie"

---

### EmptyState.tsx

**Opis:** Ekran pustego stanu (brak zadań).

**Props:** Brak

**Funkcje:**
- Ikona ListTodo
- Zachęta do utworzenia zadania
- Link do `/tasks/new`

---

## Hook: useDashboard

**Lokalizacja:** `src/lib/hooks/useDashboard.ts`

**Props:**
```typescript
interface UseDashboardProps {
  token: string;
}
```

**Return:**
```typescript
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
```

**Funkcjonalności:**
- Automatyczne pobieranie danych przy montowaniu
- Optymistyczne aktualizacje UI
- Rollback przy błędach
- Timeout 10 sekund
- Obsługa błędów 401 (redirect do login)

**Przykład użycia:**
```tsx
const { 
  data, 
  isLoading, 
  error, 
  processingTasks,
  completeTask, 
  skipTask, 
  refetch 
} = useDashboard({ token });

// Oznacz zadanie jako wykonane
await completeTask(taskId);

// Pomiń zadanie
await skipTask(taskId);

// Odśwież dane
await refetch();
```

---

## API Client

**Lokalizacja:** `src/lib/api/dashboard.api.ts`

**Funkcje:**

### getDashboard(token, signal?)
```typescript
Promise<ApiResponse<DashboardDTO>>
```
Pobiera dane dashboard z `GET /api/tasks/dashboard`

### completeTask(taskId, token, signal?)
```typescript
Promise<ApiResponse<TaskDTO>>
```
Oznacza zadanie jako wykonane: `POST /api/tasks/{taskId}/complete`

### skipTask(taskId, token, signal?)
```typescript
Promise<ApiResponse<TaskDTO>>
```
Pomija zadanie: `POST /api/tasks/{taskId}/skip`

**Wszystkie funkcje:**
- Obsługują AbortSignal (timeout)
- Zwracają `ApiResponse<T>` z danymi lub błędem
- Mapują błędy sieci na przyjazne komunikaty

---

## Typy

**Lokalizacja:** `src/lib/types/dashboard.viewmodel.ts`

### DashboardState
Stan widoku Dashboard.

### TaskCardVariant
```typescript
type TaskCardVariant = 'overdue' | 'upcoming';
```

### TaskActionType
```typescript
type TaskActionType = 'complete' | 'skip';
```

### TaskActionResult
```typescript
interface TaskActionResult {
  success: boolean;
  error?: ErrorDTO;
}
```

---

## Responsywność

**Breakpointy:**
- Mobile: < 640px (sm)
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Adjustacje:**
- DashboardSummary: 1 kolumna (mobile) → 3 kolumny (desktop)
- Container padding: px-4 (wszystkie rozmiary)
- TaskCard: pełna szerokość z odpowiednimi odstępami

---

## Accessibility

**Implementowane standardy:**
- ARIA labels na wszystkich przyciskach z kontekstem
- Semantic HTML (h1, h2, section)
- Keyboard navigation support
- Focus indicators
- Min. 44px touch targets (mobile)
- Screen reader friendly

**Przykłady ARIA:**
```html
<button aria-label="Wykonaj zadanie: Wymiana filtra wody">
  Wykonaj
</button>
```

---

## Styling

**Technologie:**
- Tailwind CSS 4
- CSS Variables (design tokens)
- Dark mode support

**Kolory:**
- Primary: neutralny czarny/biały
- Destructive: czerwony (dla zaległych zadań)
- Blue: niebieski (dla nadchodzących zadań)
- Muted: szary (dla pomocniczego tekstu)

---

## Testowanie

Zobacz: `TESTING.md` dla instrukcji testowania manualnego.

---

## TODO (Post-MVP)

- [ ] Toast notifications (obecnie console.log)
- [ ] Animacje transitions (Framer Motion)
- [ ] Onboarding section dla nowych użytkowników
- [ ] Infinite scroll dla długich list zadań
- [ ] Pull-to-refresh na mobile
- [ ] Offline support

