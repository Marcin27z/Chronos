import { AlertCircle } from "lucide-react";
import type { ScheduleImpactWarningVM } from "@/types";

interface ScheduleImpactNoticeProps {
  impact: ScheduleImpactWarningVM;
}

export function ScheduleImpactNotice({ impact }: ScheduleImpactNoticeProps) {
  if (!impact.hasChanges) {
    return null;
  }

  const formatDate = (isoDate: string | null) => {
    if (!isoDate) return "—";
    const date = new Date(isoDate);
    return new Intl.DateTimeFormat("pl-PL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  return (
    <div
      className="rounded-lg border border-amber-500/50 bg-amber-50/50 p-4 dark:border-amber-500/30 dark:bg-amber-950/20"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-500" aria-hidden="true" />
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold text-amber-900 dark:text-amber-100">Zmiana harmonogramu</h3>

          <div className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
            <p>
              <span className="font-medium">Stary interwał:</span> {impact.oldInterval}
            </p>
            <p>
              <span className="font-medium">Nowy interwał:</span> {impact.newInterval}
            </p>
          </div>

          {impact.oldNextDueDate && impact.newNextDueDate && (
            <div className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
              <p>
                <span className="font-medium">Obecny następny termin:</span> {formatDate(impact.oldNextDueDate)}
              </p>
              <p>
                <span className="font-medium">Nowy następny termin:</span> {formatDate(impact.newNextDueDate)}
              </p>
            </div>
          )}

          <p className="text-sm italic text-amber-700 dark:text-amber-300">{impact.impactMessage}</p>
        </div>
      </div>
    </div>
  );
}
