import { Button } from "@/components/ui/button";
import { ListTodo } from "lucide-react";

/**
 * EmptyState Component
 *
 * Komponent wyświetlany gdy użytkownik nie ma żadnych zadań.
 * Zachęca do utworzenia pierwszego zadania.
 */

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-primary/10 p-4 mb-4">
        <ListTodo className="h-12 w-12 text-primary" />
      </div>

      <h2 className="text-2xl font-semibold mb-2">Brak zadań</h2>

      <p className="text-muted-foreground mb-6 max-w-md">
        Nie masz jeszcze żadnych zadań cyklicznych. Utwórz pierwsze zadanie i zacznij organizować swoje powtarzalne
        obowiązki.
      </p>

      <Button asChild>
        <a href="/tasks/new">Utwórz pierwsze zadanie</a>
      </Button>
    </div>
  );
}
