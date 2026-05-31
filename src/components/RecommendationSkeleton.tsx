export default function RecommendationSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden animate-pulse">
      <div className="flex gap-4 p-5">
        <div className="flex-shrink-0 w-16 h-24 rounded-lg bg-stone-200" />
        <div className="flex-1 space-y-2.5 py-1">
          <div className="flex justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="h-4 bg-stone-200 rounded w-3/4" />
              <div className="h-3 bg-stone-100 rounded w-1/2" />
            </div>
            <div className="h-6 w-16 bg-stone-100 rounded-full" />
          </div>
          <div className="h-3 bg-stone-100 rounded w-full" />
          <div className="h-3 bg-stone-100 rounded w-5/6" />
          <div className="flex gap-1.5 pt-1">
            <div className="h-5 w-16 bg-stone-100 rounded-full" />
            <div className="h-5 w-16 bg-stone-100 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
