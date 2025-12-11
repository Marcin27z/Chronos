import * as React from "react";

interface TaskFormHeaderProps {
  title?: string;
  description?: string;
  status?: string;
  statusTone?: "info" | "success" | "destructive";
  statusId?: string;
}

export function TaskFormHeader({
  title = "Nowe zadanie",
  description = "Zdefiniuj powtarzalne zadanie i zaplanuj kolejne terminy.",
  status,
  statusTone = "info",
  statusId,
}: TaskFormHeaderProps) {
  return (
    <header className="space-y-1" data-testid="task-form-header">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Nowe zadanie</p>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {status && (
        <p
          id={statusId}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={`text-sm font-medium ${
            statusTone === "success"
              ? "text-emerald-600"
              : statusTone === "destructive"
                ? "text-destructive"
                : "text-muted-foreground/80"
          }`}
          data-testid="task-form-status"
        >
          {status}
        </p>
      )}
    </header>
  );
}
