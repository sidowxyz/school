export default function LoadingSkeleton() {
  return (
    <div className="space-y-4 w-full animate-pulse">
      {/* Filters loading skeleton */}
      <div className="bg-card rounded-xl border border-border p-4 flex gap-3 flex-wrap">
        <div className="h-10 bg-muted rounded-lg flex-1 min-w-[200px]" />
        <div className="h-10 bg-muted rounded-lg w-36" />
        <div className="h-10 bg-muted rounded-lg w-36" />
        <div className="h-10 bg-muted rounded-lg w-32" />
      </div>

      {/* Table loading skeleton */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="h-5 bg-muted rounded w-1/4" />
          <div className="h-4 bg-muted rounded w-20" />
        </div>
        <div className="p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 justify-between border-b pb-4 last:border-0 last:pb-0">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
              <div className="h-6 bg-muted rounded w-16" />
              <div className="h-8 bg-muted rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
