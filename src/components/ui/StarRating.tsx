"use client";

import { useRef } from "react";
import type { KeyboardEvent } from "react";
import { StarFilledIcon, StarIcon } from "@radix-ui/react-icons";

const STARS = [1, 2, 3, 4, 5] as const;
const MAX_RATING = 5;

/**
 * 별점 컴포넌트. onChange가 있으면 값을 고를 수 있는 입력용, 없으면 읽기 전용
 * (리뷰 목록·평균 평점 표시용)으로 동작한다.
 *
 * <p>읽기 전용일 때는 4.5 같은 소수 평균을 반 별로 그린다. 예전처럼 반올림해서 넘기면
 * 4.5가 별 다섯 개로 보여 실제 평점보다 후하게 읽힌다.</p>
 */
export function StarRating({
  value,
  onChange,
  size = 20,
  gap = 4,
  label = "별점",
}: {
  value: number;
  onChange?: (next: number) => void;
  size?: number;
  /** 별 사이 간격(px). 작은 별을 촘촘히 붙여야 하는 리뷰 카드에서 줄여 쓴다. */
  gap?: number;
  /** 스크린리더가 읽어 줄 이 별점의 이름. 한 화면에 별점이 여러 개일 때 구분용. */
  label?: string;
}) {
  if (!onChange) {
    return <StaticStarRating value={value} size={size} gap={gap} label={label} />;
  }
  return <StarRatingInput value={value} onChange={onChange} size={size} label={label} />;
}

function StaticStarRating({
  value,
  size,
  gap,
  label,
}: {
  value: number;
  size: number;
  gap: number;
  label: string;
}) {
  return (
    <div
      className="flex items-center"
      style={{ gap }}
      role="img"
      aria-label={`${label} ${MAX_RATING}점 만점에 ${formatRating(value)}점`}
    >
      {STARS.map((star) => (
        <PartialStar key={star} size={size} fillRatio={clamp01(value - (star - 1))} />
      ))}
    </div>
  );
}

/**
 * 반 별을 그리기 위한 조각. 라디오 아이콘 세트에는 «반만 칠해진 별»이 없어서,
 * 빈 별 위에 꽉 찬 별을 얹고 채울 비율만큼만 가로로 잘라 보여 준다.
 */
function PartialStar({ size, fillRatio }: { size: number; fillRatio: number }) {
  return (
    <span
      className="relative inline-flex shrink-0"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <StarIcon width={size} height={size} className="text-point-500" />
      {fillRatio > 0 ? (
        <span
          className="absolute inset-y-0 left-0 overflow-hidden"
          style={{ width: `${fillRatio * 100}%` }}
        >
          <StarFilledIcon width={size} height={size} className="text-point-500" />
        </span>
      ) : null}
    </span>
  );
}

function StarRatingInput({
  value,
  onChange,
  size,
  label,
}: {
  value: number;
  onChange: (next: number) => void;
  size: number;
  label: string;
}) {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  /**
   * 라디오 그룹은 Tab으로 그룹에 들어온 뒤 방향키로 값을 옮기는 게 표준 동작이다.
   * 별 하나하나를 Tab으로 훑게 두면 폼을 키보드로 넘어갈 때 다섯 번을 눌러야 한다.
   */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowUp"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? -1
          : 0;
    if (step === 0) return;

    event.preventDefault();
    const next = Math.min(MAX_RATING, Math.max(1, value + step));
    onChange(next);
    buttonsRef.current[next - 1]?.focus();
  }

  // 아직 아무것도 고르지 않았으면 첫 별이 Tab 순서를 받는다(그래야 그룹에 진입할 수 있다).
  const focusableStar = value >= 1 && value <= MAX_RATING ? value : 1;

  return (
    <div
      className="flex items-center gap-2"
      role="radiogroup"
      aria-label={label}
      onKeyDown={handleKeyDown}
    >
      {STARS.map((star) => {
        const filled = star <= value;
        const Icon = filled ? StarFilledIcon : StarIcon;
        return (
          <button
            key={star}
            ref={(element) => {
              buttonsRef.current[star - 1] = element;
            }}
            type="button"
            role="radio"
            aria-checked={star === value}
            aria-label={`${MAX_RATING}점 만점에 ${star}점`}
            tabIndex={star === focusableStar ? 0 : -1}
            onClick={() => onChange(star)}
            className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-point-600"
          >
            <Icon
              width={size}
              height={size}
              className={filled ? "text-point-500" : "text-zinc-300"}
            />
          </button>
        );
      })}
    </div>
  );
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** 정수 평점은 `4`, 소수는 `4.5`로 읽어 준다(`4.0점`은 어색하다). */
function formatRating(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
