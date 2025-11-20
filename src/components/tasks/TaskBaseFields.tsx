import * as React from "react";

import type { ValidationState } from "@/types";

type FieldName = "title" | "description";

interface TaskBaseFieldsProps {
  title: string;
  description?: string;
  errors: Pick<ValidationState, FieldName>;
  touched: Record<FieldName, { touched: boolean }>;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onBlur: (field: FieldName) => void;
}

export function TaskBaseFields({
  title,
  description,
  errors,
  touched,
  onTitleChange,
  onDescriptionChange,
  onBlur,
}: TaskBaseFieldsProps) {
  const titleError = errors.title;
  const descriptionError = errors.description;

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-muted-foreground">Podstawowe informacje</legend>

      <div className="space-y-2">
        <label htmlFor="task-title" className="text-sm font-medium text-foreground">
          Tytuł zadania
        </label>
        <input
          id="task-title"
          type="text"
          className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/60"
          placeholder="Co chcesz robić cyklicznie?"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          onBlur={() => onBlur("title")}
          aria-required
          aria-invalid={Boolean(titleError && touched.title.touched)}
          aria-describedby={titleError ? "task-title-error" : undefined}
        />
        {titleError && touched.title.touched && (
          <p id="task-title-error" className="text-xs text-destructive">
            {titleError}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="task-description" className="text-sm font-medium text-foreground">
          Opis (opcjonalny)
        </label>
        <textarea
          id="task-description"
          className="min-h-[120px] w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/60"
          placeholder="Dodaj dodatkowe informacje, np. kroki lub kontekst"
          value={description ?? ""}
          onChange={(event) => onDescriptionChange(event.target.value)}
          onBlur={() => onBlur("description")}
          aria-invalid={Boolean(descriptionError && touched.description.touched)}
          aria-describedby={descriptionError ? "task-description-error" : undefined}
        />
        {descriptionError && touched.description.touched && (
          <p id="task-description-error" className="text-xs text-destructive">
            {descriptionError}
          </p>
        )}
      </div>
    </fieldset>
  );
}
