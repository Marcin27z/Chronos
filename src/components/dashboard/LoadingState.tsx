/**
 * LoadingState Component
 *
 * Skeleton loader wyświetlany podczas początkowego ładowania danych Dashboard.
 * Odzwierciedla strukturę docelowego widoku dla lepszego UX.
 */

export function LoadingState() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 bg-muted animate-pulse rounded-md" />
        <div className="h-4 w-48 bg-muted animate-pulse rounded-md" />
      </div>

      {/* Task cards skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-6 w-3/4 bg-muted animate-pulse rounded-md" />
                <div className="h-4 w-1/2 bg-muted animate-pulse rounded-md" />
              </div>
              <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-24 bg-muted animate-pulse rounded-md" />
              <div className="h-10 w-24 bg-muted animate-pulse rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Summary skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-4 space-y-2">
            <div className="h-4 w-24 bg-muted animate-pulse rounded-md" />
            <div className="h-8 w-16 bg-muted animate-pulse rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
