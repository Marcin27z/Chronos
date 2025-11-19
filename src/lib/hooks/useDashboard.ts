import { useState, useEffect, useCallback } from "react";
import type { DashboardDTO, ErrorDTO } from "../../types";
import type { DashboardState, TaskActionResult } from "../types/dashboard.viewmodel";
import { getDashboard, completeTask as completeTaskApi, skipTask as skipTaskApi } from "../api/dashboard.api";

/**
 * Custom hook zarządzający stanem widoku Dashboard
 *
 * Odpowiada za:
 * - Pobieranie danych dashboard z API
 * - Wykonywanie akcji na zadaniach (complete/skip)
 * - Optymistyczne aktualizacje UI z rollback przy błędach
 * - Zarządzanie stanami loading/error/processing
 */

interface UseDashboardReturn {
  // Stan
  data: DashboardDTO | null;
  isLoading: boolean;
  error: ErrorDTO | null;
  processingTasks: Set<string>;

  // Akcje
  completeTask: (taskId: string) => Promise<TaskActionResult>;
  skipTask: (taskId: string) => Promise<TaskActionResult>;
  refetch: () => Promise<void>;
}

interface UseDashboardProps {
  token: string;
}

export function useDashboard({ token }: UseDashboardProps): UseDashboardReturn {
  // ============================================================================
  // Stan
  // ============================================================================

  // Główny stan Dashboard
  const [state, setState] = useState<DashboardState>({
    data: null,
    isLoading: true,
    error: null,
  });

  // Set ID-ów zadań będących w trakcie przetwarzania
  const [processingTasks, setProcessingTasks] = useState<Set<string>>(new Set());

  // ============================================================================
  // Funkcje pomocnicze
  // ============================================================================

  /**
   * Usuwa zadanie z odpowiedniej listy (overdue lub upcoming)
   */
  const removeTaskFromData = useCallback((taskId: string, currentData: DashboardDTO): DashboardDTO => {
    return {
      ...currentData,
      overdue: currentData.overdue.filter((task) => task.id !== taskId),
      upcoming: currentData.upcoming.filter((task) => task.id !== taskId),
      summary: {
        ...currentData.summary,
        total_overdue: currentData.overdue.filter((task) => task.id !== taskId).length,
        total_upcoming: currentData.upcoming.filter((task) => task.id !== taskId).length,
      },
    };
  }, []);

  /**
   * Przywraca zadanie do odpowiedniej listy (rollback)
   */
  const restoreTaskToData = useCallback((taskId: string, originalData: DashboardDTO): DashboardDTO => {
    // Po prostu zwracamy oryginalne dane
    return originalData;
  }, []);

  // ============================================================================
  // Pobieranie danych Dashboard
  // ============================================================================

  /**
   * Pobiera dane dashboard z API
   */
  const fetchDashboard = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await getDashboard(token, controller.signal);

      clearTimeout(timeoutId);

      if (response.error) {
        // Obsługa błędu 401 - przekierowanie do loginu
        if (response.status === 401) {
          setTimeout(() => window.location.replace("/login"), 0);
          return;
        }

        setState({
          data: null,
          isLoading: false,
          error: response.error,
        });
        return;
      }

      setState({
        data: response.data,
        isLoading: false,
        error: null,
      });
    } catch {
      clearTimeout(timeoutId);
      setState({
        data: null,
        isLoading: false,
        error: {
          error: "Unexpected error",
          details: "Wystąpił nieoczekiwany błąd podczas ładowania danych",
        },
      });
    }
  }, [token]);

  // ============================================================================
  // Akcja: Complete Task
  // ============================================================================

  /**
   * Oznacza zadanie jako wykonane z optymistyczną aktualizacją
   */
  const completeTask = useCallback(
    async (taskId: string): Promise<TaskActionResult> => {
      // Walidacja - czy mamy dane
      if (!state.data) {
        return {
          success: false,
          error: {
            error: "No data",
            details: "Brak danych do aktualizacji",
          },
        };
      }

      // Zapisz oryginalne dane dla rollback
      const originalData = state.data;

      // 1. Dodaj taskId do processingTasks
      setProcessingTasks((prev) => new Set(prev).add(taskId));

      // 2. Optymistycznie usuń zadanie z listy
      setState((prev) => ({
        ...prev,
        data: prev.data ? removeTaskFromData(taskId, prev.data) : null,
      }));

      // 3. Wywołaj API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await completeTaskApi(taskId, token, controller.signal);

        clearTimeout(timeoutId);

        // 4a. Obsługa błędów
        if (response.error) {
          // Rollback - przywróć zadanie
          setState((prev) => ({
            ...prev,
            data: restoreTaskToData(taskId, originalData),
          }));

          setProcessingTasks((prev) => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
          });

          // Obsługa błędu 401
          if (response.status === 401) {
            setTimeout(() => window.location.replace("/login"), 0);
          }

          return {
            success: false,
            error: response.error,
          };
        }

        // 4b. Sukces - usuń z processingTasks i refetch dla pewności
        setProcessingTasks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });

        // Refetch danych dla zapewnienia spójności
        await fetchDashboard();

        return {
          success: true,
        };
      } catch {
        clearTimeout(timeoutId);

        // Rollback przy nieoczekiwanym błędzie
        setState((prev) => ({
          ...prev,
          data: restoreTaskToData(taskId, originalData),
        }));

        setProcessingTasks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });

        return {
          success: false,
          error: {
            error: "Unexpected error",
            details: "Wystąpił nieoczekiwany błąd",
          },
        };
      }
    },
    [state.data, token, removeTaskFromData, restoreTaskToData, fetchDashboard]
  );

  // ============================================================================
  // Akcja: Skip Task
  // ============================================================================

  /**
   * Pomija zadanie z optymistyczną aktualizacją
   */
  const skipTask = useCallback(
    async (taskId: string): Promise<TaskActionResult> => {
      // Walidacja - czy mamy dane
      if (!state.data) {
        return {
          success: false,
          error: {
            error: "No data",
            details: "Brak danych do aktualizacji",
          },
        };
      }

      // Zapisz oryginalne dane dla rollback
      const originalData = state.data;

      // 1. Dodaj taskId do processingTasks
      setProcessingTasks((prev) => new Set(prev).add(taskId));

      // 2. Optymistycznie usuń zadanie z listy
      setState((prev) => ({
        ...prev,
        data: prev.data ? removeTaskFromData(taskId, prev.data) : null,
      }));

      // 3. Wywołaj API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await skipTaskApi(taskId, token, controller.signal);

        clearTimeout(timeoutId);

        // 4a. Obsługa błędów
        if (response.error) {
          // Rollback - przywróć zadanie
          setState((prev) => ({
            ...prev,
            data: restoreTaskToData(taskId, originalData),
          }));

          setProcessingTasks((prev) => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
          });

          // Obsługa błędu 401
          if (response.status === 401) {
            setTimeout(() => window.location.replace("/login"), 0);
          }

          return {
            success: false,
            error: response.error,
          };
        }

        // 4b. Sukces - usuń z processingTasks i refetch dla pewności
        setProcessingTasks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });

        // Refetch danych dla zapewnienia spójności
        await fetchDashboard();

        return {
          success: true,
        };
      } catch {
        clearTimeout(timeoutId);

        // Rollback przy nieoczekiwanym błędzie
        setState((prev) => ({
          ...prev,
          data: restoreTaskToData(taskId, originalData),
        }));

        setProcessingTasks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });

        return {
          success: false,
          error: {
            error: "Unexpected error",
            details: "Wystąpił nieoczekiwany błąd",
          },
        };
      }
    },
    [state.data, token, removeTaskFromData, restoreTaskToData, fetchDashboard]
  );

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * Inicjalne pobranie danych przy montowaniu komponentu
   */
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    data: state.data,
    isLoading: state.isLoading,
    error: state.error,
    processingTasks,
    completeTask,
    skipTask,
    refetch: fetchDashboard,
  };
}
