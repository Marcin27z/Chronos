import type { DashboardDTO, TaskDTO, ErrorDTO } from "../../types";

/**
 * Opcje zapytania API
 */
export interface ApiRequestOptions {
  /** Token autoryzacji */
  token: string;
  /** Sygnał do przerwania zapytania */
  signal?: AbortSignal;
}

/**
 * Response wrapper z metadanymi
 */
export interface ApiResponse<T> {
  /** Dane odpowiedzi */
  data: T | null;
  /** Błąd jeśli wystąpił */
  error: ErrorDTO | null;
  /** Status HTTP */
  status: number;
}

/**
 * Pobiera dane dashboard
 * @param token - Token autoryzacji
 * @param signal - Opcjonalny signal do przerwania zapytania
 * @returns DashboardDTO lub ErrorDTO
 */
export async function getDashboard(token: string, signal?: AbortSignal): Promise<ApiResponse<DashboardDTO>> {
  try {
    const response = await fetch("/api/tasks/dashboard", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal,
    });

    if (!response.ok) {
      const error: ErrorDTO = await response.json();
      return { data: null, error, status: response.status };
    }

    const data: DashboardDTO = await response.json();
    return { data, error: null, status: response.status };
  } catch (error) {
    // Sprawdzenie czy to błąd abort
    if (error instanceof Error && error.name === "AbortError") {
      return {
        data: null,
        error: {
          error: "Request aborted",
          details: "Zapytanie zostało anulowane",
        },
        status: 0,
      };
    }

    return {
      data: null,
      error: {
        error: "Network error",
        details: "Nie udało się połączyć z serwerem",
      },
      status: 0,
    };
  }
}

/**
 * Oznacza zadanie jako wykonane
 * @param taskId - ID zadania
 * @param token - Token autoryzacji
 * @param signal - Opcjonalny signal do przerwania zapytania
 * @returns TaskDTO lub ErrorDTO
 */
export async function completeTask(taskId: string, token: string, signal?: AbortSignal): Promise<ApiResponse<TaskDTO>> {
  try {
    const response = await fetch(`/api/tasks/${taskId}/complete`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal,
    });

    if (!response.ok) {
      const error: ErrorDTO = await response.json();
      return { data: null, error, status: response.status };
    }

    const data: TaskDTO = await response.json();
    return { data, error: null, status: response.status };
  } catch (error) {
    // Sprawdzenie czy to błąd abort
    if (error instanceof Error && error.name === "AbortError") {
      return {
        data: null,
        error: {
          error: "Request aborted",
          details: "Zapytanie zostało anulowane",
        },
        status: 0,
      };
    }

    return {
      data: null,
      error: {
        error: "Network error",
        details: "Nie udało się oznaczyć zadania jako wykonane",
      },
      status: 0,
    };
  }
}

/**
 * Pomija zadanie
 * @param taskId - ID zadania
 * @param token - Token autoryzacji
 * @param signal - Opcjonalny signal do przerwania zapytania
 * @returns TaskDTO lub ErrorDTO
 */
export async function skipTask(taskId: string, token: string, signal?: AbortSignal): Promise<ApiResponse<TaskDTO>> {
  try {
    const response = await fetch(`/api/tasks/${taskId}/skip`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal,
    });

    if (!response.ok) {
      const error: ErrorDTO = await response.json();
      return { data: null, error, status: response.status };
    }

    const data: TaskDTO = await response.json();
    return { data, error: null, status: response.status };
  } catch (error) {
    // Sprawdzenie czy to błąd abort
    if (error instanceof Error && error.name === "AbortError") {
      return {
        data: null,
        error: {
          error: "Request aborted",
          details: "Zapytanie zostało anulowane",
        },
        status: 0,
      };
    }

    return {
      data: null,
      error: {
        error: "Network error",
        details: "Nie udało się pominąć zadania",
      },
      status: 0,
    };
  }
}
