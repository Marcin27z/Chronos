# Plan implementacji widoku Edit Task

## 1. Przegląd

Widok edycji zadania (`/tasks/[id]/edit`) umożliwia użytkownikowi modyfikację wszystkich parametrów istniejącego zadania cyklicznego. Formularz jest pre-wypełniony aktualnymi danymi zadania i pozwala na zmianę tytułu, opisu, harmonogramu powtarzalności oraz preferowanego dnia tygodnia. Widok wyświetla także ostrzeżenie o wpływie zmian harmonogramu na przyszłe wystąpienia zadania, informacje o ostatniej akcji oraz sekcję "Danger Zone" umożliwiającą trwałe usunięcie zadania.

## 2. Routing widoku

Widok dostępny pod dynamiczną ścieżką `/tasks/[id]/edit`, gdzie `[id]` to UUID zadania. Strona implementowana w Astro z komponentami React dla interaktywnej logiki formularza i dialogów.

## 3. Struktura komponentów

```
EditTaskPage (Astro page)
│
└─── EditTaskView (React container)
     ├─── BackButtonGuard (reużyty)
     ├─── TaskFormHeader (reużyty)
     ├─── FormSuccessAlert (reużyty, warunkowy)
     ├─── FormErrorsAlert (reużyty, warunkowy)
     ├─── ScheduleImpactNotice (nowy, warunkowy)
     ├─── TaskHistory (nowy)
     ├─── TaskForm (reużyty, mode="edit")
     │    ├─── TaskBaseFields
     │    ├─── ScheduleSection
     │    │    ├─── IntervalPicker
     │    │    └─── DaySelector
     │    ├─── NextDueDatePreview
     │    └─── FormActions
     ├─── DeleteTaskSection (nowy)
     └─── DeleteConfirmationDialog (nowy)
```

## 4. Szczegóły komponentów

### EditTaskPage (Astro page)

- **Opis komponentu**: Strona Astro odpowiedzialna za server-side rendering widoku edycji. Pobiera dane zadania z API, weryfikuje autoryzację użytkownika, waliduje UUID taskId i obsługuje błędy (404, 401). Renderuje główny kontener React `EditTaskView`.

- **Główne elementy**: 
  - Komponent `AppLayout` jako wrapper
  - Weryfikacja sesji Supabase i redirect do `/login` jeśli brak
  - Pobieranie zadania przez GET `/api/tasks/{taskId}`
  - Obsługa błędu 404 z redirectem do `/tasks?error=not_found`
  - Komponent React `EditTaskView` z `client:load`

- **Obsługiwane zdarzenia**: 
  - Ładowanie strony (SSR)
  - Redirect przy braku autoryzacji
  - Redirect przy błędzie 404

- **Warunki walidacji**: 
  - `taskId` musi być poprawnym UUID (walidacja przez zod schema)
  - Użytkownik musi być zalogowany (session !== null)
  - Zadanie musi istnieć i należeć do użytkownika (weryfikacja przez API)

- **Typy**: 
  - `TaskDTO` - dane zadania pobrane z API
  - `Session` - sesja Supabase z access_token

- **Propsy**: Brak (strona Astro)

### EditTaskView (React container)

- **Opis komponentu**: Główny komponent React zarządzający całą logiką widoku edycji. Orkiestruje wszystkie podkomponenty, zarządza stanem formularza przez hook `useEditTaskForm`, obsługuje wywołania API do aktualizacji i usuwania zadania oraz zarządza dialogiem potwierdzenia usunięcia.

- **Główne elementy**:
  - Kontener `div` z stylizacją Tailwind
  - `BackButtonGuard` dla ochrony przed utratą zmian
  - Nagłówek z `TaskFormHeader` i alertami
  - `ScheduleImpactNotice` (warunkowy - tylko przy zmianie harmonogramu)
  - `TaskHistory` pokazujący ostatnią akcję
  - `TaskForm` w trybie edycji z wypełnionymi danymi
  - `DeleteTaskSection` w strefie niebezpiecznej
  - `DeleteConfirmationDialog` zarządzany przez `useTaskDelete`

- **Obsługiwane zdarzenia**:
  - `onUpdate`: Wywołanie PUT `/api/tasks/{taskId}` po walidacji
  - `onCancel`: Anulowanie edycji z guardem niezapisanych zmian
  - `onDeleteClick`: Otwarcie dialogu potwierdzenia
  - `onConfirmDelete`: Wywołanie DELETE `/api/tasks/{taskId}` i redirect
  - `onCancelDelete`: Zamknięcie dialogu usuwania

- **Warunki walidacji**: 
  - Walidacja formularza przez `useEditTaskForm` (identyczna jak w create)
  - Sprawdzenie `isDirty` przed zapisem (opcjonalne)
  - Walidacja tokenów autoryzacji przed wywołaniem API

- **Typy**:
  - `TaskDTO` - oryginalne dane zadania
  - `EditTaskViewModel` (alias `CreateTaskViewModel`)
  - `UpdateTaskCommand` - dane do wysłania do API
  - `ScheduleImpactWarningVM` - model ostrzeżenia o zmianie harmonogramu
  - `TaskHistoryVM` - model historii akcji

- **Propsy**:
```typescript
interface EditTaskViewProps {
  initialTask: TaskDTO;
  token: string;
}
```

### TaskForm (reużyty, rozszerzony)

- **Opis komponentu**: Istniejący komponent formularza zadania, rozszerzony o obsługę trybu edycji. Przyjmuje `mode` prop określający czy jest w trybie create czy edit oraz `initialValues` do pre-wypełnienia pól. W trybie edit używa `useEditTaskForm` zamiast `useCreateTaskForm`.

- **Główne elementy**: 
  - Element `form` z `onSubmit`
  - `TaskFormHeader` z dynamicznym statusem
  - Alerty sukcesu i błędów (warunkowe)
  - `TaskBaseFields` - pola title i description
  - `ScheduleSection` - interval i preferred day
  - `NextDueDatePreview` - podgląd następnej daty
  - `FormActions` - przyciski Zapisz/Anuluj

- **Obsługiwane zdarzenia**:
  - `onSubmit`: Walidacja i wywołanie PUT lub POST w zależności od trybu
  - `onChange`: Aktualizacja stanu pól z inline walidacją
  - `onBlur`: Oznaczenie pola jako touched
  - `onCancel`: Guard niezapisanych zmian i wywołanie callback

- **Warunki walidacji**: 
  - title: wymagany, 1-256 znaków
  - description: opcjonalny, max 5000 znaków
  - interval_value: liczba całkowita, 1-999
  - interval_unit: enum ("days", "weeks", "months", "years")
  - preferred_day_of_week: null lub 0-6

- **Typy**:
  - `CreateTaskViewModel` / `EditTaskViewModel`
  - `ValidationState`
  - `NextDueDatePreviewModel`

- **Propsy**:
```typescript
interface TaskFormProps {
  token: string;
  mode?: 'create' | 'edit';
  initialValues?: CreateTaskViewModel;
  taskId?: string; // wymagane w trybie edit
  onSubmit?: (values: CreateTaskViewModel) => Promise<void> | void;
  onCancel?: () => void;
}
```

### ScheduleImpactNotice (nowy komponent)

- **Opis komponentu**: Komponent ostrzeżenia wyświetlany warunkiowo, gdy użytkownik zmienia parametry harmonogramu (interval_value lub interval_unit). Pokazuje porównanie starego i nowego interwału oraz informuje, że zmiana wpłynie na wszystkie przyszłe wystąpienia zadania.

- **Główne elementy**:
  - `div` z ikoną ostrzeżenia (Alert z Shadcn lub custom)
  - Nagłówek "Zmiana harmonogramu"
  - Tekst porównujący stary i nowy interwał
  - Komunikat o wpływie na przyszłe wystąpienia
  - Podgląd starej i nowej daty next_due_date

- **Obsługiwane zdarzenia**: Brak (komponent display-only)

- **Warunki walidacji**: 
  - Wyświetlany tylko gdy `scheduleImpact.hasChanges === true`
  - Porównanie odbywa się w `useEditTaskForm` hook

- **Typy**:
  - `ScheduleImpactWarningVM`

- **Propsy**:
```typescript
interface ScheduleImpactNoticeProps {
  impact: ScheduleImpactWarningVM;
}

interface ScheduleImpactWarningVM {
  hasChanges: boolean;
  oldInterval: string; // np. "3 miesiące"
  newInterval: string; // np. "6 miesięcy"
  oldNextDueDate: string | null; // ISO format
  newNextDueDate: string | null; // ISO format (preview)
  impactMessage: string;
}
```

### TaskHistory (nowy komponent)

- **Opis komponentu**: Komponent wyświetlający informację o ostatniej akcji wykonanej na zadaniu (completed lub skipped). Pokazuje typ akcji i datę jej wykonania w czytelnym formacie. Jeśli zadanie nie ma jeszcze historii akcji, wyświetla komunikat "Brak historii akcji".

- **Główne elementy**:
  - `section` z nagłówkiem "Historia akcji"
  - Ikona reprezentująca typ akcji (check dla completed, skip dla skipped)
  - Sformatowana data ostatniej akcji
  - Tekst opisujący typ akcji ("Wykonane" / "Pominięte")

- **Obsługiwane zdarzenia**: Brak (komponent display-only)

- **Warunki walidacji**: Brak

- **Typy**:
  - `TaskHistoryVM`

- **Propsy**:
```typescript
interface TaskHistoryProps {
  history: TaskHistoryVM;
}

interface TaskHistoryVM {
  lastActionDate: string | null; // ISO format
  lastActionType: ActionType | null; // "completed" | "skipped"
  displayText: string; // np. "Ostatnio wykonane: 15 stycznia 2025"
}
```

### DeleteTaskSection (nowy komponent)

- **Opis komponentu**: Sekcja "Danger Zone" umieszczona na końcu formularza edycji. Zawiera ostrzeżenie o nieodwracalności operacji usunięcia oraz przycisk "Usuń zadanie" w czerwonej kolorystyce. Kliknięcie przycisku wywołuje callback otwierający dialog potwierdzenia.

- **Główne elementy**:
  - `section` z obramowaniem w kolorze destructive
  - Nagłówek "Strefa niebezpieczna" lub "Usuń zadanie"
  - Tekst ostrzegawczy: "Usunięcie zadania jest nieodwracalne"
  - `Button` variant="destructive" z tekstem "Usuń zadanie"
  - Opcjonalnie: informacja o tytule zadania do usunięcia

- **Obsługiwane zdarzenia**:
  - `onClick` na przycisku: wywołuje `onDeleteClick` callback

- **Warunki walidacji**: Brak (walidacja odbywa się w dialogu)

- **Typy**:
  - `string` dla taskId i taskTitle

- **Propsy**:
```typescript
interface DeleteTaskSectionProps {
  taskId: string;
  taskTitle: string;
  onDeleteClick: () => void;
}
```

### DeleteConfirmationDialog (nowy komponent)

- **Opis komponentu**: Dialog potwierdzenia usunięcia zadania oparty na Shadcn `Dialog`. Wyświetla tytuł zadania do usunięcia, ostrzeżenie o nieodwracalności operacji oraz przyciski Anuluj i Potwierdź. Podczas usuwania (isDeleting) przycisk Potwierdź pokazuje loader i jest zablokowany.

- **Główne elementy**:
  - `Dialog` z Shadcn/ui
  - `DialogHeader` z tytułem "Potwierdź usunięcie"
  - `DialogDescription` z ostrzeżeniem i nazwą zadania
  - `DialogFooter` z dwoma przyciskami:
    - `Button` variant="outline": Anuluj
    - `Button` variant="destructive": Usuń (z loaderem podczas isDeleting)

- **Obsługiwane zdarzenia**:
  - `onConfirm`: Wywołuje DELETE API i zamyka dialog po sukcesie
  - `onCancel`: Zamyka dialog bez akcji
  - `onOpenChange`: Obsługa zamknięcia przez ESC lub kliknięcie poza dialog

- **Warunki walidacji**: Brak

- **Typy**:
  - `boolean` dla isOpen i isDeleting
  - `string` dla taskTitle

- **Propsy**:
```typescript
interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  taskTitle: string;
  isDeleting: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}
```

## 5. Typy

### Typy istniejące (reużyte)

```typescript
// Z src/types.ts
type TaskDTO = Task;

type UpdateTaskCommand = Partial<
  Pick<TablesUpdate<"tasks">, "title" | "description" | "interval_value" | "interval_unit" | "preferred_day_of_week">
>;

interface CreateTaskViewModel {
  title: string;
  description?: string;
  interval_value: number;
  interval_unit: IntervalUnit;
  preferred_day_of_week: number | null;
}

type IntervalUnit = "days" | "weeks" | "months" | "years";
type ActionType = "completed" | "skipped";

interface ValidationState {
  title?: string;
  description?: string;
  interval_value?: string;
  interval_unit?: string;
  preferred_day_of_week?: string;
  general?: string;
}

interface ValidationErrorDetail {
  field: string;
  message: string;
}

interface ValidationErrorDTO {
  error: string;
  details: ValidationErrorDetail[];
}

interface ErrorDTO {
  error: string;
  details?: string;
}
```

### Typy nowe (do dodania w src/types.ts)

```typescript
/**
 * Alias dla EditTaskViewModel - identyczny z CreateTaskViewModel
 */
export type EditTaskViewModel = CreateTaskViewModel;

/**
 * Model ostrzeżenia o wpływie zmiany harmonogramu
 */
export interface ScheduleImpactWarningVM {
  /**
   * Czy nastąpiła zmiana w parametrach harmonogramu
   */
  hasChanges: boolean;

  /**
   * Tekstowa reprezentacja starego interwału (np. "3 miesiące")
   */
  oldInterval: string;

  /**
   * Tekstowa reprezentacja nowego interwału (np. "6 miesięcy")
   */
  newInterval: string;

  /**
   * Stara data next_due_date w formacie ISO
   */
  oldNextDueDate: string | null;

  /**
   * Nowa obliczona data next_due_date w formacie ISO (preview)
   */
  newNextDueDate: string | null;

  /**
   * Komunikat o wpływie zmian
   */
  impactMessage: string;
}

/**
 * Model historii akcji zadania
 */
export interface TaskHistoryVM {
  /**
   * Data ostatniej akcji w formacie ISO
   */
  lastActionDate: string | null;

  /**
   * Typ ostatniej akcji ("completed" | "skipped")
   */
  lastActionType: ActionType | null;

  /**
   * Sformatowany tekst do wyświetlenia (np. "Ostatnio wykonane: 15 stycznia 2025")
   */
  displayText: string;
}
```

## 6. Zarządzanie stanem

### Hook `useEditTaskForm`

Główny hook zarządzający stanem formularza edycji. Jest rozszerzeniem logiki `useCreateTaskForm` o dodatkowe funkcjonalności specyficzne dla edycji: przechowywanie oryginalnych wartości, obliczanie różnicy (diff) dla API, generowanie ostrzeżenia o wpływie zmian harmonogramu oraz formatowanie historii akcji.

**Parametry inicjalizacji**:
```typescript
interface UseEditTaskFormOptions {
  initialTask: TaskDTO;
}
```

**Stan wewnętrzny**:
- `originalTask: TaskDTO` - oryginalne dane zadania z API (niezmienne)
- `values: EditTaskViewModel` - aktualne wartości formularza
- `errors: ValidationState` - błędy walidacji dla każdego pola
- `meta: Record<keyof EditTaskViewModel, {touched: boolean}>` - status pól
- `isSubmitting: boolean` - flaga trwającego zapisu
- `generalError: string | undefined` - błąd ogólny (nie związany z konkretnym polem)

**Obliczane wartości (useMemo)**:
- `isDirty: boolean` - porównanie `values` z wartościami z `originalTask`
- `scheduleImpact: ScheduleImpactWarningVM` - analiza zmian w harmonogramie
- `taskHistory: TaskHistoryVM` - sformatowana historia akcji z `originalTask`
- `nextDueDatePreview: NextDueDatePreviewModel` - podgląd nowej daty

**Funkcje walidacji**:
- `validateField<K>(field: K, value)` - walidacja pojedynczego pola (reużyta z create)
- `validateForm(values)` - walidacja wszystkich pól, zwraca ValidationState
- `runValidation()` - wywołuje validateForm i aktualizuje state errors

**Funkcje pomocnicze**:
- `computeIntervalText(value, unit)` - formatuje interwał do tekstu (np. "3 miesiące")
- `computeScheduleImpact()` - porównuje stary i nowy harmonogram
- `formatTaskHistory()` - formatuje lastActionDate i lastActionType do displayText
- `computeDiff()` - oblicza różnicę między originalTask a values, zwraca tylko zmienione pola

**Handlery zmian**:
- `handleTitleChange(title: string)`
- `handleDescriptionChange(description: string)`
- `handleIntervalValueChange(value: number)`
- `handleIntervalUnitChange(unit: IntervalUnit)`
- `handlePreferredDayChange(day: number | null)`
- `handleBlur(field: keyof EditTaskViewModel)`

**Funkcje akcji**:
- `submitForm({ onSubmit, onError })` - waliduje i wywołuje callback ze zbudowanym UpdateTaskCommand (diff)
- `resetForm()` - resetuje values do originalTask
- `applyFieldErrors(fieldErrors: Partial<ValidationState>)` - aplikuje błędy z API do stanu
- `setGeneralErrorMessage(message?: string)` - ustawia błąd ogólny

**Zwracany interfejs**:
```typescript
{
  values: EditTaskViewModel;
  errors: ValidationState;
  meta: Record<keyof EditTaskViewModel, {touched: boolean}>;
  generalError: string | undefined;
  isDirty: boolean;
  isSubmitting: boolean;
  scheduleImpact: ScheduleImpactWarningVM;
  taskHistory: TaskHistoryVM;
  nextDueDatePreview: NextDueDatePreviewModel;
  handleTitleChange: (title: string) => void;
  handleDescriptionChange: (description: string) => void;
  handleIntervalValueChange: (value: number) => void;
  handleIntervalUnitChange: (unit: IntervalUnit) => void;
  handlePreferredDayChange: (day: number | null) => void;
  handleBlur: (field: keyof EditTaskViewModel) => void;
  submitForm: (options: SubmitOptions) => Promise<{success: boolean}>;
  resetForm: () => void;
  applyFieldErrors: (fieldErrors: Partial<ValidationState>) => void;
  setGeneralErrorMessage: (message?: string) => void;
}
```

### Hook `useTaskDelete`

Hook zarządzający logiką usuwania zadania - stanem dialogu potwierdzenia, wywołaniem DELETE API oraz obsługą błędów.

**Parametry inicjalizacji**:
```typescript
interface UseTaskDeleteOptions {
  taskId: string;
  token: string;
  onSuccess?: () => void; // callback po pomyślnym usunięciu
}
```

**Stan wewnętrzny**:
- `isDialogOpen: boolean` - czy dialog potwierdzenia jest otwarty
- `isDeleting: boolean` - flaga trwającego usuwania
- `deleteError: string | undefined` - błąd podczas usuwania

**Funkcje**:
- `openDeleteDialog()` - otwiera dialog potwierdzenia
- `closeDeleteDialog()` - zamyka dialog i resetuje błędy
- `confirmDelete()` - wywołuje DELETE API, obsługuje błędy, wywołuje onSuccess

**Zwracany interfejs**:
```typescript
{
  isDialogOpen: boolean;
  isDeleting: boolean;
  deleteError: string | undefined;
  openDeleteDialog: () => void;
  closeDeleteDialog: () => void;
  confirmDelete: () => Promise<void>;
}
```

## 7. Integracja API

### GET `/api/tasks/{taskId}` - Pobieranie danych zadania

**Kiedy**: Przy ładowaniu strony `/tasks/[id]/edit` (SSR w Astro)

**Lokalizacja**: W pliku `src/pages/tasks/[id]/edit.astro`

**Request**:
```typescript
Headers: {
  Authorization: Bearer {access_token}
}
```

**Response (sukces 200)**:
```typescript
TaskDTO {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  interval_value: number;
  interval_unit: IntervalUnit;
  preferred_day_of_week: number | null;
  next_due_date: string; // ISO date
  last_action_date: string | null; // ISO datetime
  last_action_type: ActionType | null;
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}
```

**Obsługa błędów**:
- **401 Unauthorized**: Redirect do `/login?redirect=/tasks/${taskId}/edit`
- **404 Not Found**: Redirect do `/tasks?error=not_found&message=Zadanie+nie+istnieje`
- **500 Server Error**: Wyświetlenie error page lub redirect z błędem

**Implementacja w Astro**:
```typescript
// W src/pages/tasks/[id]/edit.astro
const taskId = Astro.params.id;
const response = await fetch(`/api/tasks/${taskId}`, {
  headers: {
    Authorization: `Bearer ${session.access_token}`
  }
});

if (response.status === 404) {
  return Astro.redirect('/tasks?error=not_found');
}

const task: TaskDTO = await response.json();
```

### PUT `/api/tasks/{taskId}` - Aktualizacja zadania

**Kiedy**: Po kliknięciu "Zapisz" w formularzu edycji i przejściu walidacji

**Lokalizacja**: Wywołanie w `EditTaskView` komponentie przez `submitForm` z hooka

**Request**:
```typescript
Method: PUT
URL: /api/tasks/{taskId}
Headers: {
  Authorization: Bearer {access_token},
  Content-Type: application/json
}
Body: UpdateTaskCommand (tylko zmienione pola)
```

**Przykładowy Request Body**:
```json
{
  "title": "Zmieniony tytuł zadania",
  "interval_value": 6,
  "interval_unit": "months"
}
```

**Response (sukces 200)**:
```typescript
TaskDTO // zaktualizowane dane zadania
```

**Obsługa błędów**:
- **400 Bad Request** (ValidationErrorDTO): 
  - Parsowanie `details: ValidationErrorDetail[]`
  - Mapowanie na pola formularza przez `applyFieldErrors`
  - Wyświetlenie błędów inline przy polach
  
- **401 Unauthorized**: 
  - Redirect do `/login?redirect=/tasks/${taskId}/edit`
  
- **404 Not Found**: 
  - Toast lub alert: "To zadanie już nie istnieje"
  - Redirect do `/tasks`
  
- **500 Server Error**: 
  - Toast: "Coś poszło nie tak. Spróbuj ponownie."
  - Pozostanie na stronie edycji

**Implementacja**:
```typescript
async function updateTask(taskId: string, token: string, command: UpdateTaskCommand): Promise<TaskDTO> {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });

  if (!response.ok) {
    const payload = await response.json() as ErrorDTO | ValidationErrorDTO;
    throw {
      status: response.status,
      payload
    };
  }

  return response.json();
}
```

### DELETE `/api/tasks/{taskId}` - Usuwanie zadania

**Kiedy**: Po potwierdzeniu w dialogu `DeleteConfirmationDialog`

**Lokalizacja**: Wywołanie w `confirmDelete` funkcji z hooka `useTaskDelete`

**Request**:
```typescript
Method: DELETE
URL: /api/tasks/{taskId}
Headers: {
  Authorization: Bearer {access_token}
}
```

**Response (sukces 204)**:
```
No Content (pusta odpowiedź)
```

**Obsługa błędów**:
- **401 Unauthorized**: 
  - Redirect do `/login`
  
- **404 Not Found**: 
  - Toast: "Zadanie już zostało usunięte"
  - Redirect do `/tasks`
  
- **500 Server Error**: 
  - Toast: "Nie udało się usunąć zadania. Spróbuj ponownie."
  - Dialog pozostaje otwarty, użytkownik może spróbować ponownie

**Po sukcesie**:
- Toast sukcesu: "Zadanie zostało usunięte"
- Redirect do `/tasks`

**Implementacja**:
```typescript
async function deleteTask(taskId: string, token: string): Promise<void> {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json() as ErrorDTO;
    throw error;
  }
}
```

## 8. Interakcje użytkownika

### 1. Nawigacja do widoku edycji

**Akcja użytkownika**: Kliknięcie przycisku/linku "Edytuj" przy zadaniu (w TaskCard, TaskListItem lub na pulpicie)

**Oczekiwany wynik**:
- Nawigacja do `/tasks/{taskId}/edit`
- Załadowanie strony z formularzem wypełnionym aktualnymi danymi zadania
- Wyświetlenie sekcji: formularz, historia akcji, sekcja usuwania

**Obsługa błędów**:
- Jeśli zadanie nie istnieje (404): redirect do `/tasks` z komunikatem błędu
- Jeśli brak autoryzacji (401): redirect do `/login`

### 2. Modyfikacja tytułu zadania

**Akcja użytkownika**: Wpisywanie tekstu w polu "Tytuł zadania"

**Oczekiwany wynik**:
- Aktualizacja stanu `values.title` w czasie rzeczywistym
- Walidacja inline po `onBlur`:
  - Jeśli puste: błąd "Tytuł jest wymagany"
  - Jeśli > 256 znaków: błąd "Tytuł nie może przekraczać 256 znaków"
- Ustawienie `isDirty = true`
- Aktywacja guardu niezapisanych zmian

### 3. Modyfikacja opisu zadania

**Akcja użytkownika**: Wpisywanie tekstu w polu "Opis (opcjonalny)"

**Oczekiwany wynik**:
- Aktualizacja stanu `values.description`
- Walidacja po `onBlur`:
  - Jeśli > 5000 znaków: błąd "Opis nie może przekraczać 5000 znaków"
- Ustawienie `isDirty = true`

### 4. Zmiana interwału powtarzalności

**Akcja użytkownika**: Zmiana wartości lub jednostki interwału (np. z "3 miesiące" na "6 miesięcy")

**Oczekiwany wynik**:
- Aktualizacja `values.interval_value` lub `values.interval_unit`
- Przeliczenie `nextDueDatePreview` - aktualizacja podglądu daty
- Wyświetlenie komponentu `ScheduleImpactNotice` z:
  - Porównaniem starego i nowego interwału
  - Starą i nową datą next_due_date
  - Ostrzeżeniem: "Zmiana harmonogramu wpłynie na wszystkie przyszłe wystąpienia zadania"
- Walidacja:
  - interval_value: 1-999, liczba całkowita
  - interval_unit: musi być z enum
- Ustawienie `isDirty = true`

### 5. Zmiana preferowanego dnia tygodnia

**Akcja użytkownika**: Kliknięcie dnia w komponencie `DaySelector`

**Oczekiwany wynik**:
- Toggle: kliknięcie wybranego dnia → ustawienie na null
- Kliknięcie innego dnia → ustawienie na 0-6
- Aktualizacja `values.preferred_day_of_week`
- Aktualizacja `nextDueDatePreview` jeśli ma wpływ
- Ustawienie `isDirty = true`

### 6. Zapisywanie zmian

**Akcja użytkownika**: Kliknięcie przycisku "Zapisz"

**Oczekiwany wynik**:
1. Uruchomienie walidacji formularza
2. Jeśli błędy walidacji:
   - Wyświetlenie błędów inline przy polach
   - FormErrorsAlert z komunikatem "Uzupełnij wymagane pola"
   - Brak wywołania API
3. Jeśli walidacja OK:
   - Ustawienie `isSubmitting = true` (przycisk z loaderem, disabled)
   - Obliczenie diff (tylko zmienione pola) jako `UpdateTaskCommand`
   - Wywołanie PUT `/api/tasks/{taskId}`
   - Po sukcesie:
     - FormSuccessAlert: "Zadanie zostało zaktualizowane"
     - Po 1.2s: redirect do `/tasks`
   - Po błędzie:
     - 400: mapowanie błędów walidacji na pola
     - 404: toast "Zadanie nie istnieje" + redirect
     - 401: redirect do `/login`
     - 500: FormErrorsAlert "Coś poszło nie tak"
   - Ustawienie `isSubmitting = false`

### 7. Anulowanie edycji

**Akcja użytkownika**: Kliknięcie przycisku "Anuluj"

**Oczekiwany wynik**:
- Jeśli `isDirty = true`:
  - Wyświetlenie natywnego `confirm`: "Masz niezapisane zmiany. Na pewno chcesz anulować?"
  - Jeśli użytkownik potwierdzi:
    - Reset formularza (`values` → `originalTask`)
    - Redirect do `/tasks` lub wywołanie `onCancel` callback
  - Jeśli użytkownik anuluje:
    - Pozostanie w formularzu
- Jeśli `isDirty = false`:
  - Bezpośredni redirect do `/tasks`

### 8. Próba nawigacji z niezapisanymi zmianami

**Akcja użytkownika**: Kliknięcie linku, back button lub zamknięcie karty z `isDirty = true`

**Oczekiwany wynik**:
- `BackButtonGuard` przechwytuje akcję
- Wyświetlenie `Dialog` z:
  - Tytuł: "Nie zapisano zmian"
  - Opis: "Masz niezapisane zmiany. Czy na pewno chcesz kontynuować i utracić postępy?"
  - Przyciski: "Pozostań" / "Kontynuuj"
- Jeśli "Kontynuuj":
  - Nawigacja do wybranej lokalizacji
- Jeśli "Pozostań":
  - Zamknięcie dialogu, pozostanie w formularzu

### 9. Kliknięcie "Usuń zadanie"

**Akcja użytkownika**: Kliknięcie przycisku "Usuń zadanie" w sekcji `DeleteTaskSection`

**Oczekiwany wynik**:
- Otwarcie `DeleteConfirmationDialog` (`isDialogOpen = true`)
- Wyświetlenie w dialogu:
  - Tytuł: "Potwierdź usunięcie"
  - Opis: "Czy na pewno chcesz usunąć zadanie '{taskTitle}'? Ta operacja jest nieodwracalna."
  - Przyciski: "Anuluj" / "Usuń"

### 10. Potwierdzenie usunięcia zadania

**Akcja użytkownika**: Kliknięcie "Usuń" w `DeleteConfirmationDialog`

**Oczekiwany wynik**:
1. Ustawienie `isDeleting = true`
2. Przycisk "Usuń" z loaderem, disabled
3. Wywołanie DELETE `/api/tasks/{taskId}`
4. Po sukcesie (204):
   - Zamknięcie dialogu
   - Toast sukcesu: "Zadanie zostało usunięte"
   - Redirect do `/tasks`
5. Po błędzie:
   - 404: toast "Zadanie już zostało usunięte" + redirect do `/tasks`
   - 401: redirect do `/login`
   - 500: wyświetlenie błędu w dialogu, możliwość ponowienia
6. Ustawienie `isDeleting = false`

### 11. Anulowanie usunięcia zadania

**Akcja użytkownika**: Kliknięcie "Anuluj" w dialogu lub ESC lub kliknięcie poza dialog

**Oczekiwany wynik**:
- Zamknięcie dialogu (`isDialogOpen = false`)
- Powrót do formularza edycji bez żadnych zmian
- Reset `deleteError` jeśli był ustawiony

## 9. Warunki i walidacja

### Walidacja po stronie klienta (frontend)

Wszystkie warunki walidacji są sprawdzane w hooku `useEditTaskForm` przez funkcję `validateField` przed wysłaniem do API.

#### 1. Tytuł zadania (`title`)

**Komponenty**: `TaskBaseFields`

**Warunki**:
- Wymagane pole (nie może być puste po trim)
- Maksymalnie 256 znaków

**Walidacja**:
```typescript
const normalized = title.trim();
if (!normalized) return "Tytuł jest wymagany";
if (normalized.length > 256) return "Tytuł nie może przekraczać 256 znaków";
```

**Wpływ na UI**:
- Błąd wyświetlany inline pod polem po `onBlur` i `touched = true`
- Czerwone obramowanie pola (`aria-invalid={true}`)
- `aria-describedby` wskazuje na komunikat błędu
- Przycisk "Zapisz" disabled gdy jest błąd w którymkolwiek polu

#### 2. Opis zadania (`description`)

**Komponenty**: `TaskBaseFields`

**Warunki**:
- Opcjonalne pole
- Jeśli wypełnione: maksymalnie 5000 znaków

**Walidacja**:
```typescript
if (!description) return undefined;
if (description.length > 5000) return "Opis nie może przekraczać 5000 znaków";
```

**Wpływ na UI**:
- Błąd wyświetlany inline pod polem
- Czerwone obramowanie gdy błąd

#### 3. Wartość interwału (`interval_value`)

**Komponenty**: `IntervalPicker`

**Warunki**:
- Wymagane pole
- Musi być liczbą całkowitą
- Wartość od 1 do 999

**Walidacja**:
```typescript
const numeric = Number(interval_value);
if (Number.isNaN(numeric)) return "Wpisz prawidłową liczbę";
if (!Number.isInteger(numeric)) return "Interwał musi być liczbą całkowitą";
if (numeric < 1) return "Interwał musi być co najmniej 1";
if (numeric > 999) return "Interwał nie może być większy niż 999";
```

**Wpływ na UI**:
- `input[type="number"]` z `min={1}` i `max={999}`
- Błąd inline pod kontrolką
- Blokada przycisku "Zapisz"

#### 4. Jednostka interwału (`interval_unit`)

**Komponenty**: `IntervalPicker`

**Warunki**:
- Wymagane pole
- Wartość musi być jedną z: "days", "weeks", "months", "years"

**Walidacja**:
```typescript
const units: IntervalUnit[] = ["days", "weeks", "months", "years"];
if (!units.includes(interval_unit)) return "Wybierz jednostkę interwału";
```

**Wpływ na UI**:
- Select lub SegmentedControl z predefiniowanymi opcjami
- Technicznie nie może być błędu przy użyciu UI (tylko przy manipulacji programatycznej)

#### 5. Preferowany dzień tygodnia (`preferred_day_of_week`)

**Komponenty**: `DaySelector`

**Warunki**:
- Opcjonalne pole
- Jeśli ustawione: wartość od 0 do 6 (0 = niedziela, 6 = sobota)
- Wartość `null` oznacza brak preferencji

**Walidacja**:
```typescript
if (preferred_day_of_week === null || preferred_day_of_week === undefined) {
  return undefined;
}
const numeric = Number(preferred_day_of_week);
if (!Number.isInteger(numeric) || numeric < 0 || numeric > 6) {
  return "Wybierz dzień tygodnia";
}
```

**Wpływ na UI**:
- 7 przycisków z visual feedback (aria-pressed)
- Toggle behavior (kliknięcie ponownie resetuje do null)
- Technicznie nie może być błędu przy użyciu UI

#### 6. Walidacja całego formularza

**Warunki dodatkowe**:
- Co najmniej jedno pole musi być zmienione (opcjonalnie - można wysłać bez zmian)
- Wszystkie pola muszą być poprawne jednocześnie

**Walidacja przed submitem**:
```typescript
const validation = validateForm(values);
const hasErrors = Object.values(validation).some(Boolean);
if (hasErrors) {
  setGeneralError("Wypełnij wszystkie wymagane pola");
  return { success: false };
}
```

**Wpływ na UI**:
- `FormErrorsAlert` z komunikatem ogólnym
- Wszystkie błędy inline widoczne
- Przycisk "Zapisz" disabled

### Walidacja po stronie serwera (backend)

Backend endpoint `PUT /api/tasks/{taskId}` wykonuje dodatkową walidację:

#### 1. Autoryzacja

**Warunek**: Poprawny Bearer token w nagłówku Authorization

**Obsługa błędu 401**:
- Frontend: redirect do `/login?redirect=/tasks/${taskId}/edit`

#### 2. Istnienie i własność zadania

**Warunek**: Zadanie o podanym UUID istnieje i należy do zalogowanego użytkownika

**Obsługa błędu 404**:
- Toast: "To zadanie nie istnieje lub zostało usunięte"
- Redirect do `/tasks`

#### 3. Walidacja UUID taskId

**Warunek**: Parametr `taskId` musi być poprawnym UUID

**Obsługa błędu 400**:
- Wyświetlenie błędu "Invalid task ID format"
- W praktyce: użytkownik nie powinien trafić na tę ścieżkę przez UI

#### 4. Walidacja pól przez zod schema

Backend używa `updateTaskBodySchema` (zod) do walidacji:

**Warunki**:
- Identyczne jak na frontendzie (title, description, interval_value, interval_unit, preferred_day_of_week)
- Co najmniej jedno pole musi być przekazane (w praktyce: backend akceptuje puste body, ale nie ma sensu)

**Obsługa błędu 400 z ValidationErrorDTO**:
```typescript
{
  error: "Invalid request payload",
  details: [
    { field: "title", message: "Tytuł nie może być pusty" },
    { field: "interval_value", message: "Wartość musi być między 1 a 999" }
  ]
}
```

- Mapowanie `details` na konkretne pola formularza
- Wyświetlenie błędów inline przy odpowiednich kontrolkach
- FormErrorsAlert z komunikatem `error`

## 10. Obsługa błędów

### 1. Błędy walidacji klienta (przed wysłaniem do API)

**Scenariusz**: Użytkownik wprowadza niepoprawne dane i klika "Zapisz"

**Obsługa**:
- Walidacja przez `validateForm` w hooku
- Ustawienie błędów w stanie `errors`
- Wyświetlenie błędów inline przy każdym niepoprawnym polu
- `FormErrorsAlert` z komunikatem "Wypełnij wszystkie wymagane pola"
- Przycisk "Zapisz" disabled (lub enabled, ale submit nie przechodzi)
- Brak wywołania API

**Komponenty**: `TaskForm`, `TaskBaseFields`, `IntervalPicker`, `FormErrorsAlert`

### 2. Błędy walidacji serwera (400 Bad Request)

**Scenariusz**: Backend odrzuca dane z powodu walidacji (np. zmiana title na pusty string ominęła frontend)

**Response**:
```json
{
  "error": "Invalid request payload",
  "details": [
    { "field": "title", "message": "Tytuł nie może być pusty" }
  ]
}
```

**Obsługa**:
- Catch w funkcji `updateTask`
- Parsowanie `ValidationErrorDTO`
- Wywołanie `applyFieldErrors(fieldErrors)` w hooku
- Mapowanie błędów na konkretne pola → wyświetlenie inline
- `FormErrorsAlert` z komunikatem `error`
- `isSubmitting = false`

**Komponenty**: `EditTaskView`, `FormErrorsAlert`, pola formularza

### 3. Błąd 401 Unauthorized

**Scenariusz**: Token wygasł lub jest niepoprawny

**Obsługa**:
- Catch w funkcji API
- Sprawdzenie `error.status === 401`
- Redirect do `/login?redirect=/tasks/${taskId}/edit`
- Zapisanie URL przekierowania w localStorage (opcjonalnie)

**Miejsca występowania**:
- GET przy ładowaniu strony → redirect w Astro SSR
- PUT przy zapisie → redirect w React
- DELETE przy usuwaniu → redirect w React

### 4. Błąd 404 Not Found

**Scenariusz A**: Zadanie nie istnieje przy ładowaniu strony edycji

**Obsługa w Astro SSR**:
```typescript
if (response.status === 404) {
  return Astro.redirect('/tasks?error=not_found&message=Zadanie+nie+istnieje');
}
```

**Scenariusz B**: Zadanie zostało usunięte przez inną sesję, próba zapisu

**Obsługa w React**:
- Toast: "To zadanie już nie istnieje"
- Opóźniony redirect do `/tasks` (po 2s)

**Scenariusz C**: Zadanie nie istnieje podczas usuwania

**Obsługa**:
- Toast: "Zadanie już zostało usunięte"
- Redirect do `/tasks`

**Komponenty**: `EditTaskPage.astro`, `EditTaskView`

### 5. Błąd 500 Server Error

**Scenariusz**: Nieoczekiwany błąd po stronie serwera

**Response**:
```json
{
  "error": "Internal server error",
  "details": "..." // tylko w DEV
}
```

**Obsługa**:
- Catch w funkcji API
- `FormErrorsAlert` z komunikatem: "Coś poszło nie tak. Spróbuj ponownie później."
- Możliwość ponowienia akcji (użytkownik pozostaje w formularzu)
- `isSubmitting = false` lub `isDeleting = false`
- Opcjonalnie: logowanie błędu do sentry/analytics

**Komponenty**: `EditTaskView`, `FormErrorsAlert`, `DeleteConfirmationDialog`

### 6. Błąd sieci (Network Error)

**Scenariusz**: Brak połączenia z internetem lub timeout

**Obsługa**:
- Catch w `fetch` (throw error)
- Wykrycie przez `error instanceof TypeError` lub brak `response.status`
- `FormErrorsAlert`: "Błąd połączenia. Sprawdź internet i spróbuj ponownie."
- Pozostanie w formularzu z możliwością ponowienia

**Komponenty**: `EditTaskView`, `FormErrorsAlert`

### 7. Próba nawigacji z niezapisanymi zmianami

**Scenariusz**: Użytkownik klika link, back button lub zamyka kartę z `isDirty = true`

**Obsługa**:
- `BackButtonGuard` przechwytuje zdarzenie (link, popstate)
- Wyświetlenie `Dialog` z potwierdzeniem
- Opcje: "Pozostań" (cancel) lub "Kontynuuj" (proceed)
- `useUnsavedChangesGuard` obsługuje `beforeunload` (zamknięcie karty)
- Natywny dialog przeglądarki: "Changes you made may not be saved"

**Komponenty**: `BackButtonGuard`, `useUnsavedChangesGuard`

### 8. Duplikacja przesłania formularza

**Scenariusz**: Użytkownik wielokrotnie klika "Zapisz" podczas submitu

**Obsługa**:
- Flaga `isSubmitting` blokuje wielokrotne wywołania
- Przycisk "Zapisz" ma `disabled={isSubmitting || hasErrors}`
- Wyświetlenie loadera na przycisku podczas `isSubmitting`

**Komponenty**: `FormActions`, `useEditTaskForm`

### 9. Brak zmian przy próbie zapisu

**Scenariusz**: Użytkownik klika "Zapisz" bez wprowadzania zmian (`isDirty = false`)

**Obsługa (opcjonalne)**:
- **Opcja A**: Wyświetlenie info toastu "Nie wprowadzono żadnych zmian" bez wywołania API
- **Opcja B**: Pozwolenie na zapis (backend zwróci identyczne dane, bezpieczne)
- **Preferowane**: Opcja B dla uproszczenia

### 10. Błąd podczas usuwania zadania

**Scenariusz**: DELETE API zwraca błąd 500

**Obsługa**:
- Wyświetlenie komunikatu błędu w `DeleteConfirmationDialog`
- Przycisk "Usuń" z tekstem "Spróbuj ponownie"
- Dialog pozostaje otwarty
- Możliwość anulowania lub ponowienia
- `isDeleting = false`

**Komponenty**: `DeleteConfirmationDialog`, `useTaskDelete`

## 11. Kroki implementacji

### Krok 1: Rozszerzenie typów w `src/types.ts`

Dodać nowe interfejsy dla modeli widoku:

```typescript
export type EditTaskViewModel = CreateTaskViewModel;

export interface ScheduleImpactWarningVM {
  hasChanges: boolean;
  oldInterval: string;
  newInterval: string;
  oldNextDueDate: string | null;
  newNextDueDate: string | null;
  impactMessage: string;
}

export interface TaskHistoryVM {
  lastActionDate: string | null;
  lastActionType: ActionType | null;
  displayText: string;
}
```

### Krok 2: Implementacja funkcji pomocniczych

Utworzyć plik `src/lib/utils/task-edit.utils.ts` z funkcjami:

- `computeIntervalText(value: number, unit: IntervalUnit): string` - formatowanie interwału
- `formatTaskHistory(task: TaskDTO): TaskHistoryVM` - formatowanie historii
- `computeDiff(original: TaskDTO, current: EditTaskViewModel): UpdateTaskCommand` - obliczanie zmian

### Krok 3: Implementacja hooka `useEditTaskForm`

Utworzyć plik `src/lib/hooks/useEditTaskForm.ts`:

- Stan: originalTask, values, errors, meta, isSubmitting, generalError
- Computed: isDirty, scheduleImpact, taskHistory, nextDueDatePreview
- Funkcje: handlery zmian, validateField, validateForm, submitForm, resetForm
- Reużycie logiki walidacji z `useCreateTaskForm` gdzie możliwe

### Krok 4: Implementacja hooka `useTaskDelete`

Utworzyć plik `src/lib/hooks/useTaskDelete.ts`:

- Stan: isDialogOpen, isDeleting, deleteError
- Funkcje: openDeleteDialog, closeDeleteDialog, confirmDelete
- Wywołanie `deleteTask` z `tasks.api.ts` (funkcja już istnieje)

### Krok 5: Rozszerzenie API client w `src/lib/api/tasks.api.ts`

Dodać funkcję `updateTask`:

```typescript
export async function updateTask(
  taskId: string, 
  token: string, 
  command: UpdateTaskCommand
): Promise<TaskDTO> {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });

  if (!response.ok) {
    const payload = await response.json() as ErrorDTO | ValidationErrorDTO;
    throw {
      status: response.status,
      payload
    } satisfies TaskApiError;
  }

  return response.json();
}
```

Funkcja `getTask` już istnieje, funkcja `deleteTask` już istnieje - zweryfikować czy przyjmuje token jako parametr.

### Krok 6: Utworzenie komponentu `ScheduleImpactNotice`

Utworzyć plik `src/components/tasks/ScheduleImpactNotice.tsx`:

- Props: `ScheduleImpactWarningVM`
- Renderowanie warunkowe: tylko gdy `hasChanges === true`
- Stylizacja: alert/notice box z ikoną ostrzeżenia (AlertCircle z lucide-react)
- Wyświetlenie: porównanie starych i nowych wartości
- Accessibility: `role="status"` dla screen readers

### Krok 7: Utworzenie komponentu `TaskHistory`

Utworzyć plik `src/components/tasks/TaskHistory.tsx`:

- Props: `TaskHistoryVM`
- Wyświetlenie: ikona akcji (Check lub Skip) + sformatowana data + typ akcji
- Jeśli brak historii: komunikat "Brak historii akcji"
- Stylizacja: sekcja z subtelnym tłem, małą czcionką

### Krok 8: Utworzenie komponentu `DeleteTaskSection`

Utworzyć plik `src/components/tasks/DeleteTaskSection.tsx`:

- Props: taskId, taskTitle, onDeleteClick
- Stylizacja: sekcja "Danger Zone" z czerwonym obramowaniem
- Nagłówek: "Usuń zadanie"
- Ostrzeżenie: "Ta operacja jest nieodwracalna"
- Przycisk: variant="destructive", onClick → onDeleteClick

### Krok 9: Utworzenie komponentu `DeleteConfirmationDialog`

Utworzyć plik `src/components/tasks/DeleteConfirmationDialog.tsx`:

- Props: isOpen, taskTitle, isDeleting, onConfirm, onCancel
- Wykorzystanie Shadcn `Dialog`, `DialogHeader`, `DialogFooter`
- Tytuł: "Potwierdź usunięcie"
- Opis: "Czy na pewno chcesz usunąć zadanie '{taskTitle}'? Ta operacja jest nieodwracalna."
- Przyciski:
  - "Anuluj" (outline)
  - "Usuń" (destructive, z loaderem gdy isDeleting)

### Krok 10: Rozszerzenie komponentu `TaskForm`

Zmodyfikować `src/components/tasks/TaskForm.tsx`:

**Opcja A (preferowana)**: Minimalne zmiany
- Dodać props: `mode?: 'create' | 'edit'`, `initialValues?: CreateTaskViewModel`, `taskId?: string`
- W trybie edit: przekazać initialValues do hooka
- W trybie edit: wywołać `updateTask` zamiast `createTask` w handleSubmit

**Opcja B**: Utworzenie osobnego `EditTaskForm`
- Duplikacja logiki z `TaskForm.tsx`
- Dostosowanie do edycji
- Minusem jest duplikacja kodu

### Krok 11: Utworzenie komponentu `EditTaskView`

Utworzyć plik `src/components/tasks/EditTaskView.tsx`:

- Props: initialTask (TaskDTO), token (string)
- Użycie hooków: `useEditTaskForm`, `useTaskDelete`
- Kompozycja wszystkich subkomponentów w odpowiedniej kolejności
- Obsługa submitForm z wywołaniem updateTask
- Obsługa confirmDelete z wywołaniem deleteTask
- Success handlers: toast + redirect

### Krok 12: Utworzenie strony Astro

Utworzyć plik `src/pages/tasks/[id]/edit.astro`:

- Weryfikacja sesji → redirect do /login jeśli brak
- Pobranie taskId z `Astro.params.id`
- Walidacja UUID taskId (zod)
- Wywołanie GET `/api/tasks/${taskId}` z tokenem
- Obsługa błędu 404 → redirect do `/tasks?error=not_found`
- Przekazanie task i token do `EditTaskView` z `client:load`
- Użycie `AppLayout` jako wrapper

### Krok 13: Dodanie linków do widoku edycji

Zmodyfikować komponenty wyświetlające zadania:

**W `TaskCard.tsx`** (dashboard):
- Dodać przycisk/link "Edytuj" z `href="/tasks/${task.id}/edit"`

### Krok 14: Testowanie manualne

Przeprowadzić testy scenariuszy:

1. Nawigacja do edycji z różnych miejsc
2. Edycja tytułu z walidacją
3. Edycja opisu
4. Zmiana interwału i obserwacja ScheduleImpactNotice
5. Zmiana preferowanego dnia
6. Zapis zmian - sukces
7. Zapis zmian - błąd walidacji
8. Anulowanie z niezapisanymi zmianami
9. Próba nawigacji z niezapisanymi zmianami (link, back button)
10. Usuwanie zadania - sukces
11. Usuwanie zadania - anulowanie
12. Obsługa błędów 404, 401, 500
13. Testowanie na różnych rozdzielczościach (mobile, tablet, desktop)
14. Testowanie z keyboard navigation
15. Testowanie z screen reader (accessibility)

### Krok 15: Testy E2E (opcjonalne)

Utworzyć plik `tests/e2e/task-edit.spec.ts`:

- Test: Edycja zadania - zmiana tytułu
- Test: Edycja zadania - zmiana harmonogramu
- Test: Ostrzeżenie przy niezapisanych zmianach
- Test: Usuwanie zadania z potwierdzeniem
- Test: Anulowanie usuwania zadania
- Test: Obsługa błędu 404 (zadanie nie istnieje)

### Krok 16: Dokumentacja

Zaktualizować dokumentację projektu:

- Dodać opis widoku edycji do README widoków
- Zaktualizować diagram flow użytkownika
- Dodać screenshots widoku (opcjonalnie)
- Zaktualizować listę zaimplementowanych user stories (US-009, US-010)

