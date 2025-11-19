import type { TaskWithDaysOverdueDTO } from "@/types";
import { TaskCard } from "./TaskCard";

/**
 * OverdueTasksSection Component
 *
 * Sekcja wyświetlająca listę zadań zaległych (przeterminowanych) z podkreśleniem
 * pilności przez odpowiedni styling (czerwony border). Każde zadanie w tej sekcji
 * ma dwie akcje: Wykonaj i Pomiń.
 */

interface OverdueTasksSectionProps {
  tasks: TaskWithDaysOverdueDTO[];
  onComplete: (taskId: string) => Promise<void>;
  onSkip: (taskId: string) => Promise<void>;
  processingTasks: Set<string>;
}

export function OverdueTasksSection({ tasks, onComplete, onSkip, processingTasks }: OverdueTasksSectionProps) {
  // Nie renderuj sekcji jeśli brak zadań
  if (tasks.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4 text-destructive">Zaległe ({tasks.length})</h2>
      <div className="space-y-4">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            variant="overdue"
            onComplete={onComplete}
            onSkip={onSkip}
            isProcessing={processingTasks.has(task.id)}
          />
        ))}
      </div>
    </section>
  );
}
