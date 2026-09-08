"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { ChatBubbleIcon, HeartFilledIcon, HeartIcon, ImageIcon } from "@radix-ui/react-icons";
import { toggleWishlist } from "@/features/wishlist/api";
import { useUserAuthHasHydrated, useUserAuthStore } from "@/store/userAuthStore";
import type { FestivalProgressStatus, UserFestivalResponse } from "./types";

export const STATUS_LABEL: Record<FestivalProgressStatus, string> = {
  UPCOMING: "진행 예정",
  ONGOING: "진행중",
  COMPLETED: "진행 완료",
};

export const STATUS_BADGE_CLASS: Record<FestivalProgressStatus, string> = {
  ONGOING: "bg-point-600 text-white",
  UPCOMING: "bg-secondary-600 text-white",
  COMPLETED: "bg-zinc-200 text-zinc-500",
};

export function StatusBadge({ status }: { status: FestivalProgressStatus | null }) {
  if (!status) return null;
  return (
    <span
      className={`body-caption shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 ${STATUS_BADGE_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function formatDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return "일정 미정";
  return `${startDate} ~ ${endDate}`;
}

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
 * 찜/리뷰 개수 표시. 로그인 여부와 무관하게 항상 보인다(하트 버튼은 로그인해야만
 * 액션이 가능해서 비로그인 시 숨기지만, "몇 명이 찜했는지" 숫자 자체는 누구나 볼 수 있는
 * 공개 정보다).
 */
export function FestivalStats({
  wishlistCount,
  reviewCount,
}: {
  wishlistCount: number;
  reviewCount: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="body-caption flex items-center gap-1 text-zinc-400">
        <HeartIcon className="size-3.5" />
        {wishlistCount}
      </span>
      <span className="body-caption flex items-center gap-1 text-zinc-400">
        <ChatBubbleIcon className="size-3.5" />
        {reviewCount}
      </span>
    </div>
  );
}

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
      {festival.wishlisted ? (
        <HeartFilledIcon className="size-5" />
      ) : (
        <HeartIcon className="size-5" />
      )}
    </button>
  );
}

export function FestivalCard({ festival }: { festival: UserFestivalResponse }) {
  return (
    <Link
      href={`/festivals/${festival.id}`}
      className="flex items-start gap-3 border-b border-zinc-200 px-4 py-4"
    >
      <FestivalThumbnail />
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start gap-2">
          <p className="body-regular-bold min-w-0 flex-1 text-zinc-950">{festival.name}</p>
          <StatusBadge status={festival.progressStatus} />
        </div>
        <p className="body-small text-zinc-500">{festival.eventPlace ?? festival.address ?? ""}</p>
        <p className="body-caption text-zinc-400">
          {formatDateRange(festival.startDate, festival.endDate)}
        </p>
        <FestivalStats wishlistCount={festival.wishlistCount} reviewCount={festival.reviewCount} />
      </div>
      <WishlistHeart festival={festival} />
    </Link>
  );
}
