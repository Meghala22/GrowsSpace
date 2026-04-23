import type { ReactNode } from "react";

export function EmptyBlock({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-start gap-4 px-6 py-8">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        <p className="text-sm text-moss-700">{description}</p>
      </div>
      {action}
    </div>
  );
}
