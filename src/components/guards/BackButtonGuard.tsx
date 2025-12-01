import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUnsavedChangesGuard } from "@/lib/hooks/useUnsavedChangesGuard";

interface BackButtonGuardProps {
  hasUnsavedChanges: boolean;
  warningMessage?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const DEFAULT_WARNING =
  "Masz niezapisane zmiany. Czy na pewno chcesz kontynuować i utracić postępy?";

export const BackButtonGuard = ({
  hasUnsavedChanges,
  warningMessage = DEFAULT_WARNING,
  onConfirm,
  onCancel,
}: BackButtonGuardProps) => {
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useUnsavedChangesGuard({ hasUnsavedChanges, warningMessage });

  const handleConfirm = useCallback(() => {
    if (pendingHref) {
      window.location.href = pendingHref;
    }

    onConfirm?.();
    setPendingHref(null);
    setIsDialogOpen(false);
  }, [onConfirm, pendingHref]);

  const handleCancel = useCallback(() => {
    onCancel?.();
    setPendingHref(null);
    setIsDialogOpen(false);
  }, [onCancel]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      setIsDialogOpen(false);
      return;
    }

    if (typeof document === "undefined") {
      return undefined;
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest("a");

      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute("href");
      const isExternal = anchor.target && anchor.target !== "_self";
      const isHash = href?.startsWith("#");

      if (!href || isExternal || isHash) {
        return;
      }

      event.preventDefault();
      setPendingHref(anchor.href);
      setIsDialogOpen(true);
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges || typeof window === "undefined") {
      return undefined;
    }

    const handlePopState = () => {
      setPendingHref(window.location.href);
      setIsDialogOpen(true);
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [hasUnsavedChanges]);

  const description = useMemo(() => warningMessage, [warningMessage]);

  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nie zapisano zmian</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            Pozostań
          </Button>
          <Button variant="default" onClick={handleConfirm} className="flex-1">
            Kontynuuj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

