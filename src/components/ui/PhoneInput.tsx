"use client";

import type { ComponentProps } from "react";
import { Input } from "@/components/ui/Input";

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

interface PhoneInputProps extends Omit<
  ComponentProps<typeof Input>,
  "type" | "value" | "onChange"
> {
  value: string;
  onValueChange: (value: string) => void;
}

export function PhoneInput({ value, onValueChange, ...props }: PhoneInputProps) {
  return (
    <Input
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      maxLength={13}
      value={value}
      onChange={(event) => onValueChange(formatPhoneNumber(event.target.value))}
      {...props}
    />
  );
}
