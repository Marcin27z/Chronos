import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  taskTitle: string;
  isDeleting: boolean;
  deleteError?: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function DeleteConfirmationDialog({
  isOpen,
  taskTitle,
  isDeleting,
  deleteError,
  onConfirm,
  onCancel,
}: DeleteConfirmationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isDeleting && onCancel()}>
      <DialogContent data-testid="delete-confirmation-dialog">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
            <DialogTitle>Potwierdź usunięcie</DialogTitle>
          </div>
          <DialogDescription className="space-y-2 pt-2">
            <p>
              Czy na pewno chcesz usunąć zadanie{" "}
              <span className="font-semibold text-foreground">&quot;{taskTitle}&quot;</span>?
            </p>
            <p className="text-destructive">Ta operacja jest nieodwracalna.</p>
          </DialogDescription>
        </DialogHeader>

        {deleteError && (
          <div
            className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            {deleteError}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel} disabled={isDeleting} data-testid="cancel-delete-button">
            Anuluj
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting} data-testid="confirm-delete-button">
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Usuwanie...
              </>
            ) : (
              "Usuń"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
