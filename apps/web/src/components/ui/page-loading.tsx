export function PageLoading() {
  return <div role="status" aria-label="Loading page" className="space-y-6">
    <span className="sr-only">Loading your community. Navigation is still available.</span>
    <div aria-hidden="true" className="space-y-3"><div className="h-8 w-52 rounded-lg bg-line/70" /><div className="h-4 w-72 max-w-full rounded bg-line/50" /></div>
    <div aria-hidden="true" className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-28 rounded-panel border border-line bg-white" />)}</div>
    <div aria-hidden="true" className="divide-y divide-line rounded-panel border border-line bg-white px-5">{Array.from({ length: 4 }, (_, i) => <div key={i} className="space-y-3 py-5"><div className="h-4 w-2/3 rounded bg-line/60" /><div className="h-3 w-1/2 rounded bg-line/40" /></div>)}</div>
  </div>;
}
