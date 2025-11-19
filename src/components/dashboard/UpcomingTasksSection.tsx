import type { TaskWithDaysUntilDueDTO } from "@/types";
import { TaskCard } from "./TaskCard";

/**
 * UpcomingTasksSection Component
 *
 * Sekcja wyświetlająca listę zadań nadchodzących (w ciągu najbliższych 7 dni).
 * Zadania pokazują ile dni pozostało do terminu. Każde zadanie ma tylko
 * akcję Wykonaj (brak Pomiń).
 */

interface UpcomingTasksSectionProps {
  tasks: TaskWithDaysUntilDueDTO[];
  onComplete: (taskId: string) => Promise<void>;
  processingTasks: Set<string>;
}

export function UpcomingTasksSection({ tasks, onComplete, processingTasks }: UpcomingTasksSectionProps) {
  // Nie renderuj sekcji jeśli brak zadań
  if (tasks.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">Nadchodzące (7 dni) ({tasks.length})</h2>
      <div className="space-y-4">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            variant="upcoming"
            onComplete={onComplete}
            isProcessing={processingTasks.has(task.id)}
          />
        ))}
      </div>
    </section>
  );
}
