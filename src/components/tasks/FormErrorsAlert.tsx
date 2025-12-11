import * as React from "react";

interface FormErrorsAlertProps {
  message: string;
}

export function FormErrorsAlert({ message }: FormErrorsAlertProps) {
  return (
    <div
      role="alert"
      data-testid="task-form-error-alert"
      className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      {message}
    </div>
  );
}
