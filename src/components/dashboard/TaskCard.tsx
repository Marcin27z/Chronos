import type { TaskWithDaysOverdueDTO, TaskWithDaysUntilDueDTO } from "@/types";
import type { TaskCardVariant } from "@/lib/types/dashboard.viewmodel";
import { Button } from "@/components/ui/button";
import { Check, SkipForward, Loader2 } from "lucide-react";

/**
 * TaskCard Component
 *
 * Uniwersalny komponent karty zadania, który może działać w dwóch wariantach:
 * - 'overdue': z przyciskami Wykonaj i Pomiń
 * - 'upcoming': tylko przycisk Wykonaj
 *
 * Wyświetla szczegóły zadania i umożliwia szybkie akcje.
 */

interface TaskCardProps {
  task: TaskWithDaysOverdueDTO | TaskWithDaysUntilDueDTO;
  variant: TaskCardVariant;
  onComplete: (taskId: string) => Promise<void>;
  onSkip?: (taskId: string) => Promise<void>; // tylko dla overdue
  isProcessing?: boolean;
}

export function TaskCard({ task, variant, onComplete, onSkip, isProcessing = false }: TaskCardProps) {
  const isOverdue = variant === "overdue";

  // Pobieranie liczby dni w zależności od wariantu
  const daysValue = isOverdue
    ? (task as TaskWithDaysOverdueDTO).days_overdue
    : (task as TaskWithDaysUntilDueDTO).days_until_due;

  // Formatowanie badge'a z liczbą dni
  const getDaysBadge = () => {
    if (isOverdue) {
      const days = daysValue;
      const text = days === 1 ? "dzień" : days < 5 ? "dni" : "dni";
      return `${days} ${text} po terminie`;
    } else {
      const days = daysValue;
      const text = days === 1 ? "dzień" : days < 5 ? "dni" : "dni";
      return `za ${days} ${text}`;
    }
  };

  // Style wariantu overdue - czerwony border
  const cardClassName = isOverdue
    ? "border-destructive/50 bg-destructive/5 hover:bg-destructive/10"
    : "hover:bg-muted/50";

  const badgeClassName = isOverdue
    ? "bg-destructive/10 text-destructive border-destructive/20"
    : "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800";

  return (
    <div className={`border rounded-lg p-6 transition-colors ${cardClassName}`}>
      {/* Header z tytułem i badge */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold truncate">{task.title}</h3>
        </div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${badgeClassName}`}
        >
          {getDaysBadge()}
        </span>
      </div>

      {/* Opis (jeśli istnieje) */}
      {task.description && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
        </div>
      )}

      {/* Przyciski akcji */}
      <div className="flex gap-2">
        <Button
          onClick={() => onComplete(task.id)}
          disabled={isProcessing}
          variant="default"
          size="sm"
          className="min-h-[44px]"
          aria-label={`Wykonaj zadanie: ${task.title}`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Przetwarzanie...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Wykonaj
            </>
          )}
        </Button>

        {/* Przycisk Pomiń tylko dla overdue */}
        {isOverdue && onSkip && (
          <Button
            onClick={() => onSkip(task.id)}
            disabled={isProcessing}
            variant="outline"
            size="sm"
            className="min-h-[44px]"
            aria-label={`Pomiń zadanie: ${task.title}`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Przetwarzanie...
              </>
            ) : (
              <>
                <SkipForward className="h-4 w-4 mr-2" />
                Pomiń
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
