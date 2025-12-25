import * as React from "react";

import { TaskBaseFields } from "./TaskBaseFields";
import { TaskFormHeader } from "./TaskFormHeader";
import { ScheduleSection } from "./ScheduleSection";
import { NextDueDatePreview } from "./NextDueDatePreview";
import { FormActions } from "./FormActions";
import { FormErrorsAlert } from "./FormErrorsAlert";
import { FormSuccessAlert } from "./FormSuccessAlert";
import { createTask, updateTask, type TaskApiError } from "@/lib/api/tasks.api";
import { useCreateTaskForm } from "@/lib/hooks/useCreateTaskForm";
import { useEditTaskForm } from "@/lib/hooks/useEditTaskForm";
import { BackButtonGuard } from "@/components/guards/BackButtonGuard";
import type { CreateTaskViewModel, ValidationErrorDetail, ValidationState, TaskDTO } from "@/types";

interface TaskFormProps {
  token: string;
  mode?: "create" | "edit";
  initialValues?: Partial<CreateTaskViewModel>;
  initialTask?: TaskDTO;
  taskId?: string;
  onSubmit?: (values: CreateTaskViewModel) => Promise<void> | void;
  onCancel?: () => void;
}

export function TaskForm({
  token,
  mode = "create",
  initialValues,
  initialTask,
  taskId,
  onSubmit,
  onCancel,
}: TaskFormProps) {
  // Wybór odpowiedniego hooka w zależności od trybu
  const isEditMode = mode === "edit";

  // Hook dla trybu create
  const createFormHook = useCreateTaskForm({ initialValues });

  // Hook dla trybu edit (tylko jeśli initialTask jest dostępne)
  const editFormHook = useEditTaskForm(
    initialTask
      ? { initialTask }
      : {
          initialTask: {
            id: "",
            user_id: "",
            title: "",
            description: null,
            interval_value: 1,
            interval_unit: "weeks",
            preferred_day_of_week: null,
            next_due_date: new Date().toISOString(),
            last_action_date: null,
            last_action_type: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        }
  );

  // Wybór właściwego hooka
  const formHook = isEditMode && initialTask ? editFormHook : createFormHook;

  const {
    values,
    errors,
    meta,
    generalError,
    nextDueDatePreview,
    isDirty,
    isSubmitting,
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
  } = formHook;

  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isSaved, setIsSaved] = React.useState(false);
  const redirectTimeoutRef = React.useRef<number | null>(null);

  const hasFieldErrors = Object.values(errors).some(Boolean);

  const statusMessage = successMessage
    ? successMessage
    : generalError
      ? "Wystąpił błąd"
      : hasFieldErrors
        ? "Uzupełnij wymagane pola"
        : "Wszystko wygląda dobrze";

  const statusTone: "success" | "destructive" | "info" = successMessage
    ? "success"
    : generalError
      ? "destructive"
      : "info";

  const intervalHelperId = "task-interval-helper";
  const dayHelperId = "task-day-helper";
  const statusId = "task-form-status";
  const intervalHelperText = "Określ, co ile ma pojawiać się kolejny termin (1–999 jednostek).";
  const dayHelperText = "Opcjonalnie wybierz preferowany dzień tygodnia; kliknij ponownie, aby usunąć wybór.";

  const markValidationDetails = React.useCallback(
    (details: ValidationErrorDetail[]) => {
      const fieldErrors = details.reduce<Partial<ValidationState>>((acc, detail) => {
        acc[detail.field as keyof CreateTaskViewModel] = detail.message;
        return acc;
      }, {});
      applyFieldErrors(fieldErrors);
    },
    [applyFieldErrors]
  );

  React.useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        window.clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSuccessMessage(null);
      setGeneralErrorMessage(undefined);
      setIsSaved(false);

      await submitForm({
        onSubmit: async (formValues) => {
          if (isEditMode && taskId) {
            // Tryb edycji - wywołaj updateTask
            await updateTask(taskId, token, formValues);
            setSuccessMessage("Zadanie zostało zaktualizowane");
          } else {
            // Tryb tworzenia - wywołaj createTask
            await createTask(token, formValues);
            setSuccessMessage("Zadanie zostało zapisane");
            resetForm();
          }

          setIsSaved(true); // Wyłącz guard przed redirectem

          if (onSubmit) {
            await onSubmit(formValues as CreateTaskViewModel);
          }

          redirectTimeoutRef.current = window.setTimeout(() => {
            window.location.assign("/tasks");
          }, 1200);
        },
        onError: (error) => {
          if (error && typeof error === "object" && "status" in error && "payload" in error) {
            const apiError = error as TaskApiError;
            if (apiError.status === 401) {
              window.location.assign("/login");
              return undefined;
            }

            if ("details" in apiError.payload && Array.isArray(apiError.payload.details)) {
              markValidationDetails(apiError.payload.details);
            }

            return apiError.payload.error ?? `Nie udało się ${isEditMode ? "zaktualizować" : "zapisać"} zadania`;
          }

          return error instanceof Error
            ? error.message
            : `Nie udało się ${isEditMode ? "zaktualizować" : "zapisać"} zadania`;
        },
      });
    },
    [submitForm, token, resetForm, onSubmit, markValidationDetails, setGeneralErrorMessage, isEditMode, taskId]
  );

  const handleCancel = React.useCallback(() => {
    if (isDirty) {
      const shouldDiscard = window.confirm("Masz niezapisane zmiany. Na pewno chcesz anulować?");
      if (!shouldDiscard) {
        return;
      }
      resetForm();
    }

    setSuccessMessage(null);
    setGeneralErrorMessage(undefined);
    onCancel?.();
  }, [isDirty, onCancel, resetForm, setGeneralErrorMessage]);

  return (
    <>
      <BackButtonGuard hasUnsavedChanges={isDirty && !isSaved} />
      <form
        className="space-y-6 rounded-xl border border-border bg-card/80 p-6 shadow-lg shadow-muted-foreground/20 backdrop-blur"
        onSubmit={handleSubmit}
        data-token={token}
        data-testid="task-form"
      >
        <TaskFormHeader status={statusMessage} statusTone={statusTone} statusId={statusId} />

        {successMessage && <FormSuccessAlert message={successMessage} />}
        {generalError && <FormErrorsAlert message={generalError} />}

        <TaskBaseFields
          title={values.title}
          description={values.description}
          errors={errors}
          touched={meta}
          onTitleChange={handleTitleChange}
          onDescriptionChange={handleDescriptionChange}
          onBlur={handleBlur}
        />

        <ScheduleSection
          intervalValue={values.interval_value}
          intervalUnit={values.interval_unit}
          preferredDayOfWeek={values.preferred_day_of_week}
          onIntervalValueChange={handleIntervalValueChange}
          onIntervalUnitChange={handleIntervalUnitChange}
          onPreferredDayChange={handlePreferredDayChange}
          errors={errors}
          intervalHelperId={intervalHelperId}
          intervalHelperText={intervalHelperText}
          dayHelperId={dayHelperId}
          dayHelperText={dayHelperText}
        />

        <NextDueDatePreview preview={nextDueDatePreview} />

        <FormActions isSubmitting={isSubmitting} hasErrors={hasFieldErrors} onCancel={handleCancel} />
      </form>
    </>
  );
}
