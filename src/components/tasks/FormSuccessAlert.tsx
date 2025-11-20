import * as React from "react";

interface FormSuccessAlertProps {
  message: string;
}

export function FormSuccessAlert({ message }: FormSuccessAlertProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
    >
      {message}
    </div>
  );
}
