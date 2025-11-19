import type { ErrorDTO } from "@/types";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

/**
 * ErrorState Component
 *
 * Komponent wyświetlany gdy wystąpi błąd podczas ładowania danych Dashboard.
 * Pokazuje przyjazny komunikat błędu i przycisk retry.
 */

interface ErrorStateProps {
  error: ErrorDTO;
  onRetry: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  // Mapowanie błędów na przyjazne komunikaty
  const getErrorMessage = () => {
    if (error.error === "Network error") {
      return "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.";
    }

    return error.details || error.error || "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.";
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
      </div>

      <h2 className="text-2xl font-semibold mb-2">Coś poszło nie tak</h2>

      <p className="text-muted-foreground mb-6 max-w-md">{getErrorMessage()}</p>

      <Button onClick={onRetry} variant="default">
        Spróbuj ponownie
      </Button>
    </div>
  );
}
