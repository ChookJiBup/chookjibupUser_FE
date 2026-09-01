import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "outline" | "destructive" | "link" | "ghost";
export type ButtonSize = "default" | "lg" | "sm";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  icon?: ReactNode;
  selected?: boolean;
}

const BASE_STYLES =
  "inline-flex items-center justify-center rounded-md whitespace-nowrap transition-colors disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400";

const SIZE_STYLES: Record<ButtonSize, string> = {
  default: "body-regular gap-2.5 px-4 py-2",
  lg: "body-large gap-2.5 px-4 py-3",
  sm: "body-small gap-1 px-4 py-1",
};

const SIZE_STYLES_SELECTED: Record<ButtonSize, string> = {
  default: "body-regular-bold gap-2.5 px-4 py-2",
  lg: "body-large-bold gap-2.5 px-4 py-3",
  sm: "body-small-bold gap-1 px-4 py-1",
};

const ICON_SIZE: Record<ButtonSize, string> = {
  default: "size-4",
  lg: "size-6",
  sm: "size-3.5",
};

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary-500 disabled:bg-zinc-200 disabled:text-zinc-400",
  outline:
    "border border-zinc-300 bg-white text-zinc-950 hover:bg-zinc-100 disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400",
  destructive: "bg-error text-white hover:bg-red-600 disabled:bg-zinc-200 disabled:text-zinc-400",
  link: "text-zinc-950 hover:underline disabled:text-zinc-400",
  ghost: "text-zinc-950 hover:bg-zinc-100 disabled:text-zinc-400",
};

export function Button({
  variant = "primary",
  size = "default",
  type = "button",
  icon,
  selected = false,
  className,
  children,
  ...props
}: ButtonProps) {
  const isGhostSelected = variant === "ghost" && selected;

  return (
    <button
      type={type}
      className={cn(
        BASE_STYLES,
        isGhostSelected ? SIZE_STYLES_SELECTED[size] : SIZE_STYLES[size],
        VARIANT_STYLES[variant],
        isGhostSelected && "text-primary hover:bg-transparent",
        className,
      )}
      {...props}
    >
      {icon ? (
        <span className={cn("shrink-0 [&>svg]:size-full", ICON_SIZE[size])}>{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
