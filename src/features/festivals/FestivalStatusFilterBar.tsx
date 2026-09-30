import type { ReactNode } from "react";

interface StatusFilterOption {
  value: string;
  label: ReactNode;
}

export function FestivalStatusFilterBar({
  leading,
  options,
  value,
  onChange,
  className = "",
}: {
  leading: ReactNode;
  options: StatusFilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div
      className={`flex h-[46px] items-center border-b border-zinc-100 bg-white px-5 ${className}`}
    >
      <div className="relative mr-2 flex h-4 shrink-0 items-center border-r border-zinc-200 pr-4">
        {leading}
      </div>
      <div className="flex h-full min-w-0 flex-1 justify-between overflow-x-auto">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`body-small flex h-full shrink-0 items-center justify-center gap-1.5 border-b-2 px-2 ${
              value === option.value
                ? "border-zinc-900 font-semibold text-zinc-900"
                : "border-transparent text-zinc-400"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
