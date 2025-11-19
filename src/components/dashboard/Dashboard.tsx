import { useDashboard } from "@/lib/hooks/useDashboard";
import { DashboardHeader } from "./DashboardHeader";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { EmptyState } from "./EmptyState";
import { OverdueTasksSection } from "./OverdueTasksSection";
import { UpcomingTasksSection } from "./UpcomingTasksSection";
import { NextTaskPreview } from "./NextTaskPreview";
import { DashboardSummary } from "./DashboardSummary";

/**
 * Dashboard Component
 *
 * Główny kontener React dla całego widoku Dashboard. Zarządza pobieraniem danych,
 * stanem globalnym widoku oraz orkiestruje wszystkie podkomponenty.
 * Wykorzystuje custom hook useDashboard() do zarządzania logiką biznesową.
 */

interface DashboardProps {
  token: string;
  userName?: string;
}

export function Dashboard({ token, userName }: DashboardProps) {
  // Hook zarządzający stanem Dashboard
  const { data, isLoading, error, processingTasks, completeTask, skipTask, refetch } = useDashboard({ token });

  // ============================================================================
  // Warunkowe renderowanie stanów
  // ============================================================================

  // Stan: Ładowanie
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingState />
      </div>
    );
  }

  // Stan: Błąd
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  // Stan: Brak danych (nie powinno się zdarzyć, ale dla pewności)
  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState
          error={{
            error: "No data",
            details: "Brak danych do wyświetlenia",
          }}
          onRetry={refetch}
        />
      </div>
    );
  }

  // Stan: Pusty (użytkownik nie ma żadnych zadań)
  if (data.summary.total_tasks === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <DashboardHeader userName={userName} />
        <EmptyState />
      </div>
    );
  }

  // ============================================================================
  // Handlery akcji
  // ============================================================================

  const handleComplete = async (taskId: string) => {
    const result = await completeTask(taskId);
    if (!result.success && result.error) {
      // TODO: Wyświetlić toast z błędem
      console.error("Failed to complete task:", result.error);
    } else {
      // TODO: Wyświetlić toast sukcesu
      console.log("Task completed successfully");
    }
  };

  const handleSkip = async (taskId: string) => {
    const result = await skipTask(taskId);
    if (!result.success && result.error) {
      // TODO: Wyświetlić toast z błędem
      console.error("Failed to skip task:", result.error);
    } else {
      // TODO: Wyświetlić toast sukcesu
      console.log("Task skipped successfully");
    }
  };

  // ============================================================================
  // Logika wyświetlania sekcji
  // ============================================================================

  const hasOverdue = data.overdue.length > 0;
  const hasUpcoming = data.upcoming.length > 0;
  const showNextTask = !hasOverdue && !hasUpcoming && data.next_task !== null;

  // ============================================================================
  // Renderowanie głównego widoku
  // ============================================================================

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Nagłówek */}
      <DashboardHeader userName={userName} />

      {/* Sekcja Zaległe */}
      <OverdueTasksSection
        tasks={data.overdue}
        onComplete={handleComplete}
        onSkip={handleSkip}
        processingTasks={processingTasks}
      />

      {/* Sekcja Nadchodzące */}
      <UpcomingTasksSection tasks={data.upcoming} onComplete={handleComplete} processingTasks={processingTasks} />

      {/* Najbliższe zadanie (jeśli brak zaległych i nadchodzących) */}
      {showNextTask && (
        <div className="mb-8">
          <NextTaskPreview nextTask={data.next_task} />
        </div>
      )}

      {/* Podsumowanie statystyk */}
      <DashboardSummary summary={data.summary} />
    </div>
  );
}
