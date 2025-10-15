# Dokument wymagań produktu (PRD) - Cykliczne Zadania
## 1. Przegląd produktu
"Cykliczne Zadania" to minimalisytyczna aplikacja internetowa (MVP) zaprojektowana w celu pomocy użytkownikom w zarządzaniu rzadko powtarzającymi się zadaniami i obowiązkami. Głównym celem produktu jest rozwiązanie specyficznego problemu zapominania o czynnościach, które należy wykonywać w długich, nieregularnych odstępach czasu (np. co kilka miesięcy lub raz w roku).

Aplikacja koncentruje się na prostocie, przejrzystości i obsłudze jednego, kluczowego zadania: niezawodnego przypominania o powtarzalnych obowiązkach. Jest to narzędzie przeznaczone dla użytkowników indywidualnych, do zarządzania głównie zadaniami domowymi i osobistymi.

## 2. Problem użytkownika
Użytkownicy mają trudności z pamiętaniem o zadaniach, które nie są częścią ich codziennej rutyny. Standardowe narzędzia, takie jak kalendarze czy aplikacje typu "to-do", często nie sprawdzają się w tym kontekście. Kalendarze mogą być zapełnione spotkaniami, przez co powiadomienia o zadaniach domowych giną w natłoku informacji. Z kolei aplikacje do zarządzania zadaniami są zorientowane na krótkoterminowe cele i projekty, a rzadkie, powtarzalne zadania mogą być trudne do efektywnego śledzenia.

Brak dedykowanego narzędzia prowadzi do pomijania ważnych obowiązków, takich jak przeglądy techniczne, konserwacja sprzętu domowego czy odnawianie subskrypcji, co może skutkować niepotrzebnymi kosztami lub problemami.

## 3. Wymagania funkcjonalne
### 3.1. Zarządzanie kontem użytkownika
-   Rejestracja nowego użytkownika za pomocą adresu e-mail i hasła.
-   Weryfikacja adresu e-mail poprzez link aktywacyjny wysyłany po rejestracji.
-   Logowanie i wylogowywanie.
-   Mechanizm odzyskiwania hasła z wykorzystaniem adresu e-mail.
-   Możliwość trwałego usunięcia konta wraz ze wszystkimi danymi.

### 3.2. Zarządzanie zadaniami (CRUD)
-   Tworzenie zadań z wymaganym tytułem i opcjonalnym opisem.
-   Definiowanie harmonogramu powtarzalności dla każdego zadania.
-   Przeglądanie listy wszystkich utworzonych zadań.
-   Możliwość sortowania listy zadań alfabetycznie i według daty następnego wykonania.
-   Edycja wszystkich parametrów zadania.
-   Usuwanie zadań.

### 3.3. Harmonogram i cykl życia zadania
-   Ustawianie interwału powtarzalności w dniach, tygodniach, miesiącach lub latach.
-   Opcjonalne wymuszenie wykonania zadania w konkretnym dniu tygodnia (np. najbliższa sobota po upływie interwału).
-   Termin następnego zadania jest automatycznie przeliczany po oznaczeniu bieżącego jako "wykonane" lub "pominięte".
-   Możliwość oznaczenia zadania jako wykonanego również przed jego terminem.

### 3.4. Interfejs użytkownika i widoki
-   Główny pulpit (Dashboard) jako ekran startowy po zalogowaniu.
-   Pulpit prezentuje dwie sekcje: zadania zaległe oraz zadania nadchodzące w ciągu najbliższych 7 dni.
-   Jeśli brak zadań w perspektywie 7 dni, pulpit wyświetla informację o dacie i nazwie najbliższego zaplanowanego zadania.
-   Dla zadań zaległych dostępne są dwie akcje: "Wykonaj" i "Pomiń".
-   Przyjazne komunikaty o błędach i potwierdzenia wykonania akcji.

### 3.5. Onboarding i pomoc
-   Proces wdrożenia dla nowych użytkowników, prezentujący listę sugerowanych, typowych zadań do zaimportowania jednym kliknięciem.
-   Dedykowana podstrona "Pomoc" zawierająca listę sugestii oraz odpowiedzi na najczęstsze pytania.

## 4. Granice produktu
### 4.1. W zakresie MVP
-   Wszystkie funkcjonalności wymienione w sekcji 3.
-   Aplikacja dostępna wyłącznie w wersji internetowej (desktop i mobile web).
-   Obsługa wyłącznie języka polskiego.

### 4.2. Poza zakresem MVP
-   Integracja z zewnętrznymi kalendarzami (np. Google Calendar, Outlook).
-   Natywne aplikacje mobilne (iOS, Android).
-   System powiadomień (e-mail, push, SMS).
-   Funkcja "drzemki" (snooze) dla nadchodzących zadań.
-   Załączniki do zadań.
-   Współdzielenie zadań i praca zespołowa.
-   Zaawansowane opcje powtarzalności (np. "w każdy drugi wtorek miesiąca").

## 5. Historyjki użytkowników
### Rejestracja i Onboarding
-   ID: US-001
-   Tytuł: Rejestracja nowego konta
-   Opis: Jako nowy użytkownik, chcę móc założyć konto używając mojego adresu e-mail i hasła, abym mógł zacząć zapisywać swoje zadania.
-   Kryteria akceptacji:
    1.  Formularz rejestracji zawiera pola: adres e-mail, hasło, powtórz hasło.
    2.  System waliduje poprawność formatu adresu e-mail.
    3.  System sprawdza, czy hasła w obu polach są identyczne.
    4.  System sprawdza, czy podany e-mail nie jest już zarejestrowany.
    5.  Po pomyślnej rejestracji na podany adres e-mail wysyłana jest wiadomość z linkiem weryfikacyjnym.
    6.  Użytkownik widzi komunikat informujący o konieczności weryfikacji adresu e-mail.

-   ID: US-002
-   Tytuł: Weryfikacja adresu e-mail
-   Opis: Jako nowy użytkownik, chcę kliknąć w link weryfikacyjny w otrzymanym e-mailu, aby aktywować moje konto i móc się zalogować.
-   Kryteria akceptacji:
    1.  E-mail weryfikacyjny zawiera unikalny, jednorazowy link.
    2.  Po kliknięciu w link, konto użytkownika zostaje aktywowane.
    3.  Użytkownik jest przekierowany na stronę z potwierdzeniem aktywacji i przyciskiem logowania.
    4.  Próba ponownego użycia linku skutkuje wyświetleniem informacji, że konto zostało już aktywowane.

-   ID: US-003
-   Tytuł: Onboarding po pierwszym logowaniu
-   Opis: Jako nowy użytkownik, po pierwszym zalogowaniu chcę zobaczyć listę sugerowanych zadań, abym mógł szybko dodać kilka z nich i zrozumieć działanie aplikacji.
-   Kryteria akceptacji:
    1.  Po pierwszym zalogowaniu na pustym koncie wyświetlana jest sekcja onboardingu.
    2.  Sekcja zawiera listę typowych zadań (np. "Wymiana filtra wody co 6 miesięcy").
    3.  Przy każdym sugerowanym zadaniu znajduje się przycisk "Dodaj", który importuje je na konto użytkownika.
    4.  Po dodaniu zadania użytkownik widzi komunikat potwierdzający.

### Uwierzytelnianie
-   ID: US-004
-   Tytuł: Logowanie do aplikacji
-   Opis: Jako zarejestrowany użytkownik, chcę móc zalogować się do aplikacji podając mój e-mail i hasło, aby uzyskać dostęp do moich zadań.
-   Kryteria akceptacji:
    1.  Formularz logowania zawiera pola na e-mail i hasło.
    2.  System waliduje poprawność podanych danych.
    3.  W przypadku błędnych danych wyświetlany jest komunikat "Nieprawidłowy e-mail lub hasło".
    4.  Użytkownik nie może się zalogować na niezweryfikowane konto.
    5.  Po pomyślnym zalogowaniu użytkownik jest przekierowywany na główny pulpit.

-   ID: US-005
-   Tytuł: Odzyskiwanie zapomnianego hasła
-   Opis: Jako użytkownik, który zapomniał hasła, chcę móc poprosić o link do jego zresetowania, abym mógł odzyskać dostęp do konta.
-   Kryteria akceptacji:
    1.  Na stronie logowania znajduje się link "Zapomniałem hasła".
    2.  Po kliknięciu użytkownik jest proszony o podanie swojego adresu e-mail.
    3.  Jeśli e-mail istnieje w bazie, system wysyła na niego wiadomość z unikalnym linkiem do resetu hasła.
    4.  Link jest ważny przez określony czas (np. 1 godzinę).
    5.  Po kliknięciu w link użytkownik jest przekierowywany do formularza zmiany hasła, gdzie podaje nowe hasło i je potwierdza.

-   ID: US-006
-   Tytuł: Wylogowywanie
-   Opis: Jako zalogowany użytkownik, chcę móc się wylogować z aplikacji, aby zabezpieczyć dostęp do mojego konta.
-   Kryteria akceptacji:
    1.  W interfejsie znajduje się widoczny przycisk "Wyloguj".
    2.  Po kliknięciu sesja użytkownika zostaje zakończona, a on sam jest przekierowany na stronę logowania.

### Zarządzanie Zadaniami
-   ID: US-007
-   Tytuł: Tworzenie nowego zadania
-   Opis: Jako użytkownik, chcę móc dodać nowe zadanie, podając jego nazwę, opis i harmonogram powtarzania, aby śledzić je w aplikacji.
-   Kryteria akceptacji:
    1.  Formularz dodawania zadania zawiera pola: Tytuł (wymagany), Opis (opcjonalny).
    2.  Formularz zawiera pola do ustawienia harmonogramu: liczba (np. 3) i jednostka (dni, tygodnie, miesiące, lata).
    3.  Formularz zawiera opcjonalny wybór dnia tygodnia, w którym zadanie ma być wykonane.
    4.  Po zapisaniu zadania jego pierwszy termin jest obliczany na podstawie daty utworzenia i zdefiniowanego interwału.
    5.  Po pomyślnym dodaniu użytkownik widzi komunikat potwierdzający.

-   ID: US-008
-   Tytuł: Przeglądanie listy wszystkich zadań
-   Opis: Jako użytkownik, chcę mieć dostęp do listy wszystkich moich zadań, abym mógł zobaczyć pełny obraz moich obowiązków.
-   Kryteria akceptacji:
    1.  Istnieje dedykowany widok z listą wszystkich zadań.
    2.  Każdy element na liście wyświetla tytuł zadania i datę następnego wykonania.
    3.  Lista jest domyślnie sortowana według daty następnego wykonania (od najwcześniejszej).
    4.  Użytkownik ma możliwość zmiany sortowania na alfabetyczne (po tytule).

-   ID: US-009
-   Tytuł: Edycja istniejącego zadania
-   Opis: Jako użytkownik, chcę móc edytować szczegóły zadania, takie jak tytuł, opis czy harmonogram, aby zaktualizować je w razie potrzeby.
-   Kryteria akceptacji:
    1.  Z poziomu listy zadań lub pulpitu można przejść do edycji danego zadania.
    2.  Formularz edycji jest wypełniony aktualnymi danymi zadania.
    3.  Użytkownik może zmienić wszystkie pola zadania.
    4.  Zmiana harmonogramu wpływa na wszystkie przyszłe wystąpienia zadania.

-   ID: US-010
-   Tytuł: Usuwanie zadania
-   Opis: Jako użytkownik, chcę móc trwale usunąć zadanie, którego już nie potrzebuję śledzić.
-   Kryteria akceptacji:
    1.  Przy każdym zadaniu znajduje się opcja jego usunięcia.
    2.  Przed usunięciem system wyświetla okno z prośbą o potwierdzenie operacji.
    3.  Po potwierdzeniu zadanie jest nieodwracalnie usuwane z bazy danych.

### Pulpit i Cykl Życia Zadania
-   ID: US-011
-   Tytuł: Widok pulpitu
-   Opis: Jako użytkownik, po zalogowaniu chcę zobaczyć przejrzysty pulpit z najważniejszymi informacjami: co jest zaległe i co nadchodzi, abym mógł szybko zorientować się w sytuacji.
-   Kryteria akceptacji:
    1.  Na górze pulpitu wyświetlana jest sekcja "Zaległe" (tylko jeśli istnieją takie zadania).
    2.  Poniżej wyświetlana jest sekcja "Nadchodzące (7 dni)".
    3.  Jeśli obie listy są puste, wyświetlany jest komunikat o najbliższym zadaniu w przyszłości.

-   ID: US-012
-   Tytuł: Oznaczanie zadania jako wykonane
-   Opis: Jako użytkownik, chcę móc oznaczyć zadanie jako "wykonane", aby zniknęło z listy zaległych/nadchodzących, a jego następny termin został automatycznie zaplanowany.
-   Kryteria akceptacji:
    1.  Przy każdym zadaniu na liście zaległych i nadchodzących znajduje się przycisk "Wykonaj".
    2.  Po kliknięciu przycisku data ostatniej akcji jest aktualizowana na bieżącą, a typ akcji na "wykonana".
    3.  Obliczana jest nowa data następnego wykonania.
    4.  Zadanie znika z bieżącego widoku pulpitu.

-   ID: US-013
-   Tytuł: Pomijanie zadania zaległego
-   Opis: Jako użytkownik, chcę móc "pominąć" zaległe zadanie, aby zresetować jego cykl i zaplanować kolejne wystąpienie bez oznaczania go jako wykonanego.
-   Kryteria akceptacji:
    1.  Przy każdym zadaniu na liście zaległych znajduje się przycisk "Pomiń".
    2.  Po kliknięciu przycisku data ostatniej akcji jest aktualizowana na bieżącą, a typ akcji na "pominięta".
    3.  Obliczana jest nowa data następnego wykonania.
    4.  Zadanie znika z listy zaległych.

### Pomoc i Zarządzanie Kontem
-   ID: US-014
-   Tytuł: Dostęp do strony pomocy
-   Opis: Jako użytkownik, chcę mieć dostęp do strony pomocy, aby znaleźć inspiracje i odpowiedzi na moje pytania.
-   Kryteria akceptacji:
    1.  W aplikacji znajduje się link do podstrony "Pomoc".
    2.  Strona pomocy zawiera listę sugerowanych zadań.
    3.  Strona pomocy zawiera sekcję FAQ z odpowiedziami na podstawowe pytania.

-   ID: US-015
-   Tytuł: Usuwanie własnego konta
-   Opis: Jako użytkownik, chcę mieć możliwość samodzielnego usunięcia mojego konta, aby mieć pełną kontrolę nad moimi danymi.
-   Kryteria akceptacji:
    1.  W ustawieniach konta znajduje się opcja "Usuń konto".
    2.  Przed usunięciem użytkownik musi potwierdzić operację, np. wpisując swoje hasło.
    3.  System wyświetla wyraźne ostrzeżenie, że operacja jest nieodwracalna.
    4.  Po potwierdzeniu wszystkie dane użytkownika są trwale usuwane z bazy danych.

## 6. Metryki sukcesu
### 6.1. Aktywacja
-   Cel: Użytkownicy rozumieją wartość produktu i aktywnie z niego korzystają.
-   Metryka: Procent nowo zarejestrowanych użytkowników, którzy stworzyli co najmniej 5 zadań w ciągu pierwszych 7 dni od rejestracji.
-   Cel do osiągnięcia: > 40%

### 6.2. Zaangażowanie
-   Cel: Użytkownicy regularnie wracają do aplikacji i zarządzają swoimi zadaniami.
-   Metryka: Stosunek liczby zadań oznaczonych jako "wykonane" lub "pominięte" do całkowitej liczby zadań, które stały się zaległe w danym okresie (np. miesięcznie).
-   Cel do osiągnięcia: > 70%

### 6.3. Retencja (do obserwacji)
-   Cel: Użytkownicy postrzegają aplikację jako wartościowe narzędzie i korzystają z niej w dłuższej perspektywie.
-   Metryka: Procent użytkowników, którzy wracają do aplikacji po 7 dniach (retencja krótkoterminowa) i po 30 dniach (retencja długoterminowa) od rejestracji.