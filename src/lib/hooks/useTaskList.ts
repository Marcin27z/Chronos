import { useState, useEffect, useCallback } from "react";
import type { TaskListState, DeleteDialogState, SortConfig } from "../types/task-list.viewmodel";
import type { TaskDTO, ErrorDTO } from "../../types";
import { getTasks, deleteTask } from "../api/tasks.api";

/**
 * Custom hook do zarządzania stanem widoku listy zadań
 * Obsługuje sortowanie, paginację i usuwanie zadań
 */
export function useTaskList(token: string) {
  // ==================== STATE ====================

  const [state, setState] = useState<TaskListState>({
    data: null,
    isLoading: true,
    error: null,
    sortConfig: {
      field: "next_due_date",
      direction: "asc",
    },
    currentPage: 1,
  });

  const [deleteState, setDeleteState] = useState<DeleteDialogState>({
    isOpen: false,
    task: null,
    isDeleting: false,
  });

  // ==================== DATA FETCHING ====================

  const fetchTasks = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const { field, direction } = state.sortConfig;
      const sortParam = `${direction === "desc" ? "-" : ""}${field}`;
      const offset = (state.currentPage - 1) * 50;

      const data = await getTasks(token, sortParam, 50, offset);

      setState((prev) => ({
        ...prev,
        data,
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error as ErrorDTO,
        isLoading: false,
      }));
    }
  }, [state.sortConfig, state.currentPage, token]);

  // Fetch data on mount and when sort/page changes
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // ==================== ACTIONS ====================

  /**
   * Zmienia sortowanie listy
   * Jeśli to samo pole - przełącza kierunek, jeśli nowe - ustawia asc
   */
  const handleSortChange = useCallback((field: SortConfig["field"], direction: SortConfig["direction"]) => {
    setState((prev) => ({
      ...prev,
      sortConfig: { field, direction },
      currentPage: 1, // Reset to first page
    }));
  }, []);

  /**
   * Zmienia aktualną stronę
   */
  const handlePageChange = useCallback((page: number) => {
    setState((prev) => ({ ...prev, currentPage: page }));
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /**
   * Otwiera dialog potwierdzenia usunięcia
   */
  const handleDeleteClick = useCallback((task: TaskDTO) => {
    setDeleteState({
      isOpen: true,
      task,
      isDeleting: false,
    });
  }, []);

  /**
   * Zamyka dialog usuwania
   */
  const handleDeleteClose = useCallback(() => {
    setDeleteState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  /**
   * Potwierdza i wykonuje usunięcie zadania
   */
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteState.task) return;

    setDeleteState((prev) => ({ ...prev, isDeleting: true }));

    try {
      await deleteTask(deleteState.task.id, token);
      setDeleteState({ isOpen: false, task: null, isDeleting: false });

      // Jeśli usunęliśmy ostatnie zadanie na stronie > 1, cofnij się
      if (state.data?.data.length === 1 && state.currentPage > 1) {
        setState((prev) => ({ ...prev, currentPage: prev.currentPage - 1 }));
      } else {
        await fetchTasks(); // Refresh list
      }
    } catch (error) {
      setDeleteState((prev) => ({ ...prev, isDeleting: false }));
      // Błąd będzie obsłużony przez error state w komponencie
      throw error;
    }
  }, [deleteState.task, state.data?.data.length, state.currentPage, fetchTasks, token]);

  /**
   * Ponawia próbę pobrania danych po błędzie
   */
  const handleRetry = useCallback(() => {
    fetchTasks();
  }, [fetchTasks]);

  // ==================== RETURN ====================

  return {
    // State
    state,
    deleteState,

    // Actions
    actions: {
      handleSortChange,
      handlePageChange,
      handleDeleteClick,
      handleDeleteClose,
      handleDeleteConfirm,
      handleRetry,
    },
  };
}
