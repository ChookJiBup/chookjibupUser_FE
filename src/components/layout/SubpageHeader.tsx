import type { ReactNode } from "react";

export function SubpageHeader({
  title,
  leading,
  trailing,
}: {
  title: string;
  leading: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="sticky top-0 z-40 flex min-h-[calc(48px+var(--app-safe-top))] items-end justify-between gap-2 border-b border-zinc-100 bg-white px-5 pb-3 pt-[calc(12px+var(--app-safe-top))]">
      <div className="flex items-center gap-2">
        {leading}
        <h1 className="body-large-bold text-zinc-950">{title}</h1>
      </div>
      {trailing}
    </div>
  );
}
