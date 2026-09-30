"use client";

import { QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface HelpTooltipProps {
  label: string;
  hint: string;
}

const VIEWPORT_PADDING = 12;
const TOOLTIP_GAP = 4;
const TOOLTIP_MAX_WIDTH = 220;

export function HelpTooltip({ label, hint }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const tooltipId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLParagraphElement>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltipRef.current?.getBoundingClientRect();
    const tooltipWidth = tooltipRect?.width ?? Math.min(TOOLTIP_MAX_WIDTH, window.innerWidth - 24);
    const tooltipHeight = tooltipRect?.height ?? 32;
    const preferredTop = triggerRect.top - TOOLTIP_GAP - tooltipHeight;
    const fallbackTop = triggerRect.bottom + TOOLTIP_GAP;
    const maxTop = Math.max(
      VIEWPORT_PADDING,
      window.innerHeight - VIEWPORT_PADDING - tooltipHeight,
    );
    const top = Math.min(
      maxTop,
      Math.max(VIEWPORT_PADDING, preferredTop >= VIEWPORT_PADDING ? preferredTop : fallbackTop),
    );
    const left = Math.min(
      window.innerWidth - VIEWPORT_PADDING - tooltipWidth / 2,
      Math.max(VIEWPORT_PADDING + tooltipWidth / 2, triggerRect.left + triggerRect.width / 2),
    );
    setPosition({ left, top });
  }, []);

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, hint, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target) || tooltipRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  return (
    <div className="relative flex items-center gap-1">
      <p className="body-small whitespace-nowrap text-zinc-500">{label}</p>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${label} 설명`}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={() => setOpen((current) => !current)}
        className="shrink-0 text-zinc-400"
      >
        <QuestionMarkCircledIcon aria-hidden className="size-3" />
      </button>
      {open
        ? createPortal(
            <p
              ref={tooltipRef}
              id={tooltipId}
              role="tooltip"
              className="body-caption fixed z-50 w-max max-w-[min(220px,calc(100vw-24px))] -translate-x-1/2 rounded-md bg-zinc-800 px-2 py-1 text-white"
              style={{ left: position.left, top: position.top }}
            >
              {hint}
            </p>,
            document.body,
          )
        : null}
    </div>
  );
}
