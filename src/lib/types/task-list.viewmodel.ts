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
