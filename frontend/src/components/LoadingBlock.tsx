export function LoadingBlock({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="panel flex min-h-40 items-center justify-center px-6 py-12 text-sm font-medium text-moss-700">
      <div className="flex items-center gap-3">
        <span className="h-3 w-3 animate-pulse rounded-full bg-moss-500" />
        <span>{label}</span>
      </div>
    </div>
  );
}
