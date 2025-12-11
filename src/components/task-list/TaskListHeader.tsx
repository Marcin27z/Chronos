import { getTasksLabel } from "@/lib/utils/date-format.utils";

interface TaskListHeaderProps {
  totalCount: number;
}

/**
 * TaskListHeader component
 * Nagłówek widoku z tytułem i licznikiem zadań
 */
export function TaskListHeader({ totalCount }: TaskListHeaderProps) {
  return (
    <div className="mb-6" data-testid="tasks-page-header">
      <h1 className="text-3xl font-bold" data-testid="tasks-page-title">
        Wszystkie zadania
      </h1>
      <p className="text-muted-foreground mt-1" data-testid="tasks-total-count">
        Łącznie: {totalCount} {getTasksLabel(totalCount)}
      </p>
    </div>
  );
}
