"use client";

import { useEffect, useState } from "react";
import { CheckCircledIcon, CrossCircledIcon } from "@radix-ui/react-icons";

export type ToastTone = "success" | "error";

/** 화면 하단 토스트. 카카오맵류 스낵바처럼 짧게 떴다 사라진다. */
export function SuccessToast({ message, tone = "success" }: { message: string; tone?: ToastTone }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className="pointer-events-none fixed bottom-[calc(24px+var(--app-safe-bottom))] left-1/2 z-50 w-full max-w-[var(--app-max-width)] -translate-x-1/2 px-5"
    >
      <div className="mx-auto flex w-fit max-w-full items-center gap-2 rounded-xl bg-zinc-900/90 px-4 py-3 text-white shadow-lg">
        {tone === "error" ? (
          <CrossCircledIcon className="size-4 shrink-0" aria-hidden />
        ) : (
          <CheckCircledIcon className="size-4 shrink-0" aria-hidden />
        )}
        <p className="body-small break-keep">{message}</p>
      </div>
    </div>
  );
}

/** 메시지를 잠깐 보여 주는 토스트 상태. */
export function useSuccessToast(durationMs = 2500) {
  const [toastState, setToastState] = useState<{ message: string; tone: ToastTone } | null>(null);

  useEffect(() => {
    if (!toastState) return;
    const timer = window.setTimeout(() => setToastState(null), durationMs);
    return () => window.clearTimeout(timer);
  }, [toastState, durationMs]);

  function showToast(message: string, tone: ToastTone = "success") {
    setToastState({ message, tone });
  }

  return {
    toast: toastState ? <SuccessToast message={toastState.message} tone={toastState.tone} /> : null,
    showToast,
  };
}
