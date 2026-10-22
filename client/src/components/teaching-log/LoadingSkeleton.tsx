export default function LoadingSkeleton() {
  return (
    <div className="space-y-4 w-full animate-pulse">
      {/* Filters loading skeleton */}
      <div className="bg-white rounded-xl border border-gray-150 p-4 flex gap-3 flex-wrap">
        <div className="h-10 bg-gray-100 rounded-lg flex-1 min-w-[200px]" />
        <div className="h-10 bg-gray-100 rounded-lg w-36" />
        <div className="h-10 bg-gray-100 rounded-lg w-36" />
        <div className="h-10 bg-gray-100 rounded-lg w-32" />
      </div>

      {/* Table loading skeleton */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="h-5 bg-gray-100 rounded w-1/4" />
          <div className="h-4 bg-gray-100 rounded w-20" />
        </div>
        <div className="p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 justify-between border-b pb-4 last:border-0 last:pb-0">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-100 rounded w-1/3" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
              <div className="h-6 bg-gray-100 rounded w-16" />
              <div className="h-8 bg-gray-100 rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
