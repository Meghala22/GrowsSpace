export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-clay-200 bg-clay-50 px-4 py-3 text-sm text-clay-800">
      {message}
    </div>
  );
}
