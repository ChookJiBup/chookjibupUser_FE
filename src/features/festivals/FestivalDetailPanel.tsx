"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  API_ERROR_CODE,
  getApiErrorCode,
  getApiErrorMessage,
  isAuthExpiredError,
} from "@/lib/api/httpError";
import { useUserAuthHasHydrated, useUserAuthStore } from "@/store/userAuthStore";
import { toggleWishlist } from "@/features/wishlist/api";
import { getFestivalDetail } from "./api";
import type {
  BoothCongestionLevel,
  FestivalProgressStatus,
  UserFestivalDetailResponse,
} from "./types";

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

export function FestivalDetailPanel({ festivalId }: { festivalId: string }) {
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
    if (getApiErrorCode(query.error) === API_ERROR_CODE.FESTIVAL_NOT_FOUND) {
      return (
        <div className="flex flex-col items-center gap-2 p-8">
          <p className="body-regular text-zinc-500">존재하지 않는 축제예요.</p>
          <Link href="/" className="body-regular-bold text-primary">
            목록으로 돌아가기
          </Link>
        </div>
      );
    }
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

      {wishlistMutation.isError ? (
        <p className="body-caption text-error">
          {isAuthExpiredError(wishlistMutation.error)
            ? "로그인이 만료됐어요. 다시 로그인해 주세요."
            : getApiErrorMessage(wishlistMutation.error)}
        </p>
      ) : null}

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

      {festival.roadmap ? <RoadmapView roadmap={festival.roadmap} /> : null}
    </div>
  );
}

function RoadmapView({ roadmap }: { roadmap: NonNullable<UserFestivalDetailResponse["roadmap"]> }) {
  const { baseImageUrl, canvasWidth, canvasHeight, icons } = roadmap;

  // icon_builder 타입은 캔버스 크기 기준 좌표에 아이콘을 절대 위치로 얹는다.
  if (canvasWidth && canvasHeight && icons.length > 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="body-regular-bold text-zinc-950">로드맵</p>
        <div
          className="relative w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50"
          style={{ aspectRatio: `${canvasWidth} / ${canvasHeight}` }}
        >
          {baseImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={baseImageUrl}
              alt="축제 로드맵 배경"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
          {icons.map((icon) => (
            <div
              key={icon.placementId}
              className="absolute flex flex-col items-center"
              style={{
                left: `${(Number(icon.positionX) / canvasWidth) * 100}%`,
                top: `${(Number(icon.positionY) / canvasHeight) * 100}%`,
                transform: `translate(-50%, -50%) rotate(${icon.rotationDeg}deg)`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={icon.iconImageUrl} alt={icon.iconName} className="size-6" />
              {icon.label ? (
                <span className="body-caption rounded bg-white/80 px-1 text-zinc-700">
                  {icon.label}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // uploaded_image 타입(또는 아이콘이 없는 경우)은 원본 이미지만 보여준다.
  if (baseImageUrl) {
    return (
      <div className="flex flex-col gap-2">
        <p className="body-regular-bold text-zinc-950">로드맵</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={baseImageUrl}
          alt="축제 로드맵"
          className="w-full rounded-lg border border-zinc-200 object-contain"
        />
      </div>
    );
  }

  return null;
}
