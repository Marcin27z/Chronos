import * as React from "react";

import { IntervalPicker } from "./IntervalPicker";
import { DaySelector } from "./DaySelector";
import type { IntervalUnit, ValidationState } from "@/types";

interface ScheduleSectionProps {
  intervalValue: number;
  intervalUnit: IntervalUnit;
  preferredDayOfWeek: number | null;
  onIntervalValueChange: (value: number) => void;
  onIntervalUnitChange: (unit: IntervalUnit) => void;
  onPreferredDayChange: (day: number | null) => void;
  errors: ValidationState;
  intervalHelperText?: string;
  intervalHelperId?: string;
  dayHelperText?: string;
  dayHelperId?: string;
}

export function ScheduleSection({
  intervalValue,
  intervalUnit,
  preferredDayOfWeek,
  onIntervalValueChange,
  onIntervalUnitChange,
  onPreferredDayChange,
  errors,
  intervalHelperId,
  intervalHelperText,
  dayHelperId,
  dayHelperText,
}: ScheduleSectionProps) {
  return (
    <fieldset className="space-y-4" data-testid="task-schedule-section">
      <legend className="text-sm font-semibold text-muted-foreground">Harmonogram</legend>

      <IntervalPicker
        value={intervalValue}
        unit={intervalUnit}
        error={errors.interval_value}
        helperId={intervalHelperId}
        helperText={intervalHelperText}
        onValueChange={onIntervalValueChange}
        onUnitChange={onIntervalUnitChange}
      />

      <DaySelector
        value={preferredDayOfWeek}
        onChange={onPreferredDayChange}
        error={errors.preferred_day_of_week}
        helperId={dayHelperId}
        helperText={dayHelperText}
      />
    </fieldset>
  );
}
