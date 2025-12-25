import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteTaskSectionProps {
  taskId: string;
  taskTitle: string;
  onDeleteClick: () => void;
}

export function DeleteTaskSection({ taskTitle, onDeleteClick }: DeleteTaskSectionProps) {
  return (
    <section
      className="rounded-lg border-2 border-destructive/50 bg-destructive/5 p-6"
      aria-labelledby="delete-task-heading"
      data-testid="delete-task-section"
    >
      <div className="space-y-4">
        <div>
          <h3 id="delete-task-heading" className="text-lg font-semibold text-destructive">
            Strefa niebezpieczna
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Usunięcie zadania jest <span className="font-semibold">nieodwracalne</span>. Wszystkie dane zadania zostaną
            zostaną trwale utracone.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-md border border-destructive/30 bg-background/50 p-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Usuń to zadanie</p>
            <p className="text-xs text-muted-foreground">
              Zadanie: <span className="font-medium">{taskTitle}</span>
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={onDeleteClick}
            className="shrink-0"
            data-testid="delete-task-button"
            aria-label={`Usuń zadanie: ${taskTitle}`}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Usuń zadanie
          </Button>
        </div>
      </div>
    </section>
  );
}
