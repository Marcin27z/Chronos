import type {
  CreateTaskCommand,
  UpdateTaskCommand,
  TaskListDTO,
  TaskDTO,
  ErrorDTO,
  ValidationErrorDTO,
  CalculateNextDueDateCommand,
  NextDueDateResponseDTO,
} from "../../types";

/**
 * Pobiera listę zadań użytkownika z sortowaniem i paginacją
 */
export async function getTasks(token: string, sort = "next_due_date", limit = 50, offset = 0): Promise<TaskListDTO> {
  const params = new URLSearchParams({
    sort,
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await fetch(`/api/tasks?${params}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw error as ErrorDTO;
  }

  return response.json();
}

/**
 * Pobiera pojedyncze zadanie po ID
 */
export async function getTask(taskId: string): Promise<TaskDTO> {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw error as ErrorDTO;
  }

  return response.json();
}

/**
 * Usuwa zadanie
 */
export async function deleteTask(taskId: string, token: string): Promise<void> {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw error as ErrorDTO;
  }
}

export interface TaskApiError {
  status: number;
  payload: ErrorDTO | ValidationErrorDTO;
}

export async function createTask(token: string, command: CreateTaskCommand): Promise<TaskDTO> {
  const response = await fetch("/api/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const payload = (await response.json()) as ErrorDTO | ValidationErrorDTO;
    throw {
      status: response.status,
      payload,
    } satisfies TaskApiError;
  }

  return response.json();
}

/**
 * Aktualizuje istniejące zadanie
 */
export async function updateTask(taskId: string, token: string, command: UpdateTaskCommand): Promise<TaskDTO> {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const payload = (await response.json()) as ErrorDTO | ValidationErrorDTO;
    throw {
      status: response.status,
      payload,
    } satisfies TaskApiError;
  }

  return response.json();
}

/**
 * Oblicza następną datę wykonania zadania na podstawie interwału i preferowanego dnia tygodnia
 * Endpoint użytkowy (utility) do podglądu daty w czasie rzeczywistym podczas tworzenia/edycji zadań
 */
export async function calculateNextDueDate(
  token: string,
  command: CalculateNextDueDateCommand
): Promise<NextDueDateResponseDTO> {
  const response = await fetch("/api/tasks/calculate-next-due-date", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const payload = (await response.json()) as ErrorDTO | ValidationErrorDTO;
    throw {
      status: response.status,
      payload,
    } satisfies TaskApiError;
  }

  return response.json();
}
