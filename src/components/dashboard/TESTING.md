# Dashboard - Instrukcje testowania

Dokument zawiera szczegółowe scenariusze testowe dla widoku Dashboard aplikacji Chronos.

## Przygotowanie do testów

### Wymagania wstępne:
1. Aplikacja uruchomiona w trybie dev: `npm run dev`
2. Dostęp do Supabase (baza danych z zadaniami)
3. Konto użytkownika z sesją aktywną
4. Różne zestawy danych testowych (patrz sekcja "Dane testowe")

### Dostęp do Dashboard:
- URL: `http://localhost:4321/`
- Wymaga autentykacji (redirect do `/login` jeśli brak sesji)

---

## Dane testowe

### Scenariusz 1: Brak zadań
**Setup:** Użytkownik bez żadnych zadań w bazie

**Oczekiwany rezultat:**
- Wyświetla się `EmptyState`
- Ikona ListTodo
- Komunikat: "Nie masz jeszcze żadnych zadań cyklicznych..."
- Przycisk "Utwórz pierwsze zadanie"

### Scenariusz 2: Tylko zadania zaległe
**Setup:** Użytkownik ma zadania z `next_due_date` w przeszłości

**Przykładowe dane:**
```sql
-- Zadanie zaległe 2 dni
UPDATE tasks SET next_due_date = CURRENT_DATE - INTERVAL '2 days' WHERE id = 'xxx';

-- Zadanie zaległe 5 dni
UPDATE tasks SET next_due_date = CURRENT_DATE - INTERVAL '5 days' WHERE id = 'yyy';
```

**Oczekiwany rezultat:**
- Sekcja "Zaległe (2)" z czerwonym nagłówkiem
- 2 karty zadań z czerwonym borderem
- Badge: "2 dni po terminie", "5 dni po terminie"
- Przyciski: "Wykonaj" + "Pomiń"
- Brak sekcji "Nadchodzące"
- Brak `NextTaskPreview`

### Scenariusz 3: Tylko zadania nadchodzące
**Setup:** Użytkownik ma zadania z `next_due_date` w ciągu najbliższych 7 dni

**Przykładowe dane:**
```sql
-- Zadanie za 2 dni
UPDATE tasks SET next_due_date = CURRENT_DATE + INTERVAL '2 days' WHERE id = 'xxx';

-- Zadanie za 6 dni
UPDATE tasks SET next_due_date = CURRENT_DATE + INTERVAL '6 days' WHERE id = 'yyy';
```

**Oczekiwany rezultat:**
- Sekcja "Nadchodzące (7 dni) (2)"
- 2 karty zadań z neutralnym borderem
- Badge niebieski: "za 2 dni", "za 6 dni"
- Tylko przycisk "Wykonaj" (brak "Pomiń")
- Brak sekcji "Zaległe"
- Brak `NextTaskPreview`

### Scenariusz 4: Mix zaległych i nadchodzących
**Setup:** Zadania zarówno przeterminowane jak i nadchodzące

**Oczekiwany rezultat:**
- Sekcja "Zaległe" na górze
- Sekcja "Nadchodzące" poniżej
- Brak `NextTaskPreview`
- Statystyki pokazują oba liczniki

### Scenariusz 5: Tylko zadania w dalekiej przyszłości
**Setup:** Wszystkie zadania mają `next_due_date` > 7 dni od dziś

**Przykładowe dane:**
```sql
-- Zadanie za 10 dni
UPDATE tasks SET next_due_date = CURRENT_DATE + INTERVAL '10 days' WHERE id = 'xxx';
```

**Oczekiwany rezultat:**
- Brak sekcji "Zaległe"
- Brak sekcji "Nadchodzące"
- Wyświetla się `NextTaskPreview` z najbliższym zadaniem
- Badge: "za 10 dni"
- Brak przycisków akcji (tylko informacja)

---

## Testowanie interakcji

### Test 1: Oznaczanie zadania jako wykonane

**Kroki:**
1. Otwórz Dashboard z zadaniami zaległymi
2. Kliknij przycisk "Wykonaj" na pierwszym zadaniu
3. Obserwuj stan przycisku i karty

**Oczekiwane zachowanie:**
- Przycisk staje się disabled
- Wyświetla się spinner + tekst "Przetwarzanie..."
- Karta zadania znika z listy (optymistyczna aktualizacja)
- Po sukcesie: dashboard się odświeża, zadanie nie wraca
- Liczniki w statystykach aktualizują się

**Obsługa błędów:**
- Przy błędzie: zadanie wraca na listę
- Przycisk staje się aktywny ponownie
- W konsoli: "Failed to complete task: ..." (TODO: toast)

### Test 2: Pomijanie zadania

**Kroki:**
1. Otwórz Dashboard z zadaniami zaległymi
2. Kliknij przycisk "Pomiń" na zadaniu
3. Obserwuj zachowanie

**Oczekiwane zachowanie:**
- Analogicznie do "Wykonaj"
- Zadanie znika z listy
- Po sukcesie: dashboard się odświeża
- W konsoli: "Task skipped successfully" (TODO: toast)

### Test 3: Szybkie wielokrotne kliknięcia (race condition)

**Kroki:**
1. Kliknij bardzo szybko 5 razy przycisk "Wykonaj" na tym samym zadaniu

**Oczekiwane zachowanie:**
- Przycisk staje się disabled po pierwszym kliknięciu
- Kolejne kliknięcia są ignorowane
- Tylko jedno zapytanie API jest wysyłane
- Zadanie znika tylko raz

### Test 4: Retry po błędzie ładowania

**Kroki:**
1. Symuluj błąd API (wyłącz serwer / odłącz internet)
2. Odśwież Dashboard
3. Powinien wyświetlić się `ErrorState`
4. Kliknij "Spróbuj ponownie"

**Oczekiwane zachowanie:**
- `ErrorState` z ikoną AlertCircle
- Komunikat błędu przyjazny użytkownikowi
- Przycisk "Spróbuj ponownie"
- Po kliknięciu: powrót do LoadingState → próba ponownego pobrania

---

## Testowanie responsywności

### Mobile (< 640px)

**Elementy do sprawdzenia:**
- DashboardSummary: 1 kolumna (każda statystyka pod sobą)
- TaskCard: pełna szerokość, tekst nie ucięty
- Przyciski: min. 44px wysokości (touch target)
- Container padding: px-4
- NextTaskPreview: data i dni pod sobą (flex-col)

**Testuj na:**
- iPhone SE (375px)
- iPhone 12 (390px)
- Android (360px)

### Tablet (640px - 1024px)

**Elementy do sprawdzenia:**
- DashboardSummary: 3 kolumny
- Odpowiednie odstępy między elementami
- Tekst czytelny, nie za duży/mały

### Desktop (> 1024px)

**Elementy do sprawdzenia:**
- Container: max-width z margin auto (wycentrowany)
- DashboardSummary: 3 kolumny z odpowiednimi odstępami
- Wszystko czytelne i estetyczne

---

## Testowanie accessibility

### Keyboard Navigation

**Test z użyciem klawiatury (bez myszy):**

1. Tab przez elementy strony
2. Sprawdź focus indicators (widoczne ramki)
3. Enter/Space na przyciskach wykonuje akcję
4. Kolejność Tab logiczna: Header → Zaległe → Nadchodzące → Summary

**Oczekiwane zachowanie:**
- Wszystkie interaktywne elementy dostępne przez Tab
- Focus indicators wyraźnie widoczne
- Enter/Space aktywuje przyciski

### Screen Reader

**Test z NVDA / JAWS / VoiceOver:**

1. Uruchom screen reader
2. Nawiguj przez Dashboard
3. Sprawdź czy wszystkie elementy są odczytywane

**Oczekiwane odczyty:**
- Nagłówki: "Witaj, [nazwa]!" → "Aktualna data"
- Sekcje: "Zaległe, 2 zadania"
- Przyciski: "Wykonaj zadanie: [tytuł zadania]"
- Statystyki: "Wszystkie zadania, 5"

### Kontrast kolorów

**Sprawdź kontrast:**
- Tekst na tle (min. 4.5:1)
- Przyciski w stanie disabled
- Badge'y z liczbą dni

**Narzędzia:**
- Chrome DevTools > Lighthouse > Accessibility
- axe DevTools extension

---

## Testowanie stanów

### Loading State

**Jak przetestować:**
1. Użyj throttling w Chrome DevTools (Network → Slow 3G)
2. Odśwież Dashboard
3. Obserwuj skeleton loader

**Oczekiwane:**
- Skeleton odzwierciedla strukturę Dashboard
- Animacja pulse na wszystkich elementach
- Czas trwania: kilka sekund (zależnie od połączenia)

### Error State

**Scenariusze błędów:**

**Błąd 401 (Unauthorized):**
- Symuluj: usuń token z localStorage
- Oczekiwane: redirect do `/login`

**Błąd 500 (Server Error):**
- Symuluj: zepsuj endpoint API
- Oczekiwane: ErrorState z komunikatem "Wystąpił problem z serwerem..."

**Błąd Network:**
- Symuluj: wyłącz internet
- Oczekiwane: ErrorState z komunikatem "Brak połączenia z internetem..."

### Empty State

**Jak przetestować:**
1. Usuń wszystkie zadania użytkownika z bazy
2. Odśwież Dashboard

**Oczekiwane:**
- EmptyState z ikoną ListTodo
- Przycisk "Utwórz pierwsze zadanie" → link do `/tasks/new`

---

## Testowanie edge cases

### Edge Case 1: Bardzo długi tytuł zadania

**Setup:** Zadanie z tytułem > 100 znaków

**Oczekiwane:**
- Tytuł obcięty z `truncate`
- Tooltip przy hover (TODO: implementacja)
- Layout nie pęka

### Edge Case 2: Zadanie bez opisu

**Setup:** Zadanie z `description = null`

**Oczekiwane:**
- Karta wyświetla się poprawnie
- Brak pustego miejsca po opisie

### Edge Case 3: Zadanie z bardzo długim opisem

**Setup:** Zadanie z opisem > 500 znaków

**Oczekiwane:**
- Opis obcięty do 2 linii (`line-clamp-2`)
- Tooltip lub "Czytaj więcej" (TODO)

### Edge Case 4: 100+ zadań zaległych

**Setup:** Użytkownik ma 100 zadań przeterminowanych

**Oczekiwane:**
- Wszystkie zadania renderują się
- Nie ma problemów z wydajnością
- Scroll działa płynnie

### Edge Case 5: Zadanie zaległe 365+ dni

**Setup:** Zadanie z `next_due_date` rok temu

**Oczekiwane:**
- Badge: "365 dni po terminie"
- Odmiana: "dni" (nie "dzień")
- Wszystko czytelne

---

## Performance Testing

### Metryki do sprawdzenia:

**Lighthouse Score:**
- Performance: > 90
- Accessibility: > 95
- Best Practices: > 90

**Core Web Vitals:**
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

**Jak mierzyć:**
1. Chrome DevTools > Lighthouse
2. Tryb "Navigation (default)"
3. Desktop + Mobile
4. Porównaj wyniki

### Optymalizacje (jeśli potrzebne):

- Code splitting komponentów
- Lazy loading dla długich list
- Memoizacja komponentów (React.memo)
- useCallback dla callbacków

---

## Checklist przed deploymentem

### Funkcjonalność:
- [ ] Dashboard ładuje się poprawnie
- [ ] Wszystkie sekcje renderują się zgodnie z danymi
- [ ] Przyciski "Wykonaj" działają
- [ ] Przyciski "Pomiń" działają
- [ ] Retry po błędzie działa
- [ ] Redirect do login przy 401

### UI/UX:
- [ ] Responsywność na wszystkich rozdzielczościach
- [ ] Loading state wyświetla się podczas ładowania
- [ ] Error state wyświetla się przy błędach
- [ ] Empty state wyświetla się gdy brak zadań
- [ ] Animacje płynne (opcjonalnie)

### Accessibility:
- [ ] Keyboard navigation działa
- [ ] ARIA labels na wszystkich przyciskach
- [ ] Screen reader odczytuje wszystko poprawnie
- [ ] Kontrast kolorów > 4.5:1
- [ ] Focus indicators widoczne

### Performance:
- [ ] Lighthouse Score > 90
- [ ] Brak problemów z długimi listami (100+ zadań)
- [ ] Brak memory leaks
- [ ] Optymistyczne aktualizacje działają szybko

### Code Quality:
- [ ] Brak błędów ESLint
- [ ] Brak błędów TypeScript
- [ ] Kod zgodny z zasadami projektu
- [ ] Dokumentacja aktualna

---

## Znane ograniczenia (TODO)

1. **Brak toast notifications** - obecnie błędy logowane tylko do konsoli
2. **Brak animacji transitions** - optymistyczne aktualizacje bez fade in/out
3. **Brak infinite scroll** - wszystkie zadania renderowane naraz
4. **Brak offline support** - wymaga połączenia internetowego
5. **Brak onboarding section** - dla nowych użytkowników

---

## Zgłaszanie błędów

Jeśli znajdziesz błąd podczas testowania:

1. Sprawdź konsolę przeglądarki (F12)
2. Sprawdź Network tab (wywołania API)
3. Skopiuj logi błędów
4. Opisz kroki reprodukcji
5. Załącz screenshoty
6. Zgłoś w systemie issue trackingu

