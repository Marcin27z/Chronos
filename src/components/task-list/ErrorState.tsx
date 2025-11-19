import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ErrorDTO } from "@/types";

interface ErrorStateProps {
  error: ErrorDTO;
  onRetry: () => void;
}

/**
 * ErrorState component
 * Wyświetla komunikat błędu z przyciskiem ponowienia próby
 */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="h-16 w-16 text-destructive mb-4" />
      <h2 className="text-2xl font-semibold mb-2">Wystąpił błąd</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        {error.error}
        {error.details && `: ${error.details}`}
      </p>
      <Button onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Spróbuj ponownie
      </Button>
    </div>
  );
}
