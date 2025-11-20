import { useTaskList } from "@/lib/hooks/useTaskList";
import { TaskListHeader } from "./TaskListHeader";
import { TaskSortFilter } from "./TaskSortFilter";
import { TaskGrid } from "./TaskGrid";
import { Pagination } from "./Pagination";
import { EmptyState } from "./EmptyState";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { TaskDeleteDialog } from "./TaskDeleteDialog";

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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Loading State */}
      {state.isLoading && <LoadingState />}

      {/* Error State */}
      {!state.isLoading && state.error && <ErrorState error={state.error} onRetry={actions.handleRetry} />}

      {/* Empty State */}
      {!state.isLoading && !state.error && state.data?.data.length === 0 && <EmptyState />}

      {/* Data State */}
      {!state.isLoading && !state.error && state.data && state.data.data.length > 0 && (
        <>
          {/* Header */}
          <TaskListHeader totalCount={state.data.pagination.total} />

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
