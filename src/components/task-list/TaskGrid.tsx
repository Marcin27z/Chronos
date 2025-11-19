import { TaskListCard } from "./TaskListCard";
import type { TaskDTO } from "@/types";

interface TaskGridProps {
  tasks: TaskDTO[];
  onDelete: (task: TaskDTO) => void;
}

/**
 * TaskGrid component
 * Responsywny grid wyświetlający karty zadań
 */
export function TaskGrid({ tasks, onDelete }: TaskGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {tasks.map((task) => (
        <TaskListCard key={task.id} task={task} onDelete={onDelete} />
      ))}
    </div>
  );
}
