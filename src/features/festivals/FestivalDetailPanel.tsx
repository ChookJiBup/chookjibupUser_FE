"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { useUserAuthHasHydrated, useUserAuthStore } from "@/store/userAuthStore";
import { toggleWishlist } from "@/features/wishlist/api";
import { getFestivalDetail } from "./api";
import type { BoothCongestionLevel, FestivalProgressStatus } from "./types";

const STATUS_LABEL: Record<FestivalProgressStatus, string> = {
  UPCOMING: "진행 예정",
  ONGOING: "진행중",
  COMPLETED: "진행 완료",
};

const CONGESTION_LABEL: Record<BoothCongestionLevel, string> = {
  crowded: "혼잡",
  normal: "보통",
  comfortable: "여유",
};

export function FestivalDetailPanel({ festivalId }: { festivalId: number }) {
  const queryClient = useQueryClient();
  const hasHydrated = useUserAuthHasHydrated();
  const session = useUserAuthStore((state) => state.session);
  const isLoggedIn = hasHydrated && session !== null;

  const query = useQuery({
    queryKey: ["festival", festivalId],
    queryFn: () => getFestivalDetail(festivalId),
  });

  const wishlistMutation = useMutation({
    mutationFn: () => toggleWishlist(festivalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["festival", festivalId] });
      queryClient.invalidateQueries({ queryKey: ["festivals"] });
    },
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

  const festival = query.data;
  if (!festival) return null;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="heading-small text-zinc-950">{festival.name}</h1>
            {festival.progressStatus ? (
              <span className="body-caption rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-700">
                {STATUS_LABEL[festival.progressStatus]}
              </span>
            ) : null}
          </div>
          <p className="body-small text-zinc-500">{festival.eventPlace ?? festival.address}</p>
          {festival.startDate && festival.endDate ? (
            <p className="body-caption text-zinc-400">
              {festival.startDate} ~ {festival.endDate}
            </p>
          ) : null}
        </div>
        {isLoggedIn ? (
          <button
            type="button"
            onClick={() => wishlistMutation.mutate()}
            disabled={wishlistMutation.isPending}
            aria-label={festival.wishlisted ? "찜 취소" : "찜하기"}
            className="body-large shrink-0"
          >
            {festival.wishlisted ? "♥" : "♡"}
          </button>
        ) : null}
      </div>

      {festival.content ? <p className="body-regular text-zinc-700">{festival.content}</p> : null}

      <div className="flex flex-col gap-1 body-small text-zinc-500">
        {festival.phoneNumber ? <p>전화: {festival.phoneNumber}</p> : null}
        {festival.homepageUrl ? <p>홈페이지: {festival.homepageUrl}</p> : null}
        {festival.festivalCongestionLevel ? (
          <p>전체 혼잡도: {festival.festivalCongestionLevel}</p>
        ) : null}
      </div>

      {festival.booths.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="body-regular-bold text-zinc-950">부스</p>
          <div className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200">
            {festival.booths.map((booth) => (
              <div key={booth.boothId} className="flex items-center justify-between px-3 py-2">
                <div className="flex flex-col">
                  <p className="body-small-bold text-zinc-950">{booth.boothName}</p>
                  {booth.boothLocation ? (
                    <p className="body-caption text-zinc-500">{booth.boothLocation}</p>
                  ) : null}
                </div>
                {booth.congestion ? (
                  <div className="flex flex-col items-end">
                    <span className="body-caption text-zinc-700">
                      {CONGESTION_LABEL[booth.congestion.congestionLevel]}
                    </span>
                    {booth.congestion.waitMinutes !== null ? (
                      <span className="body-caption text-zinc-400">
                        대기 {booth.congestion.waitMinutes}분
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {festival.roadmap ? (
        <div className="flex flex-col gap-2">
          <p className="body-regular-bold text-zinc-950">로드맵</p>
          {festival.roadmap.baseImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={festival.roadmap.baseImageUrl}
              alt="축제 로드맵"
              className="w-full rounded-lg border border-zinc-200 object-contain"
            />
          ) : (
            <p className="body-caption text-zinc-400">
              아이콘 {festival.roadmap.icons.length}개가 배치돼 있습니다. (지도 렌더링은 추후 구현)
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
