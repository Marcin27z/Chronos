# Plan implementacji widoku Create Task

## 1. Przegląd
Widok `/tasks/new` to formularz dodawania nowego zadania cyklicznego. Pozwala zebrać tytuł, opis, interwał powtarzalności oraz preferowany dzień tygodnia, a na podstawie tych danych pokazuje podgląd najbliższego terminu i realizuje zapis zadania na backendzie.

## 2. Routing widoku
Widok dostępny pod ścieżką `/tasks/new`; to strona w Astro wykorzystująca komponenty React do obsługi interaktywnej logiki formularza oraz integracji z autoryzacją Supabase.

## 3. Struktura komponentów
- `CreateTaskPage` (strona Astro) – ładuje kontekst auth i renderuje formularz.
- `TaskForm` – kontener formularza z sekcjami.
  - `TaskFormHeader` – tytuł + status (np. komunikaty o błędach/zmianach).
  - `TaskBaseFields` – title, description (Shadcn TextField/TextArea).
  - `ScheduleSection` – `IntervalPicker`, `DaySelector`, dodatkowe opisy.
  - `NextDueDatePreview` – live preview terminu.
  - `FormActions` – przyciski „Zapisz”/„Anuluj” + stany.
  - `FormErrorsAlert` – opcjonalnie alert zbiorczy błędów.

## 4. Szczegóły komponentów
### TaskForm
- Opis: zarządza stanem formularza (value/touched/errors) i przekazuje dane do dzieci.
- Główne elementy: `form` z `fieldset` dla sekcji (podstawowe info i harmonogram), `TaskBaseFields`, `ScheduleSection`, `NextDueDatePreview`, `FormActions`.
- Interakcje: submit (z wywołaniem POST), reset/anuluj, aktualizacja podglądu.
- Walidacja: sprawdzanie tytułu (non-empty, max 256), opisu (max 5000), `interval_value` (integer 1-999), `interval_unit` (enum), `preferred_day_of_week` (0-6 lub null).
- Typy: `CreateTaskViewModel`, `ValidationState`.
- Propsy: `onSubmit`, `onCancel`, `initialValues` (domyślne), `onSuccess`.

### TaskBaseFields
- Opis: sekcja inputs title/description.
- Elementy: `Label`, `Input`, `Textarea` z `aria-required`, `aria-describedby` do komunikatów błędów.
- Interakcje: typowanie, focus, walidacja onBlur.
- Walidacja: tytuł wymagany, max 256; opis max 5000.
- Typy: `string` dla tytułu, `string | undefined` dla opisu.
- Propsy: `values`, `errors`, `onChange`, `onBlur`.

### IntervalPicker
- Opis: wybór liczby i jednostki interwału.
- Elementy: `NumberInput` (1-999) i `SegmentedControl`/`Select` z opcjami `days`, `weeks`, `months`, `years`.
- Interakcje: zmiana wartości oraz jednostki, klawiatura.
- Walidacja: cały czas w zakresie 1-999, jednostka tylko z listy.
- Typy: `intervalValue: number`, `intervalUnit: IntervalUnit`.
- Propsy: `value`, `unit`, `errors`, `onValueChange`, `onUnitChange`.

### DaySelector
- Opis: opcjonalny wybór preferowanego dnia tygodnia.
- Elementy: siedem przycisków `button` (lub `ToggleGroup`) z `aria-pressed`.
- Interakcje: toggle (wybór/wyczyszczenie), wsparcie klawiatury.
- Walidacja: wartość `null` lub `0-6`.
- Typy: `preferredDayOfWeek: number | null`.
- Propsy: `value`, `onChange`.

### NextDueDatePreview
- Opis: pokazuje obliczony najbliższy termin.
- Elementy: tekst z datą i ewentualnymi detalami (np. „+6 miesięcy”).
- Interakcje: brak (wyświetlanie).
- Walidacja: tylko pokazuje gdy formularz w poprawnym stanie.
- Typy: `nextDueDate: string | null`, `description?: string`.
- Propsy: `preview`.

### FormActions
- Opis: przyciski zapisu i anulowania.
- Elementy: primary button submit (disablowany gdy błąd), link/cancel button z guardem unsaved.
- Interakcje: submit, cancel.
- Walidacja: disable submit gdy `isSubmitting` lub `hasErrors`.
- Typy: `isSubmitting`, `onSubmit`, `onCancel`, `hasErrors`.
- Propsy: `isSubmitting`, `hasErrors`, `onCancel`.

## 5. Typy
- `CreateTaskViewModel`:
  - `title: string`
  - `description?: string`
  - `interval_value: number`
  - `interval_unit: IntervalUnit`
  - `preferred_day_of_week: number | null`
- `FormFieldMeta` (internal): `{ touched: boolean; error?: string }`.
- `CreateTaskResponseDTO` (TaskDTO): używane tylko do potwierdzenia i ewentualnego redirectu.
- `NextDueDatePreviewModel`: `{ nextDueDate: string | null; summary: string }`.
- `ValidationState`: `Record<keyof CreateTaskViewModel, string | undefined>` + `general?: string`.
- `IntervalOption`: `{ label: string; value: IntervalUnit; }`.
- `DayOption`: `{ label: string; value: number; }`.

## 6. Zarządzanie stanem
- `useCreateTaskForm` hook:
  - Przechowuje wartości (`useState` lub `useReducer`), meta, błędy.
  - Waliduje przy zmianie (`validateField`) oraz przy submit (`validateForm`).
  - Oblicza `nextDueDatePreview` (useMemo) przy zmianie `interval`.
  - Zarządza `isDirty` do guardu przed utratą danych (hook `useUnsavedChanges` z `beforeunload` oraz Astro navigation guard).
  - Ekspozycja `submitForm`, `cancel`, `reset`.
- `useApiRequest` (shared) do POST z obsługą loading/error.

## 7. Integracja API
- Endpoint: `POST /api/tasks`.
- Nagłówki: `Authorization: Bearer {access_token}` (z kontekstu sesji Supabase), `Content-Type: application/json`.
- Request body: `CreateTaskViewModel`.
- Response: `TaskDTO` (szczególnie `id`, `next_due_date`).
- Obsługa statusów: 201 success -> komunikat + redirect; 400/422 -> mapowanie `details` na pola; 401 -> przekierowanie/login; inne -> toast/alert.
- Token pobierany z klienta Supabase (np. `useUser` lub `auth` store).

## 8. Interakcje użytkownika
- Wpisywanie tytułu/opisu aktualizuje state i walidację (inline).
- Zmiany interval value/unit aktualizują `NextDueDatePreview`.
- Kliknięcie dnia tygodnia ustawia preferencję (ponowne kliknięcie reset).
- Submit przy poprawnych danych wywołuje API; po sukcesie: toast + redirect (np. `/tasks`).
- Anuluj/wyjście uruchamia guard unsaved changes (potwierdzenie).
- Błędy serwerowe pojawiają się w `FormErrorsAlert` oraz inline (jeśli `field`).

## 9. Warunki i walidacja
- Tytuł: wymagany, max 256 znaków (walidacja `yup`/`zod` lub manualna).
- Opis: opcjonalny, max 5000 znaków.
- Interval value: liczbowe, 1-999 (można ograniczyć min/max w `input`).
- Interval unit: tylko `days`, `weeks`, `months`, `years`.
- Preferred day: `0-6` lub `null`.
- Klient blokuje submit gdy walidacja nie przechodzi (disabled button + wskazówki).
- Walidacja serwerowa (400/422) mapowana do konkretnych `field`.

## 10. Obsługa błędów
- Walidacja: inline + `FormErrorsAlert`.
- Błąd 401: redirect do logowania lub wyświetlenie overlay.
- Błąd 422/400: odczytanie `ValidationErrorDTO` i przypisanie do `field`/`general`.
- Sieć/500: banner „Coś poszło nie tak” + możliwość ponowienia.
- Unsaved changes: potwierdzenie przed nawigacją.

## 11. Kroki implementacji
1. Utworzyć stronę Astro `/tasks/new` w `src/pages/tasks/new.astro` lub analogicznej, ustawić `client:load` i pobrać sesję Supabase.
2. Zaprojektować hook `useCreateTaskForm` z inicjalnymi wartościami, walidacją i logiką preview.
3. Stworzyć komponenty `TaskBaseFields`, `IntervalPicker`, `DaySelector`, `NextDueDatePreview`, `FormActions` i `FormErrorsAlert`, z odpowiednimi propsami, typami i stylizacją tailwind/Shadcn.
4. W `CreateTaskPage` złożyć strukturę formularza, podłączyć hook, przekazać handlers do komponentów.
5. Dodać logikę unsaved-changes guard oraz dostępność (`aria-`).
6. Zaimplementować wywołanie POST `/api/tasks` z nagłówkami auth, mapowaniem błędów i pokazaniem komunikatu po sukcesie.
7. Uzupełnić stylizację i UX (smart defaults, informacje tooltip, disabled state). Testować scenariusze błędów i walidacji.
8. Dodać testy/manual flow demonstration (opcjonalnie e2e).#

