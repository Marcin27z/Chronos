import type { TaskListDTO, TaskDTO, ErrorDTO } from "../../types";

/**
 * Pobiera listę zadań użytkownika z sortowaniem i paginacją
 */
export async function getTasks(sort = "next_due_date", limit = 50, offset = 0): Promise<TaskListDTO> {
  const params = new URLSearchParams({
    sort,
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await fetch(`/api/tasks?${params}`, {
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
export async function deleteTask(taskId: string): Promise<void> {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw error as ErrorDTO;
  }
}
