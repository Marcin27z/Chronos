import { Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatInterval, getDayOfWeekLabel } from "@/lib/utils/date-format.utils";
import type { TaskDTO } from "@/types";

interface TaskListCardProps {
  task: TaskDTO;
  onDelete: (task: TaskDTO) => void;
}

/**
 * TaskListCard component
 * Karta pojedynczego zadania z informacjami i akcją usunięcia
 */
export function TaskListCard({ task, onDelete }: TaskListCardProps) {
  return (
    <div className="border rounded-lg p-6 hover:border-primary transition-colors group" data-testid="task-card">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold" data-testid="task-card-title">
          {task.title}
        </h3>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(task)}
            aria-label="Usuń zadanie"
            data-testid="task-delete"
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {task.description && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2" data-testid="task-card-description">
          {task.description}
        </p>
      )}

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Następne wykonanie:</span>
          <span className="font-medium" data-testid="task-card-next-due">
            {formatDate(task.next_due_date)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Interwał:</span>
          <span className="font-medium" data-testid="task-card-interval">
            {formatInterval(task.interval_value, task.interval_unit)}
          </span>
        </div>

        {task.preferred_day_of_week !== null && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Preferowany dzień:</span>
            <span className="font-medium" data-testid="task-card-preferred-day">
              {getDayOfWeekLabel(task.preferred_day_of_week)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
