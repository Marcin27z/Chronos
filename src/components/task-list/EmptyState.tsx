import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * EmptyState component
 * Wyświetlany gdy użytkownik nie ma jeszcze żadnych zadań
 */
export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <ClipboardList className="h-16 w-16 text-muted-foreground mb-4" />
      <h2 className="text-2xl font-semibold mb-2">Brak zadań</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Nie masz jeszcze żadnych zadań. Zacznij od dodania swojego pierwszego zadania.
      </p>
      <Button asChild size="lg">
        <a
          className="flex items-center gap-2"
          href="/tasks/new"
          aria-label="Dodaj pierwsze zadanie"
          data-testid="tasks-add-first"
        >
          <Plus className="h-5 w-5" />
          Dodaj pierwsze zadanie
        </a>
      </Button>
    </div>
  );
}
