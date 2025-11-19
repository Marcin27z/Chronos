# Plan implementacji widoku Task List

## 1. Przegląd

Widok Task List (`/tasks`) to kompleksowy interfejs do przeglądania i zarządzania wszystkimi zadaniami użytkownika. Umożliwia wyświetlanie paginowanej listy zadań z możliwością sortowania, tworzenia nowych zadań, edycji i usuwania istniejących oraz szybkiego oznaczania zadań jako wykonane.

**Główne funkcjonalności:**
- Wyświetlanie wszystkich zadań użytkownika w formie grid
- Sortowanie po dacie wykonania (domyślnie) lub alfabetycznie po tytule
- Paginacja (50 zadań na stronę, max 100)
- Tworzenie nowych zadań przez modal z formularzem
- Edycja istniejących zadań
- Usuwanie zadań z potwierdzeniem
- Szybkie oznaczanie zadań jako wykonane
- Responsywny layout dostosowany do urządzeń mobilnych i desktopowych

## 2. Routing widoku

**Ścieżka:** `/tasks`

**Typ komponentu:** Astro page z osadzonym React component

**Plik:** `src/pages/tasks.astro`

**Wymagania:**
- Autentykacja użytkownika (middleware)
- Server-side rendering strony Astro
- Client-side hydration komponentu React

## 3. Struktura komponentów

### Hierarchia komponentów

```
TaskListPage (Astro)
└── TaskList (React - główny kontener)
    ├── TaskListHeader
    │   ├── Nagłówek z licznikiem zadań
    │   └── Button "Dodaj zadanie"
    │
    ├── TaskSortFilter
    │   ├── Select - pole sortowania (next_due_date/title)
    │   └── Button - kierunek sortowania (asc/desc)
    │
    ├── TaskGrid
    │   └── TaskListCard[] (wiele kart)
    │       ├── TaskInfo (tytuł, opis, daty)
    │       └── TaskActions (Edit, Delete, Complete)
    │
    ├── Pagination
    │   ├── Button Previous
    │   ├── Page Info
    │   └── Button Next
    │
    ├── EmptyState (gdy brak zadań)
    ├── LoadingState (skeleton loader)
    └── ErrorState (z przyciskiem retry)
    
Modals (conditional rendering):
├── TaskFormDialog (tworzenie/edycja)
│   └── TaskForm (formularz z walidacją)
└── TaskDeleteDialog (potwierdzenie usunięcia)
```

## 4. Szczegóły komponentów

### 4.1. TaskListPage (Astro)

**Opis:** Strona Astro, która renderuje layout i osadza główny komponent React TaskList.

**Główne elementy:**
- `<Layout>` - wrapper z nawigacją
- `<TaskList client:load>` - komponent React z hydracją

**Obsługiwane zdarzenia:** Brak (deleguje do React)

**Walidacja:** Middleware sprawdza autentykację

**Typy:** Brak

**Propsy:** Brak

---

### 4.2. TaskList (React)

**Opis:** Główny kontener zarządzający stanem widoku listy zadań. Odpowiada za pobieranie danych, sortowanie, paginację, oraz orkiestrację modali.

**Główne elementy:**
```tsx
<div className="container mx-auto px-4 py-8">
  <TaskListHeader totalCount={} onCreateClick={} />
  <TaskSortFilter sortConfig={} onSortChange={} />
  
  {isLoading && <LoadingState />}
  {error && <ErrorState error={} onRetry={} />}
  {data?.data.length === 0 && <EmptyState onCreateClick={} />}
  {data && <TaskGrid tasks={} onEdit={} onDelete={} onComplete={} />}
  {data && <Pagination pagination={} onPageChange={} />}
  
  <TaskFormDialog
    isOpen={}
    mode={}
    task={}
    onClose={}
    onSubmit={}
  />
  
  <TaskDeleteDialog
    isOpen={}
    task={}
    onClose={}
    onConfirm={}
  />
</div>
```

**Obsługiwane zdarzenia:**
- `handleCreateClick()` - otwiera modal tworzenia zadania
- `handleEditClick(task)` - otwiera modal edycji zadania
- `handleDeleteClick(task)` - otwiera modal potwierdzenia usunięcia
- `handleSortChange(field, direction)` - zmienia sortowanie i pobiera dane
- `handlePageChange(page)` - zmienia stronę i pobiera dane
- `handleFormSubmit(data, mode)` - zapisuje zadanie (POST/PUT)
- `handleDeleteConfirm()` - usuwa zadanie (DELETE)
- `handleComplete(taskId)` - oznacza zadanie jako wykonane (POST)
- `handleRetry()` - ponownie pobiera dane po błędzie

**Walidacja:** Brak (walidacja w formularzu)

**Typy:**
- `TaskListState`
- `TaskFormState`
- `DeleteDialogState`
- `SortConfig`
- `TaskListDTO`

**Propsy:** Brak (top-level component)

---

### 4.3. TaskListHeader

**Opis:** Nagłówek widoku z tytułem, licznikiem zadań i przyciskiem tworzenia nowego zadania.

**Główne elementy:**
```tsx
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-3xl font-bold">Wszystkie zadania</h1>
    <p className="text-muted-foreground">
      Łącznie: {totalCount} {getTasksLabel(totalCount)}
    </p>
  </div>
  <Button onClick={onCreateClick}>
    <Plus className="h-4 w-4 mr-2" />
    Dodaj zadanie
  </Button>
</div>
```

**Obsługiwane zdarzenia:**
- `onCreateClick` - kliknięcie przycisku "Dodaj zadanie"

**Walidacja:** Brak

**Typy:**
```typescript
interface TaskListHeaderProps {
  totalCount: number;
  onCreateClick: () => void;
}
```

**Propsy:**
- `totalCount: number` - liczba wszystkich zadań użytkownika
- `onCreateClick: () => void` - callback otwarcia modalu tworzenia

---

### 4.4. TaskSortFilter

**Opis:** Kontrolki sortowania listy zadań - wybór pola sortowania i kierunku.

**Główne elementy:**
```tsx
<div className="flex items-center gap-4 mb-6">
  <div className="flex items-center gap-2">
    <label>Sortuj po:</label>
    <Select value={sortConfig.field} onValueChange={handleFieldChange}>
      <SelectItem value="next_due_date">Dacie wykonania</SelectItem>
      <SelectItem value="title">Tytule</SelectItem>
    </Select>
  </div>
  
  <Button
    variant="outline"
    size="icon"
    onClick={toggleDirection}
    aria-label={sortConfig.direction === 'asc' ? 'Sortuj malejąco' : 'Sortuj rosnąco'}
  >
    {sortConfig.direction === 'asc' ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />
    }
  </Button>
</div>
```

**Obsługiwane zdarzenia:**
- `onSortChange(field, direction)` - zmiana sortowania

**Walidacja:** Brak

**Typy:**
```typescript
interface SortConfig {
  field: "next_due_date" | "title";
  direction: "asc" | "desc";
}

interface TaskSortFilterProps {
  sortConfig: SortConfig;
  onSortChange: (field: SortConfig["field"], direction: SortConfig["direction"]) => void;
}
```

**Propsy:**
- `sortConfig: SortConfig` - aktualna konfiguracja sortowania
- `onSortChange` - callback zmiany sortowania

---

### 4.5. TaskGrid

**Opis:** Responsywny grid wyświetlający karty zadań.

**Główne elementy:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
  {tasks.map(task => (
    <TaskListCard
      key={task.id}
      task={task}
      onEdit={onEdit}
      onDelete={onDelete}
      onComplete={onComplete}
    />
  ))}
</div>
```

**Obsługiwane zdarzenia:**
- Deleguje wszystkie zdarzenia do kart TaskListCard

**Walidacja:** Brak

**Typy:**
```typescript
interface TaskGridProps {
  tasks: TaskDTO[];
  onEdit: (task: TaskDTO) => void;
  onDelete: (task: TaskDTO) => void;
  onComplete: (taskId: string) => Promise<void>;
}
```

**Propsy:**
- `tasks: TaskDTO[]` - tablica zadań do wyświetlenia
- `onEdit` - callback edycji zadania
- `onDelete` - callback usunięcia zadania
- `onComplete` - callback oznaczenia jako wykonane

---

### 4.6. TaskListCard

**Opis:** Karta pojedynczego zadania z informacjami i akcjami (Edit, Delete, Complete). Akcje widoczne na hover/focus.

**Główne elementy:**
```tsx
<div className="border rounded-lg p-6 hover:border-primary transition-colors group">
  <div className="flex items-start justify-between mb-3">
    <h3 className="text-lg font-semibold">{task.title}</h3>
    <div className="flex gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
      <Button variant="ghost" size="icon" onClick={() => onEdit(task)}>
        <Edit className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => onDelete(task)}>
        <Trash className="h-4 w-4" />
      </Button>
    </div>
  </div>
  
  {task.description && (
    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
      {task.description}
    </p>
  )}
  
  <div className="flex items-center justify-between text-sm mb-4">
    <span className="text-muted-foreground">
      Następne wykonanie: {formatDate(task.next_due_date)}
    </span>
    <span className="text-muted-foreground">
      {formatInterval(task.interval_value, task.interval_unit)}
    </span>
  </div>
  
  <Button
    onClick={() => onComplete(task.id)}
    variant="outline"
    size="sm"
    className="w-full"
  >
    <Check className="h-4 w-4 mr-2" />
    Wykonaj
  </Button>
</div>
```

**Obsługiwane zdarzenia:**
- `onEdit(task)` - kliknięcie przycisku edycji
- `onDelete(task)` - kliknięcie przycisku usunięcia
- `onComplete(taskId)` - kliknięcie przycisku wykonania

**Walidacja:** Brak

**Typy:**
```typescript
interface TaskListCardProps {
  task: TaskDTO;
  onEdit: (task: TaskDTO) => void;
  onDelete: (task: TaskDTO) => void;
  onComplete: (taskId: string) => Promise<void>;
}
```

**Propsy:**
- `task: TaskDTO` - dane zadania
- `onEdit` - callback edycji
- `onDelete` - callback usunięcia
- `onComplete` - callback wykonania

---

### 4.7. TaskFormDialog

**Opis:** Modal z formularzem tworzenia lub edycji zadania. Obsługuje walidację po stronie klienta i wyświetlanie błędów z serwera.

**Główne elementy:**
```tsx
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>
        {mode === 'create' ? 'Dodaj nowe zadanie' : 'Edytuj zadanie'}
      </DialogTitle>
    </DialogHeader>
    
    <TaskForm
      initialData={task}
      onSubmit={handleSubmit}
      onCancel={onClose}
      isSubmitting={isSubmitting}
      errors={errors}
    />
  </DialogContent>
</Dialog>
```

**Formularz TaskForm:**
```tsx
<form onSubmit={handleFormSubmit}>
  <div className="space-y-4">
    <div>
      <Label htmlFor="title">Tytuł *</Label>
      <Input
        id="title"
        value={formData.title}
        onChange={handleTitleChange}
        maxLength={256}
        aria-required="true"
        aria-invalid={!!errors.title}
        aria-describedby={errors.title ? "title-error" : undefined}
      />
      {errors.title && (
        <p id="title-error" className="text-sm text-destructive mt-1">
          {errors.title}
        </p>
      )}
    </div>
    
    <div>
      <Label htmlFor="description">Opis</Label>
      <Textarea
        id="description"
        value={formData.description}
        onChange={handleDescriptionChange}
        maxLength={5000}
        rows={4}
      />
    </div>
    
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="interval_value">Powtarzaj co *</Label>
        <Input
          id="interval_value"
          type="number"
          min={1}
          max={999}
          value={formData.interval_value}
          onChange={handleIntervalValueChange}
          aria-required="true"
          aria-invalid={!!errors.interval_value}
        />
      </div>
      
      <div>
        <Label htmlFor="interval_unit">Jednostka *</Label>
        <Select
          value={formData.interval_unit}
          onValueChange={handleIntervalUnitChange}
        >
          <SelectItem value="days">Dni</SelectItem>
          <SelectItem value="weeks">Tygodnie</SelectItem>
          <SelectItem value="months">Miesiące</SelectItem>
          <SelectItem value="years">Lata</SelectItem>
        </Select>
      </div>
    </div>
    
    <div>
      <Label htmlFor="preferred_day_of_week">Preferowany dzień tygodnia</Label>
      <Select
        value={formData.preferred_day_of_week?.toString() ?? "null"}
        onValueChange={handlePreferredDayChange}
      >
        <SelectItem value="null">Bez preferencji</SelectItem>
        <SelectItem value="0">Niedziela</SelectItem>
        <SelectItem value="1">Poniedziałek</SelectItem>
        <SelectItem value="2">Wtorek</SelectItem>
        <SelectItem value="3">Środa</SelectItem>
        <SelectItem value="4">Czwartek</SelectItem>
        <SelectItem value="5">Piątek</SelectItem>
        <SelectItem value="6">Sobota</SelectItem>
      </Select>
    </div>
  </div>
  
  <DialogFooter className="mt-6">
    <Button type="button" variant="outline" onClick={onCancel}>
      Anuluj
    </Button>
    <Button type="submit" disabled={isSubmitting}>
      {isSubmitting ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {mode === 'create' ? 'Tworzenie...' : 'Zapisywanie...'}
        </>
      ) : (
        mode === 'create' ? 'Utwórz zadanie' : 'Zapisz zmiany'
      )}
    </Button>
  </DialogFooter>
</form>
```

**Obsługiwane zdarzenia:**
- `onClose()` - zamknięcie modalu
- `onSubmit(data, mode)` - submit formularza
- Zdarzenia onChange dla każdego pola

**Walidacja:** 
- **title**: wymagane, 1-256 znaków po trim
- **description**: opcjonalne, max 5000 znaków
- **interval_value**: wymagane, liczba 1-999
- **interval_unit**: wymagane, enum
- **preferred_day_of_week**: opcjonalne, 0-6 lub null

**Typy:**
```typescript
type TaskFormMode = "create" | "edit";

interface TaskFormDialogProps {
  isOpen: boolean;
  mode: TaskFormMode;
  task: TaskDTO | null; // null dla create
  onClose: () => void;
  onSubmit: (data: TaskFormData, mode: TaskFormMode) => Promise<void>;
}

interface TaskFormData {
  title: string;
  description: string;
  interval_value: number;
  interval_unit: "days" | "weeks" | "months" | "years";
  preferred_day_of_week: number | null;
}

interface TaskFormValidationErrors {
  title?: string;
  description?: string;
  interval_value?: string;
  interval_unit?: string;
  preferred_day_of_week?: string;
}
```

**Propsy:**
- `isOpen: boolean` - czy modal jest otwarty
- `mode: TaskFormMode` - tryb formularza (create/edit)
- `task: TaskDTO | null` - dane zadania (dla edit)
- `onClose: () => void` - callback zamknięcia
- `onSubmit` - callback submitu

---

### 4.8. TaskDeleteDialog

**Opis:** Modal potwierdzenia usunięcia zadania.

**Główne elementy:**
```tsx
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Usuń zadanie</DialogTitle>
      <DialogDescription>
        Czy na pewno chcesz usunąć zadanie "{task?.title}"? 
        Ta operacja jest nieodwracalna.
      </DialogDescription>
    </DialogHeader>
    
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose}>
        Anuluj
      </Button>
      <Button
        type="button"
        variant="destructive"
        onClick={onConfirm}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Usuwanie...
          </>
        ) : (
          'Usuń zadanie'
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Obsługiwane zdarzenia:**
- `onClose()` - zamknięcie modalu
- `onConfirm()` - potwierdzenie usunięcia

**Walidacja:** Brak

**Typy:**
```typescript
interface TaskDeleteDialogProps {
  isOpen: boolean;
  task: TaskDTO | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}
```

**Propsy:**
- `isOpen: boolean` - czy modal jest otwarty
- `task: TaskDTO | null` - zadanie do usunięcia
- `onClose` - callback zamknięcia
- `onConfirm` - callback potwierdzenia

---

### 4.9. Pagination

**Opis:** Kontrolki paginacji z informacją o aktualnej stronie.

**Główne elementy:**
```tsx
<div className="flex items-center justify-between">
  <Button
    variant="outline"
    onClick={() => onPageChange(currentPage - 1)}
    disabled={currentPage === 1}
  >
    <ChevronLeft className="h-4 w-4 mr-2" />
    Poprzednia
  </Button>
  
  <span className="text-sm text-muted-foreground">
    Strona {currentPage} z {totalPages}
    {' • '}
    Wyświetlono {rangeStart}-{rangeEnd} z {total}
  </span>
  
  <Button
    variant="outline"
    onClick={() => onPageChange(currentPage + 1)}
    disabled={!pagination.has_more}
  >
    Następna
    <ChevronRight className="h-4 w-4 ml-2" />
  </Button>
</div>
```

**Obsługiwane zdarzenia:**
- `onPageChange(page)` - zmiana strony

**Walidacja:** Brak

**Typy:**
```typescript
interface PaginationProps {
  pagination: PaginationDTO;
  onPageChange: (page: number) => void;
}
```

**Propsy:**
- `pagination: PaginationDTO` - dane paginacji z API
- `onPageChange` - callback zmiany strony

---

### 4.10. EmptyState

**Opis:** Widok gdy użytkownik nie ma jeszcze żadnych zadań.

**Główne elementy:**
```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <ClipboardList className="h-16 w-16 text-muted-foreground mb-4" />
  <h2 className="text-2xl font-semibold mb-2">Brak zadań</h2>
  <p className="text-muted-foreground mb-6 max-w-md">
    Nie masz jeszcze żadnych zadań. Zacznij od dodania pierwszego zadania.
  </p>
  <Button onClick={onCreateClick}>
    <Plus className="h-4 w-4 mr-2" />
    Dodaj pierwsze zadanie
  </Button>
</div>
```

**Obsługiwane zdarzenia:**
- `onCreateClick()` - kliknięcie przycisku tworzenia

**Walidacja:** Brak

**Typy:**
```typescript
interface EmptyStateProps {
  onCreateClick: () => void;
}
```

**Propsy:**
- `onCreateClick` - callback otwarcia modalu tworzenia

---

### 4.11. LoadingState

**Opis:** Skeleton loader wyświetlany podczas ładowania danych.

**Główne elementy:**
```tsx
<div className="space-y-6">
  <div className="h-10 w-64 bg-muted animate-pulse rounded" />
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="border rounded-lg p-6 space-y-4">
        <div className="h-6 bg-muted animate-pulse rounded" />
        <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
        <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
        <div className="h-8 bg-muted animate-pulse rounded" />
      </div>
    ))}
  </div>
</div>
```

**Obsługiwane zdarzenia:** Brak

**Walidacja:** Brak

**Typy:** Brak

**Propsy:** Brak

---

### 4.12. ErrorState

**Opis:** Komunikat błędu z przyciskiem ponowienia próby.

**Główne elementy:**
```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <AlertCircle className="h-16 w-16 text-destructive mb-4" />
  <h2 className="text-2xl font-semibold mb-2">Wystąpił błąd</h2>
  <p className="text-muted-foreground mb-6 max-w-md">
    {error.error}
    {error.details && `: ${error.details}`}
  </p>
  <Button onClick={onRetry}>
    <RefreshCw className="h-4 w-4 mr-2" />
    Spróbuj ponownie
  </Button>
</div>
```

**Obsługiwane zdarzenia:**
- `onRetry()` - ponowienie próby pobrania danych

**Walidacja:** Brak

**Typy:**
```typescript
interface ErrorStateProps {
  error: ErrorDTO;
  onRetry: () => void;
}
```

**Propsy:**
- `error: ErrorDTO` - obiekt błędu z API
- `onRetry` - callback ponowienia

## 5. Typy

### 5.1. Istniejące typy (z types.ts)

```typescript
// Główne DTO
export type TaskDTO = Task;
export interface TaskListDTO {
  data: TaskDTO[];
  pagination: PaginationDTO;
}

export interface PaginationDTO {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

// Command models
export type CreateTaskCommand = Pick<
  TablesInsert<"tasks">,
  "title" | "description" | "interval_value" | "interval_unit" | "preferred_day_of_week"
>;

export type UpdateTaskCommand = Partial<
  Pick<TablesUpdate<"tasks">, "title" | "description" | "interval_value" | "interval_unit" | "preferred_day_of_week">
>;

// Error models
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

### 5.2. Nowe typy ViewModels (task-list.viewmodel.ts)

**Lokalizacja:** `src/lib/types/task-list.viewmodel.ts`

```typescript
import type { TaskListDTO, ErrorDTO, TaskDTO } from "../../types";

/**
 * Konfiguracja sortowania listy zadań
 */
export interface SortConfig {
  /** Pole sortowania */
  field: "next_due_date" | "title";
  /** Kierunek sortowania */
  direction: "asc" | "desc";
}

/**
 * Stan widoku listy zadań
 */
export interface TaskListState {
  /** Dane listy zadań lub null jeśli nie załadowane */
  data: TaskListDTO | null;
  /** Flaga ładowania początkowego lub odświeżania */
  isLoading: boolean;
  /** Błąd jeśli wystąpił */
  error: ErrorDTO | null;
  /** Konfiguracja sortowania */
  sortConfig: SortConfig;
  /** Numer aktualnej strony (1-indexed) */
  currentPage: number;
}

/**
 * Tryb formularza zadania
 */
export type TaskFormMode = "create" | "edit";

/**
 * Stan formularza zadania
 */
export interface TaskFormState {
  /** Czy modal jest otwarty */
  isOpen: boolean;
  /** Tryb formularza */
  mode: TaskFormMode;
  /** Dane zadania (null dla create, TaskDTO dla edit) */
  task: TaskDTO | null;
  /** Czy formularz jest w trakcie submitu */
  isSubmitting: boolean;
}

/**
 * Stan dialogu usuwania zadania
 */
export interface DeleteDialogState {
  /** Czy dialog jest otwarty */
  isOpen: boolean;
  /** Zadanie do usunięcia */
  task: TaskDTO | null;
  /** Czy usuwanie jest w trakcie */
  isDeleting: boolean;
}

/**
 * Dane formularza zadania (kontrolowany formularz)
 */
export interface TaskFormData {
  title: string;
  description: string;
  interval_value: number;
  interval_unit: "days" | "weeks" | "months" | "years";
  preferred_day_of_week: number | null;
}

/**
 * Błędy walidacji formularza po stronie klienta
 */
export interface TaskFormValidationErrors {
  title?: string;
  description?: string;
  interval_value?: string;
  interval_unit?: string;
  preferred_day_of_week?: string;
}

/**
 * Parsuje TaskDTO do TaskFormData (dla edycji)
 */
export function taskDTOToFormData(task: TaskDTO): TaskFormData {
  return {
    title: task.title,
    description: task.description ?? "",
    interval_value: task.interval_value,
    interval_unit: task.interval_unit,
    preferred_day_of_week: task.preferred_day_of_week,
  };
}

/**
 * Parsuje TaskFormData do CreateTaskCommand/UpdateTaskCommand
 */
export function formDataToCommand(data: TaskFormData): CreateTaskCommand {
  return {
    title: data.title.trim(),
    description: data.description.trim() || null,
    interval_value: data.interval_value,
    interval_unit: data.interval_unit,
    preferred_day_of_week: data.preferred_day_of_week,
  };
}
```

## 6. Zarządzanie stanem

### 6.1. Custom Hook: useTaskList

**Lokalizacja:** `src/lib/hooks/useTaskList.ts`

**Odpowiedzialności:**
- Zarządzanie stanem listy zadań (TaskListState)
- Zarządzanie stanem formularza (TaskFormState)
- Zarządzanie stanem dialogu usuwania (DeleteDialogState)
- Pobieranie danych z API
- Obsługa akcji użytkownika (sort, paginate, CRUD operations)
- Obsługa błędów

**Struktura:**

```typescript
import { useState, useEffect, useCallback } from "react";
import type {
  TaskListState,
  TaskFormState,
  DeleteDialogState,
  SortConfig,
  TaskFormData,
  TaskFormMode,
} from "../types/task-list.viewmodel";
import type { TaskDTO } from "../../types";
import { getTasks, createTask, updateTask, deleteTask, completeTask } from "../api/tasks.api";

export function useTaskList() {
  // ==================== STATE ====================
  
  const [state, setState] = useState<TaskListState>({
    data: null,
    isLoading: true,
    error: null,
    sortConfig: {
      field: "next_due_date",
      direction: "asc",
    },
    currentPage: 1,
  });

  const [formState, setFormState] = useState<TaskFormState>({
    isOpen: false,
    mode: "create",
    task: null,
    isSubmitting: false,
  });

  const [deleteState, setDeleteState] = useState<DeleteDialogState>({
    isOpen: false,
    task: null,
    isDeleting: false,
  });

  // ==================== DATA FETCHING ====================
  
  const fetchTasks = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const { field, direction } = state.sortConfig;
      const sortParam = `${direction === "desc" ? "-" : ""}${field}`;
      const offset = (state.currentPage - 1) * 50;
      
      const data = await getTasks(sortParam, 50, offset);
      
      setState(prev => ({
        ...prev,
        data,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as ErrorDTO,
        isLoading: false,
      }));
    }
  }, [state.sortConfig, state.currentPage]);

  // Fetch data on mount and when sort/page changes
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // ==================== ACTIONS ====================
  
  const handleSort = useCallback((field: SortConfig["field"]) => {
    setState(prev => {
      const newDirection =
        prev.sortConfig.field === field && prev.sortConfig.direction === "asc"
          ? "desc"
          : "asc";
      
      return {
        ...prev,
        sortConfig: { field, direction: newDirection },
        currentPage: 1, // Reset to first page
      };
    });
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setState(prev => ({ ...prev, currentPage: page }));
  }, []);

  const handleCreateClick = useCallback(() => {
    setFormState({
      isOpen: true,
      mode: "create",
      task: null,
      isSubmitting: false,
    });
  }, []);

  const handleEditClick = useCallback((task: TaskDTO) => {
    setFormState({
      isOpen: true,
      mode: "edit",
      task,
      isSubmitting: false,
    });
  }, []);

  const handleDeleteClick = useCallback((task: TaskDTO) => {
    setDeleteState({
      isOpen: true,
      task,
      isDeleting: false,
    });
  }, []);

  const handleFormClose = useCallback(() => {
    setFormState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleFormSubmit = useCallback(
    async (data: TaskFormData, mode: TaskFormMode) => {
      setFormState(prev => ({ ...prev, isSubmitting: true }));
      
      try {
        if (mode === "create") {
          await createTask(formDataToCommand(data));
        } else if (mode === "edit" && formState.task) {
          await updateTask(formState.task.id, formDataToCommand(data));
        }
        
        setFormState({ isOpen: false, mode: "create", task: null, isSubmitting: false });
        await fetchTasks(); // Refresh list
      } catch (error) {
        setFormState(prev => ({ ...prev, isSubmitting: false }));
        // Error handling done in form component
        throw error;
      }
    },
    [formState.task, fetchTasks]
  );

  const handleDeleteClose = useCallback(() => {
    setDeleteState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteState.task) return;
    
    setDeleteState(prev => ({ ...prev, isDeleting: true }));
    
    try {
      await deleteTask(deleteState.task.id);
      setDeleteState({ isOpen: false, task: null, isDeleting: false });
      await fetchTasks(); // Refresh list
    } catch (error) {
      setDeleteState(prev => ({ ...prev, isDeleting: false }));
      // Show error toast
      throw error;
    }
  }, [deleteState.task, fetchTasks]);

  const handleComplete = useCallback(
    async (taskId: string) => {
      try {
        await completeTask(taskId);
        await fetchTasks(); // Refresh list
      } catch (error) {
        // Show error toast
        throw error;
      }
    },
    [fetchTasks]
  );

  const handleRetry = useCallback(() => {
    fetchTasks();
  }, [fetchTasks]);

  // ==================== RETURN ====================
  
  return {
    // State
    state,
    formState,
    deleteState,
    
    // Actions
    actions: {
      handleSort,
      handlePageChange,
      handleCreateClick,
      handleEditClick,
      handleDeleteClick,
      handleFormClose,
      handleFormSubmit,
      handleDeleteClose,
      handleDeleteConfirm,
      handleComplete,
      handleRetry,
    },
  };
}
```

### 6.2. Walidacja formularza

**Lokalizacja:** `src/lib/utils/task-validation.utils.ts`

```typescript
import type { TaskFormData, TaskFormValidationErrors } from "../types/task-list.viewmodel";

export function validateTaskForm(data: TaskFormData): TaskFormValidationErrors {
  const errors: TaskFormValidationErrors = {};

  // Title validation
  const title = data.title.trim();
  if (!title) {
    errors.title = "Tytuł jest wymagany";
  } else if (title.length > 256) {
    errors.title = "Tytuł może mieć maksymalnie 256 znaków";
  }

  // Description validation
  if (data.description.length > 5000) {
    errors.description = "Opis może mieć maksymalnie 5000 znaków";
  }

  // Interval value validation
  if (!Number.isInteger(data.interval_value)) {
    errors.interval_value = "Wartość musi być liczbą całkowitą";
  } else if (data.interval_value < 1) {
    errors.interval_value = "Wartość musi być co najmniej 1";
  } else if (data.interval_value > 999) {
    errors.interval_value = "Wartość nie może przekraczać 999";
  }

  // Interval unit validation
  const validUnits = ["days", "weeks", "months", "years"];
  if (!validUnits.includes(data.interval_unit)) {
    errors.interval_unit = "Nieprawidłowa jednostka interwału";
  }

  // Preferred day validation
  if (data.preferred_day_of_week !== null) {
    if (!Number.isInteger(data.preferred_day_of_week)) {
      errors.preferred_day_of_week = "Dzień tygodnia musi być liczbą całkowitą";
    } else if (data.preferred_day_of_week < 0 || data.preferred_day_of_week > 6) {
      errors.preferred_day_of_week = "Dzień tygodnia musi być liczbą od 0 do 6";
    }
  }

  return errors;
}
```

## 7. Integracja API

### 7.1. API Client

**Lokalizacja:** `src/lib/api/tasks.api.ts`

**Funkcje:**

```typescript
import type {
  TaskListDTO,
  TaskDTO,
  CreateTaskCommand,
  UpdateTaskCommand,
  ErrorDTO,
  ValidationErrorDTO,
} from "../../types";

/**
 * Pobiera listę zadań użytkownika z sortowaniem i paginacją
 */
export async function getTasks(
  sort: string = "next_due_date",
  limit: number = 50,
  offset: number = 0
): Promise<TaskListDTO> {
  const params = new URLSearchParams({
    sort,
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await fetch(`/api/tasks?${params}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw error as ErrorDTO;
  }

  return response.json();
}

/**
 * Tworzy nowe zadanie
 */
export async function createTask(command: CreateTaskCommand): Promise<TaskDTO> {
  const response = await fetch("/api/tasks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error as ErrorDTO | ValidationErrorDTO;
  }

  return response.json();
}

/**
 * Pobiera pojedyncze zadanie po ID
 */
export async function getTask(taskId: string): Promise<TaskDTO> {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw error as ErrorDTO;
  }

  return response.json();
}

/**
 * Aktualizuje istniejące zadanie
 */
export async function updateTask(
  taskId: string,
  command: UpdateTaskCommand
): Promise<TaskDTO> {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const error = await response.json();
    throw error as ErrorDTO | ValidationErrorDTO;
  }

  return response.json();
}

/**
 * Usuwa zadanie
 */
export async function deleteTask(taskId: string): Promise<void> {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw error as ErrorDTO;
  }
}

/**
 * Oznacza zadanie jako wykonane
 */
export async function completeTask(taskId: string): Promise<TaskDTO> {
  const response = await fetch(`/api/tasks/${taskId}/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw error as ErrorDTO;
  }

  return response.json();
}
```

### 7.2. Typy żądań i odpowiedzi

| Endpoint | Metoda | Request Body | Response Body | Response Status |
|----------|--------|--------------|---------------|-----------------|
| `/api/tasks` | GET | - | `TaskListDTO` | 200 OK |
| `/api/tasks` | POST | `CreateTaskCommand` | `TaskDTO` | 201 Created |
| `/api/tasks/{taskId}` | GET | - | `TaskDTO` | 200 OK |
| `/api/tasks/{taskId}` | PUT | `UpdateTaskCommand` | `TaskDTO` | 200 OK |
| `/api/tasks/{taskId}` | DELETE | - | - | 204 No Content |
| `/api/tasks/{taskId}/complete` | POST | - | `TaskDTO` | 200 OK |

## 8. Interakcje użytkownika

### 8.1. Podstawowe interakcje

**1. Wejście na stronę `/tasks`**
- System: Wywołanie `GET /api/tasks` z domyślnymi parametrami
- UI: Wyświetlenie `LoadingState`
- System: Otrzymanie odpowiedzi z API
- UI: 
  - Jeśli sukces i zadania istnieją → wyświetlenie `TaskGrid` z kartami
  - Jeśli sukces ale brak zadań → wyświetlenie `EmptyState`
  - Jeśli błąd → wyświetlenie `ErrorState`

**2. Kliknięcie przycisku "Dodaj zadanie"**
- UI: Otwarcie `TaskFormDialog` w trybie `create`
- UI: Wyświetlenie pustego formularza
- Użytkownik: Wypełnienie pól formularza
- UI: Walidacja w czasie rzeczywistym (onChange)
- Użytkownik: Kliknięcie "Utwórz zadanie"
- UI: Walidacja wszystkich pól
- System: Jeśli walidacja OK → `POST /api/tasks`
- UI: Wyświetlenie stanu ładowania na przycisku
- System: Odpowiedź z API
- UI:
  - Jeśli sukces → zamknięcie modalu, odświeżenie listy, toast sukcesu
  - Jeśli błąd walidacji → wyświetlenie błędów pod polami
  - Jeśli błąd serwera → wyświetlenie toast błędu

**3. Zmiana sortowania**
- Użytkownik: Wybór pola sortowania z dropdown (next_due_date/title)
- UI: Aktualizacja `SortConfig.field`
- UI: Ustawienie `SortConfig.direction` na `asc` (dla nowego pola)
- System: Wywołanie `GET /api/tasks` z nowym parametrem `sort`
- UI: Wyświetlenie `LoadingState`
- System: Otrzymanie odpowiedzi
- UI: Aktualizacja listy zadań

**4. Przełączenie kierunku sortowania**
- Użytkownik: Kliknięcie przycisku strzałki (↑/↓)
- UI: Przełączenie `SortConfig.direction` (asc ↔ desc)
- System: Wywołanie `GET /api/tasks` z parametrem `sort` z prefiksem `-`
- UI: Wyświetlenie `LoadingState`
- System: Otrzymanie odpowiedzi
- UI: Aktualizacja listy zadań

**5. Zmiana strony (Next/Previous)**
- Użytkownik: Kliknięcie "Następna" lub "Poprzednia"
- UI: Aktualizacja `currentPage` (+1 lub -1)
- UI: Obliczenie nowego `offset` = (currentPage - 1) * 50
- System: Wywołanie `GET /api/tasks` z nowym `offset`
- UI: Wyświetlenie `LoadingState`
- System: Otrzymanie odpowiedzi
- UI: Aktualizacja listy zadań
- UI: Scroll na górę strony

**6. Edycja zadania**
- Użytkownik: Hover nad kartą → wyświetlenie przycisków akcji
- Użytkownik: Kliknięcie przycisku "Edit" (ołówek)
- UI: Otwarcie `TaskFormDialog` w trybie `edit`
- UI: Wypełnienie formularza danymi `TaskDTO`
- Użytkownik: Edycja pól
- Użytkownik: Kliknięcie "Zapisz zmiany"
- UI: Walidacja pól
- System: Jeśli OK → `PUT /api/tasks/{taskId}`
- UI: Wyświetlenie stanu ładowania
- System: Odpowiedź z API
- UI:
  - Jeśli sukces → zamknięcie modalu, odświeżenie listy
  - Jeśli błąd → wyświetlenie błędów

**7. Usunięcie zadania**
- Użytkownik: Hover nad kartą
- Użytkownik: Kliknięcie przycisku "Delete" (kosz)
- UI: Otwarcie `TaskDeleteDialog`
- UI: Wyświetlenie komunikatu z tytułem zadania
- Użytkownik: Kliknięcie "Usuń zadanie"
- System: `DELETE /api/tasks/{taskId}`
- UI: Wyświetlenie stanu ładowania
- System: Odpowiedź z API (204 No Content)
- UI:
  - Jeśli sukces → zamknięcie modalu, usunięcie z listy, toast sukcesu
  - Jeśli błąd → toast błędu, pozostawienie modalu otwartego

**8. Oznaczenie jako wykonane**
- Użytkownik: Kliknięcie przycisku "Wykonaj" na karcie
- System: `POST /api/tasks/{taskId}/complete`
- UI: Wyświetlenie stanu ładowania na przycisku
- System: Odpowiedź z API (TaskDTO z nową next_due_date)
- UI:
  - Jeśli sukces → usunięcie z aktualnej listy (bo data się zmieniła), toast sukcesu
  - Jeśli błąd → toast błędu

**9. Obsługa błędu ładowania**
- System: Błąd podczas `GET /api/tasks`
- UI: Wyświetlenie `ErrorState` z komunikatem
- Użytkownik: Kliknięcie "Spróbuj ponownie"
- System: Ponowne wywołanie `GET /api/tasks`
- UI: Przejście przez cykl ładowania ponownie

### 8.2. Keyboard navigation

- **Tab**: Przechodzenie między elementami interaktywnymi
- **Enter**: Aktywacja przycisków, otwarcie dropdown
- **Space**: Aktywacja checkboxów/radio buttons
- **Escape**: Zamknięcie modali
- **Arrow keys**: Nawigacja w dropdown (sortowanie)

## 9. Warunki i walidacja

### 9.1. Walidacja formularza (client-side)

**Pole: title**
- **Warunek**: Wymagane, 1-256 znaków (po trim)
- **Weryfikacja**: 
  - onChange: sprawdzenie długości
  - onBlur: sprawdzenie czy niepuste
  - onSubmit: sprawdzenie czy niepuste i długość ≤256
- **Komunikaty**:
  - Puste: "Tytuł jest wymagany"
  - Za długie: "Tytuł może mieć maksymalnie 256 znaków"
- **UI**: Czerwona ramka, tekst błędu pod polem, ikona błędu

**Pole: description**
- **Warunek**: Opcjonalne, max 5000 znaków
- **Weryfikacja**: onChange - sprawdzenie długości
- **Komunikaty**: "Opis może mieć maksymalnie 5000 znaków"
- **UI**: Licznik znaków (jeśli > 4500), czerwona ramka przy przekroczeniu

**Pole: interval_value**
- **Warunek**: Wymagane, liczba całkowita 1-999
- **Weryfikacja**:
  - onChange: sprawdzenie czy liczba, czy w zakresie
  - onBlur: formatowanie do integer
- **Komunikaty**:
  - Puste: "Wartość jest wymagana"
  - Nieprawidłowa: "Wartość musi być liczbą od 1 do 999"
- **UI**: Input type="number", min="1", max="999"

**Pole: interval_unit**
- **Warunek**: Wymagane, enum ["days", "weeks", "months", "years"]
- **Weryfikacja**: Automatyczna przez Select component
- **Komunikaty**: Brak (zawsze prawidłowe przez UI)

**Pole: preferred_day_of_week**
- **Warunek**: Opcjonalne, 0-6 lub null
- **Weryfikacja**: Automatyczna przez Select component
- **Komunikaty**: Brak (zawsze prawidłowe przez UI)

### 9.2. Warunki wyświetlania komponentów

**EmptyState**
- **Warunek**: `data?.data.length === 0 && !isLoading && !error`
- **Lokalizacja**: TaskList component

**LoadingState**
- **Warunek**: `isLoading === true`
- **Lokalizacja**: TaskList component

**ErrorState**
- **Warunek**: `error !== null && !isLoading`
- **Lokalizacja**: TaskList component

**TaskGrid**
- **Warunek**: `data && data.data.length > 0 && !isLoading && !error`
- **Lokalizacja**: TaskList component

**Pagination**
- **Warunek**: `data && data.pagination.total > 50`
- **Lokalizacja**: TaskList component (poniżej TaskGrid)

**TaskFormDialog**
- **Warunek**: `formState.isOpen === true`
- **Lokalizacja**: TaskList component

**TaskDeleteDialog**
- **Warunek**: `deleteState.isOpen === true`
- **Lokalizacja**: TaskList component

**TaskActions (Edit/Delete buttons)**
- **Warunek**: Zawsze renderowane, ale opacity controlled przez group-hover
- **Lokalizacja**: TaskListCard component

### 9.3. Warunki disable przycisków

**Przycisk "Previous" (Pagination)**
- **Disable when**: `currentPage === 1`

**Przycisk "Next" (Pagination)**
- **Disable when**: `!pagination.has_more`

**Przycisk "Utwórz zadanie" / "Zapisz zmiany" (Form)**
- **Disable when**: `isSubmitting === true || hasValidationErrors === true`

**Przycisk "Usuń zadanie" (Delete Dialog)**
- **Disable when**: `isDeleting === true`

**Przycisk "Wykonaj" (TaskCard)**
- **Disable when**: Akcja w toku dla tego konkretnego zadania

## 10. Obsługa błędów

### 10.1. Błędy HTTP

**401 Unauthorized**
- **Kiedy**: Brak lub nieprawidłowy token autentykacji
- **Obsługa**: 
  - Redirect na `/login`
  - Czyszczenie session storage
  - Komunikat: "Sesja wygasła. Zaloguj się ponownie."
- **Lokalizacja**: API client (interceptor lub w każdej funkcji)

**400 Bad Request (Validation Error)**
- **Kiedy**: Błąd walidacji danych formularza
- **Obsługa**: 
  - Parsowanie `ValidationErrorDTO`
  - Mapowanie błędów do pól formularza
  - Wyświetlenie błędów pod odpowiednimi polami
- **Przykład**: 
  ```typescript
  if (error.details) {
    const formErrors: TaskFormValidationErrors = {};
    error.details.forEach(detail => {
      formErrors[detail.field] = detail.message;
    });
    setFormErrors(formErrors);
  }
  ```

**404 Not Found**
- **Kiedy**: Zadanie nie istnieje lub nie należy do użytkownika
- **Obsługa**:
  - Zamknięcie modalu (jeśli otwarty)
  - Toast: "Zadanie nie zostało znalezione"
  - Odświeżenie listy (usunięcie z local state)

**500 Internal Server Error**
- **Kiedy**: Nieoczekiwany błąd serwera
- **Obsługa**:
  - Toast: "Wystąpił błąd serwera. Spróbuj ponownie później."
  - Logowanie błędu do systemu monitoringu
  - Możliwość retry

### 10.2. Błędy sieciowe

**Network Error**
- **Kiedy**: Brak połączenia z internetem, timeout
- **Obsługa**:
  - Toast: "Problem z połączeniem. Sprawdź internet i spróbuj ponownie."
  - Wyświetlenie `ErrorState` z przyciskiem retry
  - Zachowanie danych formularza (nie czyszczenie)

**Timeout**
- **Kiedy**: Zapytanie trwa zbyt długo (>30s)
- **Obsługa**:
  - Przerwanie zapytania
  - Toast: "Zapytanie przekroczyło limit czasu. Spróbuj ponownie."
  - Możliwość retry

### 10.3. Błędy stanu

**Empty State (brak zadań)**
- **Kiedy**: `data.data.length === 0`
- **Obsługa**:
  - Wyświetlenie `EmptyState` z komunikatem zachęcającym
  - Przycisk "Dodaj pierwsze zadanie" bezpośrednio otwierający formularz

**Empty Page (pusta strona po usunięciu)**
- **Kiedy**: Usunięcie ostatniego zadania na stronie > 1
- **Obsługa**:
  - Automatyczne cofnięcie do poprzedniej strony
  - `currentPage = Math.max(1, currentPage - 1)`
  - Odświeżenie listy

### 10.4. Toasty i komunikaty

**Sukces - Utworzenie zadania**
- Komunikat: "Zadanie zostało utworzone"
- Typ: Success
- Czas: 3s

**Sukces - Edycja zadania**
- Komunikat: "Zadanie zostało zaktualizowane"
- Typ: Success
- Czas: 3s

**Sukces - Usunięcie zadania**
- Komunikat: "Zadanie zostało usunięte"
- Typ: Success
- Czas: 3s

**Sukces - Wykonanie zadania**
- Komunikat: "Zadanie oznaczone jako wykonane"
- Typ: Success
- Czas: 3s

**Błąd - Ogólny**
- Komunikat: Treść z `error.error` lub `error.details`
- Typ: Error
- Czas: 5s
- Akcja: Przycisk zamknięcia

## 11. Kroki implementacji

### Faza 1: Struktura i typy (1-2h)

1. **Utworzenie pliku typów ViewModels**
   - Utworzyć `src/lib/types/task-list.viewmodel.ts`
   - Zdefiniować wszystkie typy z sekcji 5.2
   - Dodać helper functions (taskDTOToFormData, formDataToCommand)

2. **Utworzenie API client**
   - Utworzyć `src/lib/api/tasks.api.ts`
   - Zaimplementować wszystkie funkcje API z sekcji 7.1
   - Obsługa błędów w każdej funkcji

3. **Utworzenie utils walidacji**
   - Utworzyć `src/lib/utils/task-validation.utils.ts`
   - Zaimplementować `validateTaskForm` z sekcji 6.2

### Faza 2: Custom Hook (2-3h)

4. **Implementacja useTaskList hook**
   - Utworzyć `src/lib/hooks/useTaskList.ts`
   - Zaimplementować stan (TaskListState, TaskFormState, DeleteDialogState)
   - Zaimplementować `fetchTasks` z useEffect
   - Zaimplementować wszystkie action handlers
   - Dodać obsługę błędów

### Faza 3: Komponenty pomocnicze (2-3h)

5. **LoadingState component**
   - Utworzyć `src/components/task-list/LoadingState.tsx`
   - Skeleton loader z 6 kartami

6. **ErrorState component**
   - Utworzyć `src/components/task-list/ErrorState.tsx`
   - Wyświetlenie błędu z przyciskiem retry

7. **EmptyState component**
   - Utworzyć `src/components/task-list/EmptyState.tsx`
   - Komunikat + przycisk "Dodaj pierwsze zadanie"

8. **Pagination component**
   - Utworzyć `src/components/task-list/Pagination.tsx`
   - Previous/Next buttons + informacja o stronie

### Faza 4: Komponenty główne (3-4h)

9. **TaskListHeader component**
   - Utworzyć `src/components/task-list/TaskListHeader.tsx`
   - Nagłówek + licznik + przycisk "Dodaj zadanie"

10. **TaskSortFilter component**
    - Utworzyć `src/components/task-list/TaskSortFilter.tsx`
    - Select do wyboru pola sortowania
    - Button do przełączania kierunku (asc/desc)
    - Użycie Shadcn Select component

11. **TaskListCard component**
    - Utworzyć `src/components/task-list/TaskListCard.tsx`
    - Layout karty z tytułem, opisem, datami
    - Hover actions (Edit, Delete)
    - Przycisk "Wykonaj"
    - Helper funkcje do formatowania dat i interwałów

12. **TaskGrid component**
    - Utworzyć `src/components/task-list/TaskGrid.tsx`
    - Responsywny grid (1/2/3 kolumny)
    - Renderowanie TaskListCard dla każdego zadania

### Faza 5: Formularze i dialogi (4-5h)

13. **TaskForm component**
    - Utworzyć `src/components/task-list/TaskForm.tsx`
    - Wszystkie pola zgodnie z sekcją 4.7
    - Kontrolowany formularz (useState dla każdego pola)
    - Walidacja onChange i onSubmit
    - Wyświetlanie błędów pod polami
    - Obsługa isSubmitting state

14. **TaskFormDialog component**
    - Utworzyć `src/components/task-list/TaskFormDialog.tsx`
    - Dialog z Shadcn
    - Osadzenie TaskForm
    - Zarządzanie trybem create/edit
    - Przekazywanie callbacks

15. **TaskDeleteDialog component**
    - Utworzyć `src/components/task-list/TaskDeleteDialog.tsx`
    - Dialog potwierdzenia usunięcia
    - Wyświetlenie tytułu zadania
    - Przyciski Anuluj/Usuń
    - Obsługa isDeleting state

### Faza 6: Główny kontener React (2-3h)

16. **TaskList component**
    - Utworzyć `src/components/task-list/TaskList.tsx`
    - Użycie `useTaskList` hook
    - Renderowanie conditional wszystkich komponentów
    - Przekazywanie props i callbacks
    - Obsługa stanów (loading, error, empty, data)

### Faza 7: Strona Astro (1h)

17. **tasks.astro page**
    - Utworzyć `src/pages/tasks.astro`
    - Import Layout
    - Osadzenie `<TaskList client:load />`
    - Meta tags (title, description)

### Faza 8: Stylowanie i responsywność (2-3h)

18. **Responsywność**
    - Sprawdzenie wszystkich komponentów na urządzeniach mobilnych
    - Dostosowanie grid breakpoints
    - Dostosowanie padding/spacing dla mobile
    - Testowanie na różnych rozdzielczościach

19. **Dostępność (a11y)**
    - Dodanie ARIA labels do wszystkich przycisków
    - Sprawdzenie keyboard navigation
    - Testowanie z screen readerem
    - Focus management w modalach
    - Skip links (opcjonalnie)

### Faza 9: Integracja i testy (2-3h)

20. **Integracja z API**
    - Testowanie wszystkich endpoints
    - Sprawdzenie obsługi błędów (401, 400, 404, 500)
    - Testowanie walidacji po stronie serwera
    - Weryfikacja typów odpowiedzi

21. **Testowanie funkcjonalności**
    - Testowanie całego flow tworzenia zadania
    - Testowanie edycji zadania
    - Testowanie usuwania zadania
    - Testowanie wykonywania zadania
    - Testowanie sortowania i paginacji
    - Testowanie empty state

22. **Testowanie edge cases**
    - Bardzo długi tytuł/opis
    - Specjalne znaki w polach
    - Równoczesne akcje na wielu zadaniach
    - Powrót na stronę po akcji (refresh)
    - Utrata połączenia podczas operacji

### Faza 10: Optymalizacja i dokumentacja (1-2h)

23. **Optymalizacja performance**
    - React.memo dla komponentów które często się re-renderują
    - useCallback dla wszystkich callback functions
    - useMemo dla ciężkich obliczeń (jeśli są)

24. **Dokumentacja**
    - Dodanie JSDoc do wszystkich funkcji
    - Komentarze w kodzie gdzie potrzebne
    - README z opisem struktury komponentów
    - Diagramy flow (opcjonalnie)

### Podsumowanie czasowe:
- **Całkowity szacowany czas: 22-31 godzin**
- Minimum viable: ~22h (bez zaawansowanej optymalizacji)
- Z pełną implementacją: ~31h (z wszystkimi usprawnieniami)

---

## Załącznik: Przykładowe helper functions

### Formatowanie daty (pl locale)

```typescript
// src/lib/utils/date-format.utils.ts

export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Jeśli dzisiaj
  if (diffDays === 0) {
    return "Dzisiaj";
  }

  // Jeśli jutro
  if (diffDays === 1) {
    return "Jutro";
  }

  // Jeśli wczoraj
  if (diffDays === -1) {
    return "Wczoraj";
  }

  // W przeciwnym razie pełna data
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatInterval(value: number, unit: string): string {
  const unitLabels: Record<string, [string, string, string]> = {
    days: ["dzień", "dni", "dni"],
    weeks: ["tydzień", "tygodnie", "tygodni"],
    months: ["miesiąc", "miesiące", "miesięcy"],
    years: ["rok", "lata", "lat"],
  };

  const labels = unitLabels[unit] || ["", "", ""];

  if (value === 1) {
    return `Co ${labels[0]}`;
  } else if (value >= 2 && value <= 4) {
    return `Co ${value} ${labels[1]}`;
  } else {
    return `Co ${value} ${labels[2]}`;
  }
}

export function getTasksLabel(count: number): string {
  if (count === 1) {
    return "zadanie";
  } else if (count >= 2 && count <= 4) {
    return "zadania";
  } else {
    return "zadań";
  }
}
```

---

**Koniec dokumentu**

