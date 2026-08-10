"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { useUserAuthHasHydrated, useUserAuthStore } from "@/store/userAuthStore";
import { toggleWishlist } from "@/features/wishlist/api";
import { getFestivals } from "./api";
import type { FestivalProgressStatus, UserFestivalResponse } from "./types";

const STATUS_LABEL: Record<FestivalProgressStatus, string> = {
  UPCOMING: "진행 예정",
  ONGOING: "진행중",
  COMPLETED: "진행 완료",
};

function formatDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return "일정 미정";
  return `${startDate} ~ ${endDate}`;
}

function WishlistHeart({ festival }: { festival: UserFestivalResponse }) {
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
      className="body-large shrink-0"
    >
      {festival.wishlisted ? "♥" : "♡"}
    </button>
  );
}

function FestivalCard({ festival }: { festival: UserFestivalResponse }) {
  return (
    <Link
      href={`/festivals/${festival.id}`}
      className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-4"
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <p className="body-regular-bold text-zinc-950">{festival.name}</p>
          {festival.progressStatus ? (
            <span className="body-caption rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-700">
              {STATUS_LABEL[festival.progressStatus]}
            </span>
          ) : null}
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

export function FestivalListPanel() {
  const [page, setPage] = useState(0);

  const query = useQuery({
    queryKey: ["festivals", page],
    queryFn: () => getFestivals(page, 20),
  });

  if (query.isLoading) {
    return <p className="body-regular p-4 text-zinc-500">불러오는 중...</p>;
  }

  if (query.fetchStatus === "paused") {
    return <p className="body-small p-4 text-error">네트워크 연결을 확인해 주세요.</p>;
  }

  if (query.isError) {
    return <p className="body-small p-4 text-error">{getApiErrorMessage(query.error)}</p>;
  }

  const data = query.data;
  if (!data || data.items.length === 0) {
    return <p className="body-regular p-4 text-zinc-500">등록된 축제가 없습니다.</p>;
  }

  return (
    <div className="flex flex-col">
      {data.items.map((festival) => (
        <FestivalCard key={festival.id} festival={festival} />
      ))}
      <div className="flex items-center justify-center gap-4 p-4">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => setPage((current) => current - 1)}
          className="body-small text-zinc-700 disabled:text-zinc-300"
        >
          이전
        </button>
        <span className="body-caption text-zinc-400">
          {data.page + 1} / {Math.max(data.totalPages, 1)}
        </span>
        <button
          type="button"
          disabled={data.page + 1 >= data.totalPages}
          onClick={() => setPage((current) => current + 1)}
          className="body-small text-zinc-700 disabled:text-zinc-300"
        >
          다음
        </button>
      </div>
    </div>
  );
}
