import * as React from "react";
import { cn } from "@/lib/utils";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export function AuthInput({ label, error, helperText, className, ...props }: AuthInputProps) {
  return (
    <label className={cn("group block text-sm font-medium text-foreground", className)}>
      <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <input
        className={cn(
          "mt-1 w-full rounded-lg border bg-input px-4 py-3 text-sm text-foreground transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/60",
          error
            ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/40"
            : "border-border",
          props.disabled ? "opacity-60" : "opacity-100"
        )}
        aria-invalid={Boolean(error)}
        {...props}
      />
      <div className="mt-1 min-h-[1rem] text-xs font-normal text-destructive">
        {error ? error : helperText ? helperText : "\u00A0"}
      </div>
    </label>
  );
}
