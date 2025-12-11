import { ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SortConfig } from "@/lib/types/task-list.viewmodel";

interface TaskSortFilterProps {
  sortConfig: SortConfig;
  onSortChange: (field: SortConfig["field"], direction: SortConfig["direction"]) => void;
}

/**
 * TaskSortFilter component
 * Kontrolki sortowania listy zadań - wybór pola sortowania i kierunku
 */
export function TaskSortFilter({ sortConfig, onSortChange }: TaskSortFilterProps) {
  const handleFieldChange = (value: string) => {
    onSortChange(value as SortConfig["field"], sortConfig.direction);
  };

  const toggleDirection = () => {
    const newDirection = sortConfig.direction === "asc" ? "desc" : "asc";
    onSortChange(sortConfig.field, newDirection);
  };

  return (
    <div className="flex items-center gap-4 mb-6" data-testid="tasks-sort-controls">
      <div className="flex items-center gap-2">
        <label htmlFor="sort-field" className="text-sm font-medium">
          Sortuj po:
        </label>
        <Select value={sortConfig.field} onValueChange={handleFieldChange}>
          <SelectTrigger id="sort-field" className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="next_due_date">Dacie wykonania</SelectItem>
            <SelectItem value="title">Tytule</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={toggleDirection}
        aria-label={sortConfig.direction === "asc" ? "Sortuj malejąco" : "Sortuj rosnąco"}
        data-testid="tasks-sort-direction-toggle"
      >
        {sortConfig.direction === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
      </Button>
    </div>
  );
}
