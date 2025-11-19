/**
 * LoadingState component
 * Skeleton loader wyświetlany podczas ładowania listy zadań
 */
export function LoadingState() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="h-10 w-64 bg-muted animate-pulse rounded" />

      {/* Sort controls skeleton */}
      <div className="flex items-center gap-4">
        <div className="h-10 w-48 bg-muted animate-pulse rounded" />
        <div className="h-10 w-10 bg-muted animate-pulse rounded" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="border rounded-lg p-6 space-y-4">
            {/* Title */}
            <div className="h-6 bg-muted animate-pulse rounded" />
            {/* Description */}
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            {/* Meta info */}
            <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
            {/* Action button */}
            <div className="h-8 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
