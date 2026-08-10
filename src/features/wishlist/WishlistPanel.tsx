"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { getMyWishlist } from "./api";

function formatDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return "일정 미정";
  return `${startDate} ~ ${endDate}`;
}

function formatWishlistedAt(wishlistedAt: string) {
  const date = new Date(wishlistedAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

export function WishlistPanel() {
  const [page, setPage] = useState(0);

  const query = useQuery({
    queryKey: ["my-wishlist", page],
    queryFn: () => getMyWishlist(page, 20),
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
    return <p className="body-regular p-4 text-zinc-500">찜한 축제가 없습니다.</p>;
  }

  return (
    <div className="flex flex-col">
      {data.items.map((festival) => (
        <Link
          key={festival.id}
          href={`/festivals/${festival.id}`}
          className="flex flex-col gap-1 border-b border-zinc-200 px-4 py-4"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="body-regular-bold text-zinc-950">{festival.name}</p>
            {formatWishlistedAt(festival.wishlistedAt) ? (
              <span className="body-caption shrink-0 text-zinc-400">
                {formatWishlistedAt(festival.wishlistedAt)} 찜함
              </span>
            ) : null}
          </div>
          <p className="body-small text-zinc-500">
            {festival.eventPlace ?? festival.address ?? ""}
          </p>
          <p className="body-caption text-zinc-400">
            {formatDateRange(festival.startDate, festival.endDate)}
          </p>
        </Link>
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
