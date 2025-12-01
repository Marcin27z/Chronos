# Plan implementacji widoku Nawigacja

## 1. Przegląd
Widok nawigacji dostarcza globalny pasek (desktop i mobilny) dla wszystkich użytkowników zalogowanych: logo kierujące na dashboard, główna nawigacja (Dashboard, Zadania, Pomoc), menu użytkownika (Profil, Ustawienia, Wyloguj) oraz breadcrumby i guardy dla głębokich ścieżek i formularzy.

## 2. Routing widoku
Nawigacja jest widoczna na wszystkich chronionych stronach: `/`, `/tasks`, `/tasks/[id]/edit`, `/tasks/new`, `/help`, `/profile`, `/settings` (future), a także wszędzie tam, gdzie działa AppLayout.

## 2a. Modyfikacja istniejących widoków
- Zaktualizować `AppLayout` (lub odpowiedni layout w `src/layouts`) tak, by renderował `Navbar` nad `Slot`em; zapewnić, że `Navbar` otrzymuje `navItems`, `breadcrumbs` i `userProfile`.
- Dodać `Breadcrumbs` oraz `BackButtonGuard` do stron formularzy (`/tasks/new`, `/tasks/[id]/edit`) oraz dashboardu, tak aby nawigacja była widoczna i chroniła przed utratą danych.
- Upewnić się, że komponenty takich widoków jak `tasks.astro`, `DashboardView` i `HelpPage` nie renderują dodatkowych topbarów i delegują tę rolę do nowej nawigacji.
- Przegląd istniejących layoutów oraz ewentualne refaktory (np. `BaseLayout`, `ProtectedLayout`) w celu zapewnienia spójnego contextu (user/session) i integracji `useNavbarState`.
- Dostosować style `body`/`main` w `src/styles` (jeśli istnieją) tak, by uwzględniały wysokość navbaru i marginesy dla zawartości.

## 3. Struktura komponentów
- `AppLayout`
  - zawiera `Navbar` i rendery aktualnej strony
- `Navbar`
  - `LogoLink`, `DesktopNavItems`, `Breadcrumbs`, `UserMenu`, `MobileMenuTrigger`
- `NavItem`
  - prezentuje pojedynczy link (label, ikona, aktywny stan)
- `UserMenu`
  - awatar, dropdown z opcjami Profile, Settings, Logout
- `MobileMenu`
  - rozwijany panel z listą `NavItem` oraz opcjami użytkownika
- `Breadcrumbs`
  - ścieżka oparta o router (np. Dashboard > Zadania)
- `BackButtonGuard`
  - wykrywa niezapisane zmiany formularzy i blokuje przejście bez potwierdzenia

## 4. Szczegóły komponentów
### Navbar
- Opis: Top bar łączący logo, główną nawigację, breadcrumb i dostęp do menu użytkownika; działa responsywnie.
- Główne elementy: `LogoLink`, `DesktopNavItems`, `Breadcrumbs`, `UserMenu`, `MobileMenuTrigger`.
- Obsługiwane interakcje: kliknięcie logo (link `/`), kliknięcie `NavItem` (nawigacja w ramach Astro), otwarcie menu użytkownika, toggle mobilnego menu.
- Obsługiwana walidacja: brak, ale wymaga stanu `activePath` i `isUserMenuOpen` z `useNavbarState`.
- Typy: `NavItemDTO`, `UserProfileVM`, `BreadcrumbEntry`.
- Propsy: `navItems: NavItemDTO[]`, `breadcrumbs: BreadcrumbEntry[]`, `userProfile: UserProfileVM`, `onLogout: () => Promise<void>`.

### NavItem
- Opis: pojedynczy link nawigacyjny z flagą aktywności.
- Główne elementy: `button`/`Link`, opcjonalna ikona, tekst etykiety.
- Obsługiwane interakcje: `onClick` wywołujące `navigate`.
- Obsługiwana walidacja: active state (match ścieżki i query), optional `visible`.
- Typy: `NavItemDTO`.
- Propsy: `item: NavItemDTO`, `isActive: boolean`, `onNavigate: (href: string) => void`.

### UserMenu
- Opis: dropdown z awatarem i opcjami Profile, Settings, Logout.
- Główne elementy: `AvatarButton`, `DropdownMenu`, `MenuItems`.
- Obsługiwane interakcje: otwarcie dropdownu, kliknięcie pozycji (link/akcja), wywołanie logoutu.
- Obsługiwana walidacja: `userProfile` musi być obecny lub zastępczy placeholder; `Logout` wymaga potwierdzenia przebiegu akcji i obsługi błędów.
- Typy: `UserProfileVM`, `UserMenuOptionVM`.
- Propsy: `profile: UserProfileVM | null`, `options: UserMenuOptionVM[]`.

### MobileMenu
- Opis: pełnoekranowy modal/slideout uruchamiany przez hamburger; zawiera `NavItem` i opcje użytkownika w kolumnie.
- Główne elementy: `Dialog/Sheet` z `NavItem` listą; linki użytkownika na dole.
- Obsługiwane interakcje: togglowanie via `Hamburger`, zamykanie, kliknięcia (przejście + zamknięcie).
- Obsługiwana walidacja: `isMobileMenuOpen` synchronizowane z `useNavbarState`.
- Typy: `NavItemDTO`, `UserMenuOptionVM`.
- Propsy: `items`, `userOptions`, `isOpen`, `onClose`, `navigate`.

### Breadcrumbs
- Opis: pokazuje ścieżkę powrotu dla podstron np. edycji zadań.
- Główne elementy: lista `BreadcrumbEntry`, styl active/current.
- Obsługiwane interakcje: klikalne elementy (z wyjątkiem aktualnego).
- Obsługiwana walidacja: fallback `label`, `href`.
- Typy: `BreadcrumbEntry`.
- Propsy: `entries: BreadcrumbEntry[]`.

### BackButtonGuard
- Opis: hook/komponent wykrywający niezapisane zmiany i blokujący zmianę trasy przed potwierdzeniem.
- Główne elementy: modal dialog `Tak/Nie`.
- Obsługiwane interakcje: `onAttemptNavigate`, `onConfirm`, `onCancel`.
- Obsługiwana walidacja: `hasUnsavedChanges`.
- Typy: `FormGuardViewModel`.
- Propsy: `hasChanges: boolean`, `message?: string`, `onConfirm: () => void`, `onCancel: () => void`.

## 5. Typy
- `NavItemDTO`: `{ label: string; href: string; icon?: ReactNode; visible?: boolean; query?: Record<string,string>; }`
- `UserMenuOptionVM`: `{ label: string; href?: string; action?: () => Promise<void> | void; disabled?: boolean; icon?: ReactNode; type: "link" | "action"; }`
- `BreadcrumbEntry`: `{ label: string; href?: string; isCurrent?: boolean; }`
- `UserProfileVM`: `{ id: string; name: string; email: string; avatarUrl?: string; role?: string; }`
- `NavbarState`: `{ activePath: string; isMobileMenuOpen: boolean; isUserMenuOpen: boolean; }`
- `FormGuardViewModel`: `{ hasUnsavedChanges: boolean; warningMessage: string; lastAttemptedLocation?: string; }`
- `NavContextValue`: `{ navItems: NavItemDTO[]; breadcrumbs: BreadcrumbEntry[]; activeItem?: NavItemDTO; }`
- `MobileMenuState`: `{ isOpen: boolean; pendingNav?: string; }`
- `BreadcrumbsMap`: `Record<string, BreadcrumbEntry[]>` mappuje ścieżki do predefiniowanych ścieżek.

## 6. Zarządzanie stanem
- Używamy `useNavbarState` (custom hook) do śledzenia `activePath`, otwartych menu, oraz `breadcrumbs` opartych na `useLocation`.
- `useResponsiveNav` monitoruje breakpointy (np. `min-width: 768px`) i na jego podstawie ukrywa mobilne menu.
- `useUserProfile` ładuje dane z `/api/user`, utrzymuje `loading`, `error`, `data`.
- `useUnsavedChangesGuard` rejestruje listener `beforeunload`, blokuje `navigate` jeśli `hasUnsavedChanges`.
- `NavbarContext` udostępnia `navItems` i `setActivePath`, aby `NavItem` wiedział, kiedy być aktywnym.

## 7. Integracja API
- `GET /api/user`: ładowany na layoutzie; dostarcza `UserProfileVM` do `UserMenu`.
- `POST /api/logout`: wywoływany w `UserMenu`/`LogoutButton`, po sukcesie `navigate('/login')`.
- W przyszłości `GET /api/navigation` może dostarczyć dynamiczne `navItems`.
- `GET /api/tasks?sort=...&page=...` informuje `NavbarState` o obecnym sortowaniu do podświetlenia query (opcjonalna logika `NavItemDTO.query`).

## 8. Interakcje użytkownika
- Kliknięcie logo: `navigate('/')`.
- Wybór `NavItem`: aktualizacja `activePath`, `closeMobileMenu`, `navigate(href)`.
- Rozwinięcie `UserMenu`: `toggle`, animacja, focus trap.
- Logout: `POST`, loading state, toast sukces, redirect.
- Hamburger: toggle `MobileMenu`, zamknięcie przy kliknięciu linku.
- Breadcrumb click: nawigacja (bez przeładowania) do wskazanej warstwy.
- Próbując opuścić formularz z niezapisanymi zmianami: modal `BackButtonGuard`.

## 9. Warunki i walidacja
- Aktywny element: porównanie `activePath` z `href` (uwzględnić dynamiczne segmenty, np. `/tasks/123/edit` traktowane jako `/tasks/[id]/edit`).
- `UserProfileVM` musi być dostępny; w błędzie wyświetlić placeholder.
- `Logout` nie może być wywołany wielokrotnie w trakcie próby – disable button.
- `MobileMenu` powinien zamknąć się po każdym wyborze linku.
- Breadcrumby muszą zawierać `label`; w przeciwnym razie fallback `tłumacz(labelKey)`.
- Tryb mobilny wymusza stack nav items i menu opcji.

## 10. Obsługa błędów
- `GET /api/user` fail: pokaż `AvatarPlaceholder`, tooltip „Problem z połączeniem” i opcję ponownego ładowania.
- `POST /api/logout` fail: toast `Nie udało się zakończyć sesji`, przycisk retry, nie redirectuj.
- `NavItem` fail w `navigate`: fallback `window.location.href`.
- `BackButtonGuard`: w przypadku błędu w potwierdzeniu nie pozwala zamknąć bez zgody, loguje do Sentry.
- `Breadcrumbs` bez zdefiniowanej ścieżki: default `Dashboard`.

## 11. Kroki implementacji
1. Stworzyć `NavItemDTO`, `UserMenuOptionVM`, `BreadcrumbEntry`, `NavbarState` w `src/types.ts`.
2. Zaprojektować `useNavbarState`, `useResponsiveNav` i `useUnsavedChangesGuard`.
3. Zbudować `Navbar` z `LogoLink`, `DesktopNavItems`, `Breadcrumbs`, `UserMenu`.
4. Zaadaptować `MobileMenu`/`MobileMenuTrigger` z obsługą Shadcn `Sheet/Dialog`.
5. Wdrożyć `UserMenu` z `Avatar`, opcjami i `LogoutButton` (`POST /api/logout`).
6. Dodać `Breadcrumbs` i `BackButtonGuard` do layoutu stron z formularzami (`/tasks/new`, `/tasks/[id]/edit`).
7. Zintegrować `useUserProfile` ładowane w layoutzie i przekazać dane do `UserMenu`.
8. Dopasować responsywność Tailwind (breakpointy, spacing) i dodać state `isMobileMenuOpen`.
9. Dodać testy wizualne/manualne: aktywny stan, breadcrumbs, guard przed nawigacją.
10. Zalogować lintery i przeprowadzić testy ręczne (nawigacja desktop/mobile, logout).

