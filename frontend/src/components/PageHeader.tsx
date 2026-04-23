import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 rounded-[2rem] bg-moss-900 px-6 py-7 text-white shadow-soft md:flex-row md:items-end md:justify-between md:px-8">
      <div className="max-w-2xl space-y-3">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-moss-200">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-2">
          <h1 className="font-display text-4xl leading-none md:text-5xl">{title}</h1>
          <p className="max-w-xl text-sm text-moss-100 md:text-base">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
