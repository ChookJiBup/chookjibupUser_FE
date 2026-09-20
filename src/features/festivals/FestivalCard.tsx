"use client";

import { HeartIcon } from "@/components/icons/HeartIcon";

import { type InfiniteData, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { useState } from "react";
import { ChatBubbleIcon } from "@radix-ui/react-icons";
import { FestivalImage } from "./FestivalImage";
import { toggleWishlist } from "@/features/wishlist/api";
import { useUserAuthHasHydrated, useUserAuthStore } from "@/store/userAuthStore";
import type {
  FestivalProgressStatus,
  UserFestivalPageResponse,
  UserFestivalResponse,
} from "./types";

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

const WEEKDAY_LABEL = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 서버가 주는 `2026-07-31`을 시안의 한글 표기(`2026년 7월 31일(금)`)로 바꾼다.
 *
 * <p>날짜 구분자를 하이픈으로 통일한 규칙은 숫자 표기에만 적용되는 것이라, 시안이
 * 한글 서술형으로 그려 둔 자리는 그대로 한글로 적는다.</p>
 *
 * <p>`new Date("2026-07-31")`은 UTC 자정으로 읽혀 한국에서는 하루가 밀릴 수 있으므로
 * 연·월·일을 직접 꺼내 로컬 달력으로 만든다.</p>
 */
export function formatKoreanDate(date: string | null, options?: { withWeekday?: boolean }) {
  if (!date) return null;
  const matched = /^(\d{4})-(\d{2})-(\d{2})/.exec(date.trim());
  if (!matched) return date;

  const [, year, month, day] = matched;
  const text = `${year}년 ${Number(month)}월 ${Number(day)}일`;
  if (!options?.withWeekday) return text;

  const local = new Date(Number(year), Number(month) - 1, Number(day));
  return `${text}(${WEEKDAY_LABEL[local.getDay()]})`;
}

/**
 * 도로명주소 앞부분만 잘라 «인천광역시 연수구»처럼 지역만 보여 준다.
 *
 * <p>상세 헤더는 한 줄에 지역과 기간을 같이 두는데, 전체 주소를 그대로 넣으면 줄이
 * 넘쳐 기간이 잘린다. 주소가 없는 축제는 행사장소 이름으로 대신한다.</p>
 */
export function formatShortRegion(address: string | null, eventPlace: string | null) {
  const tokens = address?.trim().split(/\s+/) ?? [];
  if (tokens.length >= 2) return `${tokens[0]} ${tokens[1]}`;
  return address ?? eventPlace ?? null;
}

export function FestivalThumbnail({
  size = 64,
  className = "",
  imageUrl,
}: {
  size?: number;
  className?: string;
  imageUrl?: string | null;
}) {
  return (
    <FestivalImage
      imageUrl={imageUrl}
      className={className}
      style={{ width: className ? undefined : size, height: size }}
    />
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
        <HeartIcon className="size-4" />
        {wishlistCount}
      </span>
      <span className="body-caption flex items-center gap-1 text-zinc-400">
        <ChatBubbleIcon className="size-3.5" />
        {reviewCount}
      </span>
    </div>
  );
}

export function WishlistHeart({
  festival,
  showWhenLoggedOut = false,
}: {
  festival: UserFestivalResponse;
  showWhenLoggedOut?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const hasHydrated = useUserAuthHasHydrated();
  const session = useUserAuthStore((state) => state.session);
  const isLoggedIn = hasHydrated && session !== null;

  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (pending) return;
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    setPending(true);
    setErrorMessage("");
    try {
      const result = await toggleWishlist(festival.id);
      const updatePage = (page: UserFestivalPageResponse): UserFestivalPageResponse => ({
        ...page,
        items: page.items.map((item) =>
          item.id === festival.id
            ? {
                ...item,
                wishlisted: result.wishlisted,
                wishlistCount: Math.max(
                  0,
                  item.wishlistCount +
                    (item.wishlisted === result.wishlisted ? 0 : result.wishlisted ? 1 : -1),
                ),
              }
            : item,
        ),
      });
      await queryClient.cancelQueries({ queryKey: ["festivals"] });
      queryClient.setQueriesData<UserFestivalPageResponse | InfiniteData<UserFestivalPageResponse>>(
        { queryKey: ["festivals"] },
        (data) =>
          !data
            ? data
            : "pages" in data
              ? { ...data, pages: data.pages.map(updatePage) }
              : updatePage(data),
      );
      await Promise.all(
        [
          ["festivals"],
          ["festival-search"],
          ["wishlist-tab"],
          ["my-wishlist"],
          ["festivals-map"],
          ["festival", festival.id],
        ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "찜을 저장하지 못했습니다. 다시 시도해 주세요."));
    } finally {
      setPending(false);
    }
  }

  if (!isLoggedIn && !showWhenLoggedOut) return null;

  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-label={festival.wishlisted ? "찜 취소" : "찜하기"}
        aria-pressed={festival.wishlisted}
        className={`inline-flex size-8 shrink-0 items-center justify-center ${festival.wishlisted ? "text-red-500" : "text-zinc-950"}`}
      >
        <HeartIcon filled={festival.wishlisted} aria-hidden className="size-4" />
      </button>
      {errorMessage && (
        <span
          role="alert"
          className="body-caption absolute right-0 top-full z-30 w-44 rounded-lg border border-red-300 bg-white p-2 text-red-600 shadow-sm"
        >
          {errorMessage}
        </span>
      )}
    </span>
  );
}

export function FestivalCard({ festival }: { festival: UserFestivalResponse }) {
  return (
    <Link
      href={`/festivals/${festival.id}`}
      className="flex items-start gap-3 border-b border-zinc-200 py-4"
    >
      <FestivalThumbnail imageUrl={festival.imageUrl} />
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
