import { useEffect } from "react";

interface UseUnsavedChangesGuardOptions {
  hasUnsavedChanges: boolean;
  warningMessage?: string;
}

const DEFAULT_WARNING = "Masz niezapisane zmiany. Czy na pewno chcesz opuścić tę stronę?";

export const useUnsavedChangesGuard = ({
  hasUnsavedChanges,
  warningMessage = DEFAULT_WARNING,
}: UseUnsavedChangesGuardOptions) => {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;

      event.preventDefault();
      event.returnValue = warningMessage;
      return warningMessage;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges, warningMessage]);
};
