# API Endpoint Implementation Plan: Skip Task

## 1. Przegląd punktu końcowego
Endpoint umożliwia użytkownikowi pominięcie wystąpienia zadania cyklicznego. Aktualizuje datę ostatniej akcji na bieżącą datę, ustawia typ akcji na "skipped" oraz kalkuluje nową datę następnego wykonania na podstawie bieżącej daty plus interwał, z opcjonalnym uwzględnieniem preferowanego dnia tygodnia.

## 2. Szczegóły żądania
- **Metoda HTTP:** `POST`
- **Struktura URL:** `/api/tasks/{taskId}/skip`
- **Parametry:**
  - **Wymagane:** `taskId` (UUID) - identyfikator zadania do pominięcia
  - **Opcjonalne:** brak
- **Request Body:** brak (pusta treść)
- **Nagłówki:**
  - `Authorization: Bearer {access_token}` (wymagany)
  - `Content-Type: application/json` (wymagany)

## 3. Wykorzystywane typy
- **Request:** brak dedykowanych typów (puste body)
- **Response:** `TaskDTO` - kompletny obiekt zadania po aktualizacji
- **Error Response:** `ErrorDTO` dla błędów ogólnych

## 4. Szczegóły odpowiedzi
- **200 OK:** Zadanie zostało pomyślnie pominięte
  ```json
  {
    "id": "uuid-1",
    "user_id": "uuid-string",
    "title": "Change water filter",
    "description": "Replace water filter in refrigerator",
    "interval_value": 6,
    "interval_unit": "months",
    "preferred_day_of_week": 6,
    "next_due_date": "2026-04-18",
    "last_action_date": "2025-10-15",
    "last_action_type": "skipped",
    "created_at": "2025-01-15T12:00:00Z",
    "updated_at": "2025-10-15T16:45:00Z"
  }
  ```
- **400 Bad Request:** Nieprawidłowy format UUID taskId
- **401 Unauthorized:** Brak lub nieprawidłowy token dostępu
- **404 Not Found:** Zadanie nie istnieje lub nie należy do użytkownika
- **500 Internal Server Error:** Błędy serwera

## 5. Przepływ danych
1. **Walidacja żądania:** Sprawdzenie poprawności UUID taskId
2. **Uwierzytelnianie:** Weryfikacja Bearer token przez middleware Astro
3. **Autoryzacja:** Pobranie userId z kontekstu Supabase
4. **Pobranie zadania:** Zapytanie do bazy danych po taskId + userId
5. **Walidacja własności:** Sprawdzenie czy zadanie należy do użytkownika
6. **Obliczenie nowej daty:** Użycie istniejącej logiki calculateNextDueDate
7. **Aktualizacja zadania:** Atomowa aktualizacja pól last_action_date, last_action_type, next_due_date
8. **Odpowiedź:** Zwrócenie zaktualizowanego zadania

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie:** Wymagany Bearer token weryfikowany przez Supabase Auth
- **Autoryzacja:** Sprawdzanie własności zadania przez userId z tokenu
- **Walidacja wejścia:** UUID validation dla taskId
- **SQL Injection:** Zapobieganie przez parameterized queries Supabase
- **Rate limiting:** Brak dedykowanego rate limiting (do rozważenia w przyszłości)
- **Audit trail:** Wszystkie zmiany logowane przez updated_at timestamp

## 7. Obsługa błędów
- **400 Bad Request:** Nieprawidłowy format UUID
  ```json
  {
    "error": "Invalid task ID format",
    "details": "Task ID must be a valid UUID"
  }
  ```
- **401 Unauthorized:** Brak lub nieprawidłowy token
  ```json
  {
    "error": "Unauthorized",
    "details": "Missing or invalid authentication token"
  }
  ```
- **404 Not Found:** Zadanie nie istnieje lub nie należy do użytkownika
  ```json
  {
    "error": "Task not found",
    "details": "Task does not exist or does not belong to the authenticated user"
  }
  ```
- **500 Internal Server Error:** Błędy bazy danych, problemy z połączeniem
  ```json
  {
    "error": "Internal server error",
    "details": "An unexpected error occurred while processing the request"
  }
  ```

## 8. Rozważania dotyczące wydajności
- **Optymalizacja zapytań:** Wykorzystanie istniejących indeksów na (id, user_id)
- **Atomowe operacje:** Pojedyncze zapytanie UPDATE z SELECT dla aktualizacji i pobrania
- **Cache:** Brak cache'owania (zadania mogą być często aktualizowane)
- **Concurrent access:** Brak specjalnej obsługi współbieżności (standardowe Supabase locking)

## 9. Etapy wdrożenia

### Etap 1: Refaktoryzacja metody completeTask na uniwersalną performTaskAction
- Zmienić nazwę metody `completeTask` na `performTaskAction`
- Dodać parametr `actionType: ActionType` ("completed" | "skipped")
- Zaktualizować sygnaturę metody i logikę
- Dodać odpowiednie komentarze JSDoc
- Przetestować metodę jednostkowo z oboma typami akcji

### Etap 2: Aktualizacja endpointu complete
- Zaktualizować wywołanie metody z `completeTask` na `performTaskAction(user.id, taskId, "completed")`
- Zaktualizować komentarze i dokumentację endpointu
- Przetestować endpoint z istniejącymi testami

### Etap 3: Utworzenie endpointu API skip
- Utworzyć plik `src/pages/api/tasks/[taskId]/skip.ts`
- Skopiować strukturę z `complete.ts`
- Użyć wywołania `performTaskAction(user.id, taskId, "skipped")`
- Użyć `export const prerender = false`
- Dodać obsługę błędów zgodnie ze specyfikacją

### Etap 4: Walidacja wejścia
- Dodać walidację UUID dla taskId w obu endpointach
- Skorzystać z istniejących utility funkcji walidacji
- Dodać odpowiednie testy dla edge cases

### Etap 5: Testowanie
- Testy jednostkowe dla TaskService.performTaskAction z parametrem actionType
- Testy integracyjne dla obu endpointów API (complete i skip)
- Testy dla wszystkich scenariuszy błędów
- Ręczne testowanie z różnymi typami zadań i interwałami

### Etap 6: Dokumentacja i deployment
- Zaktualizować dokumentację API dla obu endpointów
- Dodać przykłady użycia dla endpointu skip
- Wdrożyć na środowisko testowe
- Przeprowadzić code review
