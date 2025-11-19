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
    <div className="mb-6">
      <h1 className="text-3xl font-bold">Wszystkie zadania</h1>
      <p className="text-muted-foreground mt-1">
        Łącznie: {totalCount} {getTasksLabel(totalCount)}
      </p>
    </div>
  );
}
