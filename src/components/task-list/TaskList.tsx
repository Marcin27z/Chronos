import { useTaskList } from "@/lib/hooks/useTaskList";
import { TaskListHeader } from "./TaskListHeader";
import { TaskSortFilter } from "./TaskSortFilter";
import { TaskGrid } from "./TaskGrid";
import { Pagination } from "./Pagination";
import { EmptyState } from "./EmptyState";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { TaskDeleteDialog } from "./TaskDeleteDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

/**
 * TaskList component
 * Główny kontener widoku listy zadań
 * Zarządza stanem, pobieraniem danych i orkiestruje wszystkie podkomponenty
 */
interface TaskListProps {
  token: string;
}

export function TaskList({ token }: TaskListProps) {
  const { state, deleteState, actions } = useTaskList(token);
  const hasTasks = Boolean(state.data && state.data.data.length > 0);
  const showDataState = !state.isLoading && !state.error && hasTasks;

  return (
    <div className="container mx-auto px-4 py-8" data-testid="tasks-page">
      {showDataState && state.data && (
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TaskListHeader totalCount={state.data.pagination.total} />
          <Button asChild size="sm">
            <a
              className="flex items-center gap-2"
              href="/tasks/new"
              aria-label="Dodaj nowe zadanie"
              data-testid="tasks-add-new"
            >
              <Plus className="h-4 w-4" />
              Dodaj zadanie
            </a>
          </Button>
        </div>
      )}

      {/* Loading State */}
      {state.isLoading && <LoadingState />}

      {/* Error State */}
      {!state.isLoading && state.error && <ErrorState error={state.error} onRetry={actions.handleRetry} />}

      {/* Empty State */}
      {!state.isLoading && !state.error && state.data?.data.length === 0 && <EmptyState />}

      {/* Data State */}
      {showDataState && state.data && (
        <>
          {/* Sort Controls */}
          <TaskSortFilter sortConfig={state.sortConfig} onSortChange={actions.handleSortChange} />

          {/* Task Grid */}
          <TaskGrid tasks={state.data.data} onDelete={actions.handleDeleteClick} />

          {/* Pagination */}
          {state.data.pagination.total > 50 && (
            <Pagination
              pagination={state.data.pagination}
              currentPage={state.currentPage}
              onPageChange={actions.handlePageChange}
            />
          )}
        </>
      )}

      {/* Delete Dialog */}
      <TaskDeleteDialog
        isOpen={deleteState.isOpen}
        task={deleteState.task}
        isDeleting={deleteState.isDeleting}
        onClose={actions.handleDeleteClose}
        onConfirm={actions.handleDeleteConfirm}
      />
    </div>
  );
}
