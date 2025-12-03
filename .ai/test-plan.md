# Plan testów dla Chronos

## 1. Wprowadzenie i cele testowania
- Zapewnienie stabilności MVP skupionego na cyklicznych zadaniach: weryfikacja poprawności logiki przypominania, terminów i statusów.
- Utrzymanie wysokiej jakości interfejsu Astro/React bez nadmiernego obciążenia JavaScript (Astro 5, React 19, TypeScript 5, Tailwind 4, Shadcn/ui).
- Weryfikacja integracji z Supabase (auth + PostgreSQL) oraz poprawności wywołań REST API obsługujących CRUD zadań i akcje “complete/skip”.
- Identyfikacja regresji w widokach dashboarda i formularzach z uwzględnieniem stanów ładowania, błędów i braku danych.
- Potwierdzenie, że dane dotyczące kolejnych wystąpień i statusów zadań są spójne między UI, widokami i backendem.

## 2. Zakres testów
- Frontend: komponenty w `src/components` (dashboard, auth, tasks, navbar, task-list) oraz layouty i katalog `src/pages` (formularze, dashboard, strony auth) — testy jednostkowe i integracyjne.
- Warstwa danych: hooki (`src/lib/hooks`), serwisy (`src/lib/services`), API (`src/lib/api`) i middleware (`src/middleware`), które łączą UI z Supabase.
- Backend/API: endpointy w `src/pages/api` (tasks, auth, dashboard, akcje complete/skip) — testy API i integracja z Supabase.
- Testy end-to-end: kluczowe ścieżki użytkownika (rejestracja, logowanie, tworzenie zadań, dashboard, oznaczanie zadań).
- Stany pomocnicze: komponenty EmptyState/ErrorState/LoadingState, walidacje formularzy (z użyciem `zod`, `auth.validation` i `task validation`), bezpieczeństwo routingu (np. `BackButtonGuard`).

## 3. Typy testów do przeprowadzenia
- **Testy jednostkowe**: hooki (np. `useDashboard`, `useCreateTaskForm`), helpery (`date-format.utils`, `validation.utils`), komponenty formularzy (`TaskForm`, `AuthInput`, `TaskSortFilter`), logika kalkulacji `next_due_date`.
- **Testy integracyjne**: komponenty dashboardu (`Dashboard`, `TaskCard`, `NextTaskPreview`, `OverdueTasksSection`), formularze z zadaniami i API (`TaskForm` + `task.service`, `auth.service`), middleware autoryzacyjne.
- **Testy e2e**: scenariusze użytkownika dla ścieżek auth (rejestracja → dashboard), CRUD zadań, oznaczania jako wykonane/pominione z weryfikacją aktualizacji UI i danych Supabase.
- **Testy regresji UI**: snapshoty lub porównania DOM dla kluczowych layoutów i komponentów Shadcn/ui + Tailwind 4.
- **Testy wydajnościowe/monitoring**: ładowanie dashboardu z większą liczbą zadań, czas renderowania kart z powtarzającymi się datami.
- **Testy bezpieczeństwa**: walidacja tokenów Supabase, ochrona endpointów (`complete`, `skip`, `tasks`), testy guardów routingu.
- **Testy dostępności**: audyt ARIA/kontrastów w komponentach Shadcn/ui, klawiaturowa nawigacja w dashboardzie i formularzach.

## 4. Scenariusze testowe dla kluczowych funkcjonalności
- **Rejestracja i logowanie**
  - Krok 1: wprowadź poprawne dane rejestracji; oczekuj przekierowania do dashboardu i tokena w lokalnym magazynie.
  - Krok 2: spróbuj zarejestrować się tym samym emailem; oczekuj błędu `duplicate email` z komponentu `AuthInput`.
  - Krok 3: zaloguj się niepoprawnym hasłem; potwierdź komunikat błędu, brak tokena, brak przekierowania.
  - Krok 4: wyzwól reset hasła; sprawdź UI `ForgotPasswordForm`, weryfikuj request do `api/auth/reset` i komunikat sukcesu.
  - Krok 5: zweryfikuj, że po zalogowaniu komponenty `Navbar`/`Dashboard` używają autoryzacji z `auth.service`.
- **Zarządzanie zadaniami**
  - Krok 1: utwórz nowe zadanie z różnymi `interval_unit` (dni, tygodnie, miesiące) i `preferred_day_of_week`; sprawdź wywołanie `POST /api/tasks` i zachowanie `TaskList`.
  - Krok 2: edytuj zadanie, zmieniając interwał i opis; potwierdź `PATCH /api/tasks/:id`, aktualizację `next_due_date` i UI na dashboardzie.
  - Krok 3: usuń zadanie poprzez `TaskDeleteDialog`; potwierdź `DELETE /api/tasks/:id`, aktualizację paginacji i brak elementu w `TaskGrid`.
  - Krok 4: wpisuj niepełne dane (np. brak tytułu) w `TaskBaseFields` i obserwuj walidacje `zod` w formularzu.
- **Dashboard i podglądy**
  - Krok 1: załaduj dashboard z danymi w kilku stanach (sprzężone `useDashboard` + `dashboard.api`); potwierdź obecność `OverdueTasksSection`, `UpcomingTasksSection`.
  - Krok 2: przy braku danych sprawdź `EmptyState`, podczas ładowania `LoadingState`, przy błędzie `ErrorState`.
  - Krok 3: weryfikuj `DashboardSummary` i `NextTaskPreview` odzwierciedlające zmienione `next_due_date` po operacjach `complete/skip`.
- **Życie zadania**
  - Krok 1: w komponencie `TaskCard` kliknij `complete`; sprawdź wywołanie `POST /api/tasks/[id]/complete`, aktualizację statusu i `next_due_date`.
  - Krok 2: kliknij `skip`; potwierdź nowy status oraz zachowanie `NextTaskPreview`.
  - Krok 3: sprawdź, że dashboard i `TaskList` odświeżają się po zmianie statusu (hook `useTaskList` i `task.service`).
- **Task list + filtrowanie**
  - Krok 1: sortuj zadania według daty i nazwy w `TaskSortFilter`; oczekuj przekształcenia listy.
  - Krok 2: zastosuj filtr stanu (np. „Overdue”) i weryfikuj, że `TaskList` pokazuje oczekiwane rekordy.
  - Krok 3: paginacja – przechodź między stronami; potwierdź, że komponent `Pagination` odświeża dane z `useTaskList`.
  - Krok 4: wywołaj `TaskDeleteDialog`, zatwierdź usuwanie; sprawdź stan ładowania i obsługę błędów z API.
- **Nawigacja i stan aplikacji**
  - Krok 1: testuj `Navbar` i `MobileMenu` w widokach mobilnych i desktopowych (Tailwind4 responsywność).
  - Krok 2: aktywuj `BackButtonGuard` podczas edycji zadania; potwierdź ostrzeżenie przy próbie opuszczenia formularza bez zapisania.
  - Krok 3: przetestuj dostępność ruchu za pomocą klawiatury i focus w menu użytkownika.
- **Stany wyjątkowe**
  - Krok 1: symuluj błąd Supabase (np. 500) przy ładowaniu dashboardu; potwierdź `ErrorState` i logowanie błędu.
  - Krok 2: przełącz komponenty task-list/dashboard do stanów ładowania i pustych danych; sprawdź UI.
  - Krok 3: testuj tokeny wygasłe – brak dostępu do `api/tasks`, przekierowanie do logowania.

## 5. Środowisko testowe
- Lokalnie: Node.js 22.14.0 + npm; uruchomienie `npm run dev`/`npm run build` w środowisku z plikiem `.env` zawierającym dane Supabase + Openrouter.ai (jeśli używane dla funkcji) z mockowanymi kluczami.
- Supabase emulator/localstack albo dedykowane środowisko testowe z bazą PostgreSQL (zresetowaną przed sesją testową) i danymi referencyjnymi (schemat z `supabase/migrations`).
- Dane testowe: zestaw użytkowników i zadań z różnymi interwałami; konfiguracja tokena (Bearer) do testów API.
- Środowiska CI/CD (GitHub Actions) do uruchomienia lintów, testów oraz e2e na każdą gałąź feature.
- Wsparcie środowiska przeglądarkowego (np. Chrome Headless) podczas testów end-to-end.

## 6. Narzędzia do testowania
- **Testy jednostkowe/integracyjne**: `Vitest` + `@testing-library/react`/`@testing-library/dom` dla komponentów React/Astro, `msw` do mockowania odpowiedzi Supabase, `zod` do weryfikacji walidacji.
- **Testy e2e**: `Playwright` lub `Cypress` do symulacji użytkownika (rejestracja, zadania, dashboard) na środowisku dev/prview.
- **API/contract testing**: `Postman`, `Insomnia` lub `Hoppscotch` dla `POST /api/tasks` i akcji `complete/skip`; automatyzacja w `Newman`/skryptach `npm`.
- **Analiza jakości kodu**: `npm run lint`, `npm run format`, snapshoty oraz integracja z `husky` + `lint-staged`.
- **Monitorowanie wydajności i dostępności**: `Lighthouse`, `axe-core` (np. Playwright + axe) dla widoków dashboardu i formularzy.
- **Supabase CLI** do resetowania środowiska testowego i odtwarzania migracji.

## 7. Harmonogram testów
- **Dzień 1–2**: Analiza wymagań, konfiguracja środowisk (Supabase, `.env`, testowe dane), ustalenie narzędzi, przygotowanie scenariuszy i danych (task templates, użytkownicy).
- **Dzień 3–5**: Testy jednostkowe + integracyjne komponentów dashboardu, formularzy, hooków i serwisów; automatyzacja z mockami Supabase.
- **Dzień 6–8**: Testy end-to-end (scenariusze auth, CRUD zadań, dashboard, task lifecycle) oraz logowanie błędów, uwzględnienie przypadków błędnych danych i guardów.
- **Dzień 9–10**: Testy regresji UI/dostępności (Tailwind + Shadcn/ui), testy wydajnościowe dashboardu, weryfikacja konsystencji interfejsu przy rosnącej liczbie zadań.
- **Dzień 11–12**: Testy API (Supabase, endpointy tasks/auth), tworzenie raportów, retesty po poprawkach, przygotowanie zestawu do CI/CD.
- **Dzień 13–14**: Stabilizacja, ostateczny przebieg testów, przegląd kryteriów akceptacji, przekazanie wyników interesariuszom.

## 8. Kryteria akceptacji testów
- Wszystkie krytyczne ścieżki (reg, auth, task CRUD, dashboard) posiadają pokrycie testami i przechodzą w środowisku dev/prview.
- Brak regresji w stanach UI (snapshoty/regresja DOM, testy stanów błędów/ładowania).
- API Supabase (CRUD, complete/skip, dashboard data) odpowiada poprawnymi kodami HTTP i aktualizuje `next_due_date`.
- Automatyczne testy e2e uruchamiane w CI/CD zakończone sukcesem przed mergem gałęzi, brak blokujących bugów w GitHub Issues.
- Raporty błędów zawierają kroki reprodukcji, logi, środowisko i priorytet.

## 9. Role i odpowiedzialności w procesie testowania
- **QA Lead**: planuje scenariusze, koordynuje środowisko testowe, przegląda raporty, zatwierdza przejazdy regresji.
- **Inżynier QA/Test Automation**: implementuje testy jednostkowe/integracyjne, utrzymuje testy e2e, prowadzi testy wydajnościowe/dostępności, aktualizuje dokumentację.
- **Backend/Frontend Developer**: wspiera debugging błędów, dostarcza mocki/kalkulatory dat (z `task.service`), reaguje na zgłoszone defekty i weryfikuje poprawki.
- **Product Owner/PM**: definiuje priorytety funkcjonalności, odbiera kryteria akceptacji, przegląda krytyczne błędy.
- **DevOps/Platform Engineer**: utrzymuje Supabase testowe środowisko, CI/CD (GitHub Actions) i monitoruje stabilność `npm run build`/preview.

## 10. Procedury raportowania błędów
- Zgłoszenia prowadzimy na GitHub Issues z szablonem zawierającym: opis, kroki do reprodukcji, oczekiwane vs. obserwowane zachowanie, środowisko (Node 22.14, przeglądarka), logi, zrzuty ekranu.
- Priorytety: krytyczne (blokery auth/dashboard), wysokie (task lifecycle), średnie (UI/dostępność), niskie (estetyka). Oznaczamy komponent (`dashboard`, `tasks`, `auth`) i przypisujemy właściciela.
- Potwierdzenie poprawki: retest w tym samym środowisku + automatyczny pipeline w CI (lint + testy); mark issue jako `verified` po zielonym przejeździe.
- Komunikacja: codzienny stand-up/komentarz do ticketu, kiedy blokujący bug; raporty z wynikami testów w dedykowanym kanale (Slack/Teams).

