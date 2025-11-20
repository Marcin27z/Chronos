import * as React from "react";

const WEEK_DAYS = [
  { label: "Nd", value: 0 },
  { label: "Pn", value: 1 },
  { label: "Wt", value: 2 },
  { label: "Śr", value: 3 },
  { label: "Cz", value: 4 },
  { label: "Pt", value: 5 },
  { label: "So", value: 6 },
];

interface DaySelectorProps {
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
  helperText?: string;
  helperId?: string;
}

export function DaySelector({ value, onChange, error, helperText, helperId }: DaySelectorProps) {
  const handleToggle = React.useCallback(
    (day: number) => {
      if (value === day) {
        onChange(null);
        return;
      }
      onChange(day);
    },
    [onChange, value]
  );

  const describedBy = [error ? "day-error" : null, helperId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Preferowany dzień tygodnia</p>
        <span className="text-xs text-muted-foreground">Opcjonalne</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {WEEK_DAYS.map((day) => {
          const isActive = day.value === value;
          return (
            <button
              key={day.value}
              type="button"
              onClick={() => handleToggle(day.value)}
              aria-pressed={isActive}
              className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-foreground hover:border-primary/80"
              }`}
              aria-describedby={describedBy}
            >
              {day.label}
            </button>
          );
        })}
      </div>

      {helperText && (
        <p id={helperId} className="text-xs text-muted-foreground">
          {helperText}
        </p>
      )}

      {error && (
        <p id="day-error" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
