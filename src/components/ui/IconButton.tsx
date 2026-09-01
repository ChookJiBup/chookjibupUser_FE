import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type IconButtonVariant = "default" | "ghost";
export type IconButtonSize = "default" | "lg" | "sm";

const SIZE_CLASSES: Record<IconButtonSize, string> = {
  default: "size-8",
  lg: "size-9",
  sm: "size-7",
};

const ICON_SIZE_CLASSES: Record<IconButtonSize, string> = {
  default: "size-4",
  lg: "size-5",
  sm: "size-3",
};

export type IconButtonProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "children" | "aria-label"
> & {
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  iconClassName?: string;
  "aria-label": string;
};

export function IconButton({
  icon,
  variant = "default",
  size = "default",
  className,
  iconClassName,
  "aria-label": ariaLabel,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full p-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 disabled:pointer-events-none disabled:opacity-50",
        SIZE_CLASSES[size],
        variant === "default" ? "bg-white hover:bg-zinc-100" : "bg-transparent",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center",
          iconClassName ?? ICON_SIZE_CLASSES[size],
        )}
      >
        {icon}
      </span>
    </button>
  );
}
