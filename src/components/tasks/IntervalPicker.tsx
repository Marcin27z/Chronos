import * as React from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { IntervalOption, IntervalUnit } from "@/types";

const INTERVAL_OPTIONS: IntervalOption[] = [
  { label: "Dni", value: "days" },
  { label: "Tygodnie", value: "weeks" },
  { label: "Miesiące", value: "months" },
  { label: "Lata", value: "years" },
];

interface IntervalPickerProps {
  value: number;
  unit: IntervalUnit;
  error?: string;
  helperText?: string;
  helperId?: string;
  onValueChange: (value: number) => void;
  onUnitChange: (unit: IntervalUnit) => void;
}

export function IntervalPicker({
  value,
  unit,
  error,
  helperText,
  helperId,
  onValueChange,
  onUnitChange,
}: IntervalPickerProps) {
  const describedBy = [error ? "interval-error" : null, helperId].filter(Boolean).join(" ") || undefined;
  const inputId = "task-interval-value";

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-foreground"
        title="Jednostka i wartość określają cykl powtarzalności"
      >
        Interwał powtarzalności
      </label>
      <div className="flex flex-wrap items-center gap-3" aria-describedby={helperId}>
        <input
          type="number"
          min={1}
          max={999}
          id={inputId}
          value={value}
          onChange={(event) => onValueChange(Number(event.target.value))}
          className="w-24 rounded-md border border-border bg-input px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/60"
          aria-describedby={describedBy}
          title="Wpisz liczbę dni, tygodni, miesięcy lub lat"
        />

        <Select value={unit} onValueChange={(selected) => onUnitChange(selected as IntervalUnit)}>
          <SelectTrigger className="w-40 text-left" size="default">
            <SelectValue placeholder="Jednostka" />
          </SelectTrigger>
          <SelectContent>
            {INTERVAL_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {helperText && (
        <p id={helperId} className="text-xs text-muted-foreground">
          {helperText}
        </p>
      )}
      {error && (
        <p id="interval-error" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
