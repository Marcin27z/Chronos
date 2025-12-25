import { useState, useCallback } from "react";
import { deleteTask } from "@/lib/api/tasks.api";
import type { ErrorDTO } from "@/types";

interface UseTaskDeleteOptions {
  taskId: string;
  token: string;
  onSuccess?: () => void;
}

export function useTaskDelete(options: UseTaskDeleteOptions) {
  const { taskId, token, onSuccess } = options;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>(undefined);

  const openDeleteDialog = useCallback(() => {
    setIsDialogOpen(true);
    setDeleteError(undefined);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setIsDialogOpen(false);
    setDeleteError(undefined);
  }, []);

  const confirmDelete = useCallback(async () => {
    setIsDeleting(true);
    setDeleteError(undefined);

    try {
      await deleteTask(taskId, token);
      setIsDialogOpen(false);
      onSuccess?.();
    } catch (error) {
      const errorData = error as ErrorDTO;
      setDeleteError(errorData.error ?? "Nie udało się usunąć zadania. Spróbuj ponownie.");
    } finally {
      setIsDeleting(false);
    }
  }, [taskId, token, onSuccess]);

  return {
    isDialogOpen,
    isDeleting,
    deleteError,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
  };
}

