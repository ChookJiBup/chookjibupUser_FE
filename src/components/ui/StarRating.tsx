"use client";

import { StarFilledIcon, StarIcon } from "@radix-ui/react-icons";

/**
 * 별점 컴포넌트. onChange가 있으면 클릭으로 값을 바꿀 수 있는 입력용,
 * 없으면 읽기 전용(리뷰 목록 표시용)으로 동작한다.
 */
export function StarRating({
  value,
  onChange,
  size = 20,
}: {
  value: number;
  onChange?: (next: number) => void;
  size?: number;
}) {
  const stars = [1, 2, 3, 4, 5];
  const readOnly = !onChange;

  return (
    <div
      className="flex items-center gap-1"
      role={readOnly ? undefined : "radiogroup"}
      aria-label="별점"
    >
      {stars.map((star) => {
        const filled = star <= value;
        const Icon = filled ? StarFilledIcon : StarIcon;
        if (readOnly) {
          return (
            <Icon key={star} width={size} height={size} className="text-point-500" aria-hidden />
          );
        }
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            aria-label={`${star}점`}
            aria-pressed={filled}
          >
            <Icon width={size} height={size} className="text-point-500" />
          </button>
        );
      })}
    </div>
  );
}
