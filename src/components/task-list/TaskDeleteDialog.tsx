import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TaskDTO } from "@/types";

interface TaskDeleteDialogProps {
  isOpen: boolean;
  task: TaskDTO | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

/**
 * TaskDeleteDialog component
 * Modal potwierdzenia usunięcia zadania
 */
export function TaskDeleteDialog({ isOpen, task, isDeleting, onClose, onConfirm }: TaskDeleteDialogProps) {
  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch (error) {
      // Błąd zostanie obsłużony przez toast w głównym komponencie
      console.error("Error deleting task:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Usuń zadanie</DialogTitle>
          <DialogDescription>
            Czy na pewno chcesz usunąć zadanie &ldquo;{task?.title}&rdquo;? Ta operacja jest nieodwracalna.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isDeleting}>
            Anuluj
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Usuwanie...
              </>
            ) : (
              "Usuń zadanie"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
