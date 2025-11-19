import type { DashboardDTO, ErrorDTO } from "../../types";

/**
 * Stan widoku Dashboard
 */
export interface DashboardState {
  /** Dane dashboard lub null jeśli nie załadowane */
  data: DashboardDTO | null;
  /** Flaga ładowania początkowego */
  isLoading: boolean;
  /** Błąd jeśli wystąpił */
  error: ErrorDTO | null;
}

/**
 * Wariant karty zadania
 */
export type TaskCardVariant = "overdue" | "upcoming";

/**
 * Typ akcji na zadaniu
 */
export type TaskActionType = "complete" | "skip";

/**
 * Stan akcji na zadaniu (dla optymistycznych aktualizacji)
 */
export interface TaskActionState {
  /** ID zadania */
  taskId: string;
  /** Typ akcji */
  action: TaskActionType;
  /** Czy akcja jest w trakcie przetwarzania */
  isProcessing: boolean;
}

/**
 * Wynik akcji na zadaniu
 */
export interface TaskActionResult {
  /** Czy akcja zakończyła się sukcesem */
  success: boolean;
  /** Błąd jeśli wystąpił */
  error?: ErrorDTO;
}

/**
 * Konfiguracja dla optymistycznych aktualizacji
 */
export interface OptimisticUpdateConfig {
  /** Czy włączyć optymistyczne aktualizacje */
  enabled: boolean;
  /** Timeout dla rollback (ms) */
  rollbackTimeout: number;
}
