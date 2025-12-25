import { CheckCircle, XCircle, Calendar } from "lucide-react";
import type { TaskHistoryVM } from "@/types";

interface TaskHistoryProps {
  history: TaskHistoryVM;
}

export function TaskHistory({ history }: TaskHistoryProps) {
  const hasHistory = history.lastActionDate && history.lastActionType;

  return (
    <section className="rounded-lg border border-border bg-muted/30 p-4" aria-labelledby="task-history-heading">
      <h3 id="task-history-heading" className="mb-3 text-sm font-semibold text-foreground">
        Historia akcji
      </h3>

      {hasHistory ? (
        <div className="flex items-center gap-3 text-sm">
          {history.lastActionType === "completed" ? (
            <CheckCircle className="h-5 w-5 shrink-0 text-green-600 dark:text-green-500" aria-hidden="true" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0 text-orange-600 dark:text-orange-500" aria-hidden="true" />
          )}
          <span className="text-muted-foreground">{history.displayText}</span>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Calendar className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{history.displayText}</span>
        </div>
      )}
    </section>
  );
}
