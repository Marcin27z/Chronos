import { ClipboardList } from "lucide-react";

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
        Nie masz jeszcze żadnych zadań. Zadania możesz tworzyć w osobnym widoku.
      </p>
    </div>
  );
}
