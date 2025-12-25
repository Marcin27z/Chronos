import * as React from "react";

import { TaskFormHeader } from "./TaskFormHeader";
import { TaskBaseFields } from "./TaskBaseFields";
import { ScheduleSection } from "./ScheduleSection";
import { NextDueDatePreview } from "./NextDueDatePreview";
import { FormActions } from "./FormActions";
import { FormErrorsAlert } from "./FormErrorsAlert";
import { FormSuccessAlert } from "./FormSuccessAlert";
import { ScheduleImpactNotice } from "./ScheduleImpactNotice";
import { TaskHistory } from "./TaskHistory";
import { DeleteTaskSection } from "./DeleteTaskSection";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import { BackButtonGuard } from "@/components/guards/BackButtonGuard";
import { useEditTaskForm } from "@/lib/hooks/useEditTaskForm";
import { useTaskDelete } from "@/lib/hooks/useTaskDelete";
import { updateTask, type TaskApiError } from "@/lib/api/tasks.api";
import type { TaskDTO, ValidationErrorDetail, ValidationState, CreateTaskViewModel } from "@/types";

interface EditTaskViewProps {
  initialTask: TaskDTO;
  token: string;
}

export function EditTaskView({ initialTask, token }: EditTaskViewProps) {
  const {
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
  } = useEditTaskForm({ initialTask });

  const { isDialogOpen, isDeleting, deleteError, openDeleteDialog, closeDeleteDialog, confirmDelete } = useTaskDelete({
    taskId: initialTask.id,
    token,
    onSuccess: () => {
      window.location.assign("/tasks");
    },
  });

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
        onSubmit: async (command) => {
          await updateTask(initialTask.id, token, command);
          setSuccessMessage("Zadanie zostało zaktualizowane");
          setIsSaved(true); // Wyłącz guard przed redirectem
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

            if (apiError.status === 404) {
              setGeneralErrorMessage("To zadanie nie istnieje lub zostało usunięte");
              setIsSaved(true); // Wyłącz guard przed redirectem
              redirectTimeoutRef.current = window.setTimeout(() => {
                window.location.assign("/tasks");
              }, 2000);
              return undefined;
            }

            if ("details" in apiError.payload && Array.isArray(apiError.payload.details)) {
              markValidationDetails(apiError.payload.details);
            }

            return apiError.payload.error ?? "Nie udało się zaktualizować zadania";
          }

          return error instanceof Error ? error.message : "Nie udało się zaktualizować zadania";
        },
      });
    },
    [submitForm, token, initialTask.id, markValidationDetails, setGeneralErrorMessage]
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
    window.location.assign("/tasks");
  }, [isDirty, resetForm, setGeneralErrorMessage]);

  return (
    <>
      <BackButtonGuard hasUnsavedChanges={isDirty && !isSaved} />
      <DeleteConfirmationDialog
        isOpen={isDialogOpen}
        taskTitle={initialTask.title}
        isDeleting={isDeleting}
        deleteError={deleteError}
        onConfirm={confirmDelete}
        onCancel={closeDeleteDialog}
      />

      <div className="space-y-6">
        <form
          className="space-y-6 rounded-xl border border-border bg-card/80 p-6 shadow-lg shadow-muted-foreground/20 backdrop-blur"
          onSubmit={handleSubmit}
          data-testid="edit-task-form"
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

          <ScheduleImpactNotice impact={scheduleImpact} />

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

          <TaskHistory history={taskHistory} />

          <FormActions isSubmitting={isSubmitting} hasErrors={hasFieldErrors} onCancel={handleCancel} />
        </form>

        <DeleteTaskSection taskId={initialTask.id} taskTitle={initialTask.title} onDeleteClick={openDeleteDialog} />
      </div>
    </>
  );
}
