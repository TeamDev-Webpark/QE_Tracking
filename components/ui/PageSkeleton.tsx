/** Placeholder shown while page data streams in. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" className="animate-pulse space-y-6">
      <div className="h-9 w-64 rounded-control bg-surface" />
      <div className="h-64 rounded-card bg-surface shadow-card" />
    </div>
  );
}
