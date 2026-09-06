"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { HeartFilledIcon, HeartIcon, ImageIcon } from "@radix-ui/react-icons";
import { toggleWishlist } from "@/features/wishlist/api";
import { useUserAuthHasHydrated, useUserAuthStore } from "@/store/userAuthStore";
import type { FestivalProgressStatus, UserFestivalResponse } from "./types";

export const STATUS_LABEL: Record<FestivalProgressStatus, string> = {
  UPCOMING: "진행 예정",
  ONGOING: "진행중",
  COMPLETED: "진행 완료",
};

/** 진행 상태별 뱃지 색상. 디자인 토큰(globals.css)의 point/secondary/zinc 컬러를 그대로 쓴다. */
export const STATUS_BADGE_CLASS: Record<FestivalProgressStatus, string> = {
  ONGOING: "bg-point-600 text-white",
  UPCOMING: "bg-secondary-600 text-white",
  COMPLETED: "bg-zinc-200 text-zinc-500",
};

export function StatusBadge({ status }: { status: FestivalProgressStatus | null }) {
  if (!status) return null;
  return (
    <span className={`body-caption rounded-full px-2 py-0.5 ${STATUS_BADGE_CLASS[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function formatDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return "일정 미정";
  return `${startDate} ~ ${endDate}`;
}

/**
 * 축제 썸네일. [알려진 제약] 백엔드에 축제 이미지 URL 필드가 아직 없다(Figma 메모에도
 * "v1. BE API 썸네일 추가 필요"라고 적혀 있음) — 그래서 지금은 항상 이 회색 플레이스홀더만
 * 보여준다. 나중에 백엔드가 이미지 URL을 내려주면 이 컴포넌트 안에서 <img>로 바꾸면 된다.
 */
export function FestivalThumbnail({
  size = 64,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-lg bg-zinc-100 ${className}`}
      style={{ width: className ? undefined : size, height: size }}
    >
      <ImageIcon className="size-6 text-zinc-300" />
    </div>
  );
}

/**
 * 축제 목록/검색 결과에서 공통으로 쓰는 하트(찜) 버튼이다.
 * 목록·검색 화면 둘 다 이 컴포넌트를 그대로 재사용한다.
 */
export function WishlistHeart({ festival }: { festival: UserFestivalResponse }) {
  const queryClient = useQueryClient();
  const hasHydrated = useUserAuthHasHydrated();
  const session = useUserAuthStore((state) => state.session);
  const isLoggedIn = hasHydrated && session !== null;

  const [pending, setPending] = useState(false);

  async function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    if (!isLoggedIn || pending) return;
    setPending(true);
    try {
      await toggleWishlist(festival.id);
      await queryClient.invalidateQueries({ queryKey: ["festivals"] });
      await queryClient.invalidateQueries({ queryKey: ["festival-search"] });
    } finally {
      setPending(false);
    }
  }

  if (!isLoggedIn) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={festival.wishlisted ? "찜 취소" : "찜하기"}
      className="shrink-0 text-point-600"
    >
      {festival.wishlisted ? <HeartFilledIcon className="size-5" /> : <HeartIcon className="size-5" />}
    </button>
  );
}

/**
 * 축제 목록/검색 결과의 한 줄. FestivalListPanel과 SearchPanel이 같이 쓴다 —
 * 화면마다 각자 카드를 새로 만들지 않도록 여기 하나로 모았다.
 */
export function FestivalCard({ festival }: { festival: UserFestivalResponse }) {
  return (
    <Link
      href={`/festivals/${festival.id}`}
      className="flex items-start gap-3 border-b border-zinc-200 px-4 py-4"
    >
      <FestivalThumbnail />
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <p className="body-regular-bold text-zinc-950">{festival.name}</p>
          <StatusBadge status={festival.progressStatus} />
        </div>
        <p className="body-small text-zinc-500">{festival.eventPlace ?? festival.address ?? ""}</p>
        <p className="body-caption text-zinc-400">
          {formatDateRange(festival.startDate, festival.endDate)}
        </p>
      </div>
      <WishlistHeart festival={festival} />
    </Link>
  );
}
