import * as React from "react";

import { Button } from "@/components/ui/button";

interface FormActionsProps {
  isSubmitting: boolean;
  hasErrors: boolean;
  onCancel: () => void;
}

export function FormActions({ isSubmitting, hasErrors, onCancel }: FormActionsProps) {
  const helperText = isSubmitting
    ? "Trwa zapisywanie..."
    : hasErrors
      ? "Uzupełnij wymienione pola, aby zapisać zadanie"
      : "Możesz zapisać zadanie";

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Button type="submit" disabled={isSubmitting || hasErrors} size="lg" data-testid="task-form-submit">
          {isSubmitting ? "Zapisuję..." : "Zapisz zadanie"}
        </Button>
        <p aria-live="polite" className="mt-1 text-xs text-muted-foreground">
          {helperText}
        </p>
      </div>
      <button
        type="button"
        className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground sm:self-start"
        onClick={onCancel}
        disabled={isSubmitting}
        aria-disabled={isSubmitting}
        title="Porzuć zmiany i wróć"
        data-testid="task-form-cancel"
      >
        Anuluj
      </button>
    </div>
  );
}
