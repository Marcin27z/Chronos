import { useCallback, useMemo, useState } from "react";

import type {
  EditTaskViewModel,
  TaskDTO,
  IntervalUnit,
  NextDueDatePreviewModel,
  ValidationState,
  ScheduleImpactWarningVM,
  TaskHistoryVM,
  UpdateTaskCommand,
} from "@/types";
import { computeIntervalText, formatTaskHistory, computeDiff } from "@/lib/utils/task-edit.utils";

interface UseEditTaskFormOptions {
  initialTask: TaskDTO;
}

interface SubmitOptions {
  onSubmit?: (command: UpdateTaskCommand) => Promise<void> | void;
  onError?: (error: unknown) => string | undefined;
}

function validateField<K extends keyof EditTaskViewModel>(field: K, value: EditTaskViewModel[K]): string | undefined {
  switch (field) {
    case "title": {
      const normalized = String(value ?? "").trim();
      if (!normalized) {
        return "Tytuł jest wymagany";
      }
      if (normalized.length > 256) {
        return "Tytuł nie może przekraczać 256 znaków";
      }
      return undefined;
    }

    case "description": {
      if (!value) {
        return undefined;
      }
      const description = String(value);
      if (description.length > 5000) {
        return "Opis nie może przekraczać 5000 znaków";
      }
      return undefined;
    }

    case "interval_value": {
      const numeric = Number(value);
      if (Number.isNaN(numeric)) {
        return "Wpisz prawidłową liczbę";
      }
      if (!Number.isInteger(numeric)) {
        return "Interwał musi być liczbą całkowitą";
      }
      if (numeric < 1) {
        return "Interwał musi być co najmniej 1";
      }
      if (numeric > 999) {
        return "Interwał nie może być większy niż 999";
      }
      return undefined;
    }

    case "interval_unit": {
      const units: IntervalUnit[] = ["days", "weeks", "months", "years"];
      if (!units.includes(value as IntervalUnit)) {
        return "Wybierz jednostkę interwału";
      }
      return undefined;
    }

    case "preferred_day_of_week": {
      if (value === null || value === undefined) {
        return undefined;
      }
      const numeric = Number(value);
      if (!Number.isInteger(numeric) || numeric < 0 || numeric > 6) {
        return "Wybierz dzień tygodnia";
      }
      return undefined;
    }

    default:
      return undefined;
  }
}

function validateForm(values: EditTaskViewModel): ValidationState {
  return {
    title: validateField("title", values.title),
    description: validateField("description", values.description),
    interval_value: validateField("interval_value", values.interval_value),
    interval_unit: validateField("interval_unit", values.interval_unit),
    preferred_day_of_week: validateField("preferred_day_of_week", values.preferred_day_of_week),
  };
}

function addInterval(date: Date, value: number, unit: IntervalUnit) {
  const clone = new Date(date);
  switch (unit) {
    case "days":
      clone.setDate(clone.getDate() + value);
      break;
    case "weeks":
      clone.setDate(clone.getDate() + value * 7);
      break;
    case "months":
      clone.setMonth(clone.getMonth() + value);
      break;
    case "years":
      clone.setFullYear(clone.getFullYear() + value);
      break;
  }
  return clone;
}

function createMetaState(): Record<keyof EditTaskViewModel, { touched: boolean }> {
  return {
    title: { touched: false },
    description: { touched: false },
    interval_value: { touched: false },
    interval_unit: { touched: false },
    preferred_day_of_week: { touched: false },
  };
}

export function useEditTaskForm(options: UseEditTaskFormOptions) {
  const { initialTask } = options;

  // Konwersja TaskDTO na EditTaskViewModel
  const initialValues = useMemo<EditTaskViewModel>(
    () => ({
      title: initialTask.title,
      description: initialTask.description ?? "",
      interval_value: initialTask.interval_value,
      interval_unit: initialTask.interval_unit,
      preferred_day_of_week: initialTask.preferred_day_of_week,
    }),
    [initialTask]
  );

  const [values, setValues] = useState<EditTaskViewModel>(initialValues);
  const [errors, setErrors] = useState<ValidationState>(() => ({}) as ValidationState);
  const [meta, setMeta] = useState(() => createMetaState());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | undefined>(undefined);

  // Obliczanie isDirty
  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValues);
  }, [values, initialValues]);

  // Obliczanie scheduleImpact
  const scheduleImpact = useMemo<ScheduleImpactWarningVM>(() => {
    const hasIntervalChange =
      values.interval_value !== initialTask.interval_value || values.interval_unit !== initialTask.interval_unit;

    if (!hasIntervalChange) {
      return {
        hasChanges: false,
        oldInterval: "",
        newInterval: "",
        oldNextDueDate: null,
        newNextDueDate: null,
        impactMessage: "",
      };
    }

    const oldInterval = computeIntervalText(initialTask.interval_value, initialTask.interval_unit);
    const newInterval = computeIntervalText(values.interval_value, values.interval_unit);

    // Oblicz nową datę next_due_date (przewidywanie)
    const errorForInterval = validateField("interval_value", values.interval_value);
    let newNextDueDate: string | null = null;
    if (!errorForInterval) {
      const calculatedDate = addInterval(new Date(), values.interval_value, values.interval_unit);
      newNextDueDate = calculatedDate.toISOString();
    }

    return {
      hasChanges: true,
      oldInterval,
      newInterval,
      oldNextDueDate: initialTask.next_due_date,
      newNextDueDate,
      impactMessage: "Zmiana harmonogramu wpłynie na wszystkie przyszłe wystąpienia zadania.",
    };
  }, [values.interval_value, values.interval_unit, initialTask]);

  // Formatowanie historii zadania
  const taskHistory = useMemo<TaskHistoryVM>(() => {
    return formatTaskHistory(initialTask);
  }, [initialTask]);

  // Obliczanie nextDueDatePreview
  const nextDueDatePreview = useMemo<NextDueDatePreviewModel>(() => {
    const errorForInterval = validateField("interval_value", values.interval_value);
    if (errorForInterval) {
      return { nextDueDate: null, description: "Uzupełnij interwał, aby zobaczyć podgląd" };
    }

    const dueDate = addInterval(new Date(), values.interval_value, values.interval_unit);
    const formatter = new Intl.DateTimeFormat("pl-PL", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });

    return {
      nextDueDate: dueDate.toISOString(),
      description: `Następny termin: ${formatter.format(dueDate)}`,
    };
  }, [values.interval_value, values.interval_unit]);

  const runValidation = useCallback(() => {
    const validation = validateForm(values);
    setErrors(validation);
    return validation;
  }, [values]);

  const markFieldTouched = useCallback((field: keyof EditTaskViewModel) => {
    setMeta((prev) => ({
      ...prev,
      [field]: {
        touched: true,
      },
    }));
  }, []);

  const handleBlur = markFieldTouched;

  const handleTitleChange = useCallback((title: string) => {
    setValues((prev) => ({ ...prev, title }));
    setErrors((prev) => ({ ...prev, title: validateField("title", title) }));
  }, []);

  const handleDescriptionChange = useCallback((description: string) => {
    setValues((prev) => ({ ...prev, description }));
    setErrors((prev) => ({ ...prev, description: validateField("description", description) }));
  }, []);

  const handleIntervalValueChange = useCallback((value: number) => {
    setValues((prev) => ({ ...prev, interval_value: value }));
    setErrors((prev) => ({ ...prev, interval_value: validateField("interval_value", value) }));
  }, []);

  const handleIntervalUnitChange = useCallback((unit: IntervalUnit) => {
    setValues((prev) => ({ ...prev, interval_unit: unit }));
    setErrors((prev) => ({ ...prev, interval_unit: validateField("interval_unit", unit) }));
  }, []);

  const handlePreferredDayChange = useCallback((day: number | null) => {
    setValues((prev) => ({ ...prev, preferred_day_of_week: day }));
    setErrors((prev) => ({
      ...prev,
      preferred_day_of_week: validateField("preferred_day_of_week", day),
    }));
  }, []);

  const applyFieldErrors = useCallback((fieldErrors: Partial<ValidationState>) => {
    setErrors((prev) => ({ ...prev, ...fieldErrors }));
    setMeta((prev) => {
      const next = { ...prev };
      Object.keys(fieldErrors).forEach((field) => {
        const key = field as keyof EditTaskViewModel;
        next[key] = { touched: true };
      });
      return next;
    });
  }, []);

  const setGeneralErrorMessage = useCallback((message?: string) => {
    setGeneralError(message);
  }, []);

  const submitForm = useCallback(
    async ({ onSubmit, onError }: SubmitOptions = {}) => {
      const validation = runValidation();
      const hasErrors = Object.values(validation).some(Boolean);
      if (hasErrors) {
        setGeneralError("Wypełnij wszystkie wymagane pola");
        return { success: false };
      }

      setIsSubmitting(true);
      setGeneralError(undefined);

      try {
        // Oblicz diff - tylko zmienione pola
        const diff = computeDiff(initialTask, values);

        if (onSubmit) {
          await onSubmit(diff);
        }
        return { success: true };
      } catch (error) {
        const message =
          onError?.(error) ??
          (error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
        setGeneralError(message);
        return { success: false };
      } finally {
        setIsSubmitting(false);
      }
    },
    [runValidation, values, initialTask]
  );

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({} as ValidationState);
    setMeta(createMetaState());
    setGeneralError(undefined);
  }, [initialValues]);

  return {
    values,
    errors,
    meta,
    generalError,
    isDirty,
    isSubmitting,
    scheduleImpact,
    taskHistory,
    nextDueDatePreview,
    handleTitleChange,
    handleDescriptionChange,
    handleIntervalValueChange,
    handleIntervalUnitChange,
    handlePreferredDayChange,
    handleBlur,
    submitForm,
    resetForm,
    applyFieldErrors,
    setGeneralErrorMessage,
  };
}
