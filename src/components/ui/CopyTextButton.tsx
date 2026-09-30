"use client";

import { useEffect, useRef, useState } from "react";

interface CopyTextButtonProps {
  value: string;
  className?: string;
  ariaLabel?: string;
}

export function CopyTextButton({
  value,
  className = "",
  ariaLabel = "텍스트 복사",
}: CopyTextButtonProps) {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    },
    [],
  );

  const handleCopy = async () => {
    if (!(await copyText(value))) return;

    setCopied(true);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={ariaLabel}
      className={`shrink-0 text-zinc-500 underline ${className}`}
    >
      <span aria-live="polite">{copied ? "복사 완료" : "복사"}</span>
    </button>
  );
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Clipboard API가 차단된 환경에서는 레거시 방식을 사용한다.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.readOnly = true;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}
