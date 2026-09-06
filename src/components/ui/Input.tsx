"use client";

import { useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type InputLayout = "default" | "label-left" | "with-button";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  helperText?: ReactNode;
  helperTextClassName?: string;
  errorText?: string;
  layout?: InputLayout;
  button?: ReactNode;
  wrapperClassName?: string;
}

export function Input({
  label,
  helperText,
  helperTextClassName = "body-small text-zinc-500",
  errorText,
  layout = "default",
  button,
  required,
  disabled,
  id,
  className,
  wrapperClassName,
  "aria-describedby": ariaDescribedBy,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const isError = Boolean(errorText);
  const describedBy =
    [isError ? errorId : helperText ? helperId : null, ariaDescribedBy].filter(Boolean).join(" ") ||
    undefined;

  const labelElement = label ? (
    <label htmlFor={inputId} className="body-small-bold shrink-0 text-zinc-950">
      {label}
    </label>
  ) : null;

  const field = (
    <input
      id={inputId}
      disabled={disabled}
      required={required}
      aria-invalid={isError || undefined}
      aria-describedby={describedBy}
      className={cn(
        "body-regular w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-zinc-950 caret-point-600 outline-none transition-colors placeholder:text-zinc-400 focus:border-point-600 disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400",
        isError && "border-red-600 placeholder:text-red-600 focus:border-red-600",
        className,
      )}
      {...props}
    />
  );

  if (layout === "label-left") {
    return (
      <div className={cn("inline-flex items-center gap-3", wrapperClassName)}>
        {labelElement}
        {field}
      </div>
    );
  }

  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-1", wrapperClassName)}>
      {labelElement}
      {layout === "with-button" ? (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">{field}</div>
          {button}
        </div>
      ) : (
        field
      )}
      {isError ? (
        <p id={errorId} className="body-small text-red-600">
          {errorText}
        </p>
      ) : helperText ? (
        <p id={helperId} className={helperTextClassName}>
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
