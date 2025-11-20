import * as React from "react";

import type { NextDueDatePreviewModel } from "@/types";

interface NextDueDatePreviewProps {
  preview: NextDueDatePreviewModel;
}

export function NextDueDatePreview({ preview }: NextDueDatePreviewProps) {
  const formattedDate = preview.nextDueDate
    ? new Date(preview.nextDueDate).toLocaleDateString("pl-PL", {
        weekday: "short",
        day: "2-digit",
        month: "long",
      })
    : null;

  return (
    <section className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/80">Następny termin</p>
      <div className="mt-2 text-base font-semibold text-foreground">{formattedDate ?? "Brak danych"}</div>
      <p className="text-xs text-muted-foreground">{preview.description}</p>
    </section>
  );
}
