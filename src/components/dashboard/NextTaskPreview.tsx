import type { NextTaskDTO } from "@/types";
import { Calendar } from "lucide-react";

/**
 * NextTaskPreview Component
 *
 * Komponent wyświetlany gdy użytkownik nie ma zadań zaległych ani nadchodzących
 * w ciągu 7 dni. Pokazuje najbliższe zadanie w przyszłości jako informację planistyczną.
 */

interface NextTaskPreviewProps {
  nextTask: NextTaskDTO | null;
}

export function NextTaskPreview({ nextTask }: NextTaskPreviewProps) {
  if (!nextTask) {
    return null;
  }

  // Formatowanie daty w formacie polskim
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString("pl-PL", options);
  };

  const daysText = nextTask.days_until_due === 1 ? "dzień" : nextTask.days_until_due < 5 ? "dni" : "dni";

  return (
    <div className="border rounded-lg p-6 bg-muted/30">
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-primary/10 p-3">
          <Calendar className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Najbliższe zadanie</h3>
          <p className="text-xl font-semibold mb-2">{nextTask.title}</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-muted-foreground">
            <span className="capitalize">{formatDate(nextTask.next_due_date)}</span>
            <span className="hidden sm:inline">•</span>
            <span>
              za {nextTask.days_until_due} {daysText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
