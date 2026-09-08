"use client";

import { HeartIcon } from "@/components/icons/HeartIcon";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import {
  CalendarIcon,
  ClipboardCopyIcon,
  ExternalLinkIcon,
  Link2Icon,
  ReloadIcon,
  SewingPinIcon,
} from "@radix-ui/react-icons";
import {
  API_ERROR_CODE,
  getApiErrorCode,
  getApiErrorMessage,
  isAuthExpiredError,
} from "@/lib/api/httpError";
import { useUserAuthHasHydrated, useUserAuthStore } from "@/store/userAuthStore";
import { toggleWishlist } from "@/features/wishlist/api";
import { ReviewsPanel } from "@/features/reviews/ReviewsPanel";
import { LocationMiniMap } from "@/components/ui/LocationMiniMap";
import { getFestivalCongestion, getFestivalDetail } from "./api";
import { FestivalStats, FestivalThumbnail, StatusBadge } from "./FestivalCard";
import type {
  BoothCongestionLevel,
  BoothCongestionResponse,
  FestivalCongestionResponse,
  RoadmapResponse,
  UserFestivalDetailResponse,
} from "./types";

type Tab = "INFO" | "MAP" | "REVIEW";

const TAB_LABEL: Record<Tab, string> = {
  INFO: "축제정보",
  MAP: "부스지도",
  REVIEW: "리뷰",
};

export function FestivalDetailPanel({ festivalId }: { festivalId: string }) {
  const [tab, setTab] = useState<Tab>("INFO");
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
      queryClient.invalidateQueries({ queryKey: ["festival-search"] });
    },
  });

  const congestionQuery = useQuery({
    queryKey: ["festival-congestion", festivalId],
    queryFn: () => getFestivalCongestion(festivalId),
    enabled: query.data?.progressStatus === "ONGOING",
  });

  if (query.isLoading) {
    return <p className="body-regular text-zinc-500">불러오는 중...</p>;
  }

  if (query.fetchStatus === "paused") {
    return <p className="body-small text-error">네트워크 연결을 확인해 주세요.</p>;
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
    return <p className="body-small text-error">{getApiErrorMessage(query.error)}</p>;
  }

  const festival = query.data;
  if (!festival) return null;

  return (
    <div className="flex flex-col">
      <FestivalThumbnail imageUrl={festival.imageUrl} size={200} className="w-full rounded-none" />

      <div className="flex flex-col gap-4 py-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              <h1 className="body-large-bold min-w-0 flex-1 text-zinc-950">{festival.name}</h1>
              <StatusBadge status={festival.progressStatus} />
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {festival.homepageUrl ? (
                <a
                  href={festival.homepageUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="축제 홈페이지로 이동"
                  className="text-zinc-700"
                >
                  <ExternalLinkIcon className="size-5" />
                </a>
              ) : null}
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => wishlistMutation.mutate()}
                  disabled={wishlistMutation.isPending}
                  aria-label={festival.wishlisted ? "찜 취소" : "찜하기"}
                  className={festival.wishlisted ? "text-red-500" : "text-zinc-950"}
                >
                  <HeartIcon filled={festival.wishlisted} className="size-4" />
                </button>
              ) : null}
            </div>
          </div>
          <p className="body-small text-zinc-500">
            {festival.eventPlace ?? festival.address}
            {festival.startDate && festival.endDate ? (
              <>
                {" · "}
                {festival.startDate} ~ {festival.endDate}
              </>
            ) : null}
          </p>
          <FestivalStats
            wishlistCount={festival.wishlistCount}
            reviewCount={festival.reviewCount}
          />
        </div>

        {wishlistMutation.isError ? (
          <p className="body-caption text-error">
            {isAuthExpiredError(wishlistMutation.error)
              ? "로그인이 만료됐어요. 다시 로그인해 주세요."
              : getApiErrorMessage(wishlistMutation.error)}
          </p>
        ) : null}

        {festival.progressStatus === "ONGOING" ? (
          <CongestionSummary festivalId={festivalId} query={congestionQuery} />
        ) : null}
      </div>

      <div className="flex border-b border-zinc-200">
        {(Object.keys(TAB_LABEL) as Tab[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={
              tab === value
                ? "body-regular-bold flex-1 border-b-2 border-zinc-950 py-3 text-center text-zinc-950"
                : "body-regular flex-1 py-3 text-center text-zinc-400"
            }
          >
            {TAB_LABEL[value]}
          </button>
        ))}
      </div>

      {tab === "INFO" ? <FestivalInfoTab festival={festival} /> : null}
      {tab === "MAP" ? <RoadmapTab roadmap={festival.roadmap} /> : null}
      {tab === "REVIEW" ? <ReviewsPanel festivalId={festivalId} /> : null}
    </div>
  );
}

function copyToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}

/**
 * "실시간 축제현황". Figma 설계서 기준으로 탭 바깥(헤더 영역)에 붙고, 진행중일 때만
 * 보인다. 부스지도 탭이 아니라 여기 있는 게 맞다 — 처음엔 부스지도 탭 안에 넣었었는데,
 * Figma 원본(INFO01 "info(ongoing)" 프레임)을 다시 확인해서 위치를 바로잡았다.
 */
function CongestionSummary({
  festivalId,
  query,
}: {
  festivalId: string;
  query: ReturnType<typeof useQuery<FestivalCongestionResponse>>;
}) {
  if (query.isLoading) return null;
  if (query.fetchStatus === "paused" || query.isError) return null;

  const congestion = query.data;
  if (!congestion || congestion.booths.length === 0) return null;

  const overallLevel = pickOverallLevel(congestion.booths);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="body-small-bold text-zinc-950">실시간 축제현황</p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="body-caption flex items-center gap-1 text-zinc-400"
        >
          {congestion.updatedAt ? formatUpdatedAt(congestion.updatedAt) + " 기준" : ""}
          <ReloadIcon className="size-3" />
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4">
        <div className="flex items-center justify-between">
          <p className="body-regular-bold text-zinc-950">전체 혼잡도</p>
          {overallLevel ? (
            <span className={`body-small-bold ${CONGESTION_TEXT_CLASS[overallLevel]}`}>
              {CONGESTION_LABEL[overallLevel]}
            </span>
          ) : null}
        </div>
        <div className="h-px bg-zinc-100" />
        <div className="flex flex-col gap-2">
          <p className="body-small-bold text-zinc-700">예상 대기시간 랭킹</p>
          {congestion.ranking.length === 0 ? (
            <p className="body-small text-zinc-400">아직 혼잡도 정보가 없어요.</p>
          ) : (
            congestion.ranking
              .slice(0, 3)
              .map((booth, index) => (
                <BoothCongestionRow key={booth.boothId} rank={index + 1} booth={booth} />
              ))
          )}
        </div>
      </div>

      <Link
        href={`/festivals/${festivalId}/congestion`}
        className="body-regular-bold rounded-md border border-zinc-300 px-4 py-2.5 text-center text-zinc-950"
      >
        축제현황 전체 보기
      </Link>
    </div>
  );
}

const CONGESTION_LABEL: Record<string, string> = {
  LOW: "여유",
  MEDIUM: "보통",
  HIGH: "혼잡",
};

const CONGESTION_TEXT_CLASS: Record<string, string> = {
  LOW: "text-secondary-600",
  MEDIUM: "text-point-600",
  HIGH: "text-error",
};

const CONGESTION_BADGE_CLASS: Record<string, string> = {
  LOW: "bg-secondary-600 text-white",
  MEDIUM: "bg-point-600 text-white",
  HIGH: "bg-error text-white",
};

/** 부스 중 가장 혼잡한 등급을 "전체 혼잡도"로 대표해서 보여준다(HIGH > MEDIUM > LOW). */
function pickOverallLevel(booths: BoothCongestionResponse[]): BoothCongestionLevel | null {
  const levels = booths
    .map((b) => b.congestionLevel)
    .filter((l): l is BoothCongestionLevel => l !== null);
  if (levels.includes("HIGH")) return "HIGH";
  if (levels.includes("MEDIUM")) return "MEDIUM";
  if (levels.includes("LOW")) return "LOW";
  return null;
}

function formatUpdatedAt(iso: string) {
  const date = new Date(iso);
  const hours = date.getHours();
  const period = hours < 12 ? "오전" : "오후";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${period} ${displayHour}:${minutes}`;
}

function BoothCongestionRow({ rank, booth }: { rank: number; booth: BoothCongestionResponse }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="body-caption text-zinc-400">{rank}</span>
        <span className="body-small text-zinc-950">{booth.boothName}</span>
      </div>
      <div className="flex items-center gap-2">
        {booth.congestionLevel ? (
          <span
            className={`body-caption rounded-full px-2 py-0.5 ${CONGESTION_BADGE_CLASS[booth.congestionLevel]}`}
          >
            {CONGESTION_LABEL[booth.congestionLevel]}
          </span>
        ) : null}
        {booth.waitMinutes !== null ? (
          <span className="body-small text-zinc-500">{booth.waitMinutes}분</span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * "축제정보" 탭. Figma(INFO01 "축제정보 - 상세정보" 프레임) 기준으로 기본 정보 →
 * (위치)지도 → 상세 정보 순서다. 여기 "지도"는 부스 배치도가 아니라 축제가 열리는
 * 위치를 보여주는 지도다 — 부스 배치도는 "부스지도" 탭에 따로 있다.
 */
function FestivalInfoTab({ festival }: { festival: UserFestivalDetailResponse }) {
  const address = festival.address;

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-4 py-4">
        <p className="body-regular-bold text-zinc-950">기본 정보</p>

        {festival.startDate && festival.endDate ? (
          <InfoRow icon={<CalendarIcon className="size-4" />}>
            {festival.startDate} ~ {festival.endDate}
            {festival.operationStartTime && festival.operationEndTime
              ? ` (${festival.operationStartTime}~${festival.operationEndTime})`
              : ""}
          </InfoRow>
        ) : null}

        {address ? (
          <InfoRow icon={<SewingPinIcon className="size-4" />}>
            <span className="flex items-center gap-2">
              {address}
              <button
                type="button"
                onClick={() => copyToClipboard(address)}
                aria-label="주소 복사"
                className="text-zinc-400"
              >
                <ClipboardCopyIcon className="size-4" />
              </button>
            </span>
          </InfoRow>
        ) : null}

        {festival.eventPlace ? (
          <InfoRow icon={<SewingPinIcon className="size-4" />}>{festival.eventPlace}</InfoRow>
        ) : null}

        {festival.phoneNumber ? (
          <InfoRow icon={<span className="body-small">☎</span>}>{festival.phoneNumber}</InfoRow>
        ) : null}

        {festival.homepageUrl ? (
          <InfoRow icon={<Link2Icon className="size-4" />}>
            <a
              href={festival.homepageUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary"
            >
              홈페이지 바로가기
            </a>
          </InfoRow>
        ) : null}

        <div className="rounded-lg bg-zinc-50 p-3">
          <p className="body-caption text-zinc-500">
            본 축제 정보는 문화체육관광부의 지역축제정보 API를 바탕으로 제공되었습니다. 현장 상황에
            따라 진행 내용은 변동될 수 있으니, 방문 전 축제 문의처를 통해 반드시 확인 바랍니다.
          </p>
        </div>
      </div>

      <div className="h-2 bg-zinc-100" />

      {festival.latitude !== null && festival.longitude !== null ? (
        <div className="flex flex-col gap-3 py-4">
          <p className="body-regular-bold text-zinc-950">지도</p>
          <LocationMiniMap latitude={festival.latitude} longitude={festival.longitude} />
          {address ? (
            <div className="flex items-center gap-2">
              <SewingPinIcon className="size-4 text-zinc-400" />
              <p className="body-small text-zinc-700">{address}</p>
              <button
                type="button"
                onClick={() => copyToClipboard(address)}
                className="text-zinc-400"
              >
                <ClipboardCopyIcon className="size-4" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {festival.content ? (
        <>
          <div className="h-2 bg-zinc-100" />
          <div className="flex flex-col gap-3 py-4">
            <p className="body-regular-bold text-zinc-950">상세 정보</p>
            <p className="body-regular whitespace-pre-line text-zinc-700">{festival.content}</p>
          </div>
        </>
      ) : null}
    </div>
  );
}

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-5 shrink-0 items-center justify-center text-zinc-400">{icon}</span>
      <span className="body-small text-zinc-700">{children}</span>
    </div>
  );
}

/**
 * "부스지도" 탭. 부스는 구역(zone)별로 묶어서 보여주고, 화장실/입구/무대 등은
 * 별도 목록으로 보여준다. 혼잡도는 여기가 아니라 상세 페이지 헤더의
 * "실시간 축제현황"에서 보여준다(진행중일 때만).
 */
function RoadmapTab({ roadmap }: { roadmap: RoadmapResponse | null }) {
  if (!roadmap) {
    return <p className="body-regular py-4 text-zinc-400">아직 배치도가 공개되지 않았어요.</p>;
  }

  const hasBooths = roadmap.zones.some((zone) => zone.booths.length > 0);

  return (
    <div className="flex flex-col gap-3 py-4">
      {roadmap.mapImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={roadmap.mapImageUrl}
          alt="축제 배치도"
          className="w-full rounded-lg border border-zinc-200 object-contain"
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-zinc-100">
          <p className="body-small text-zinc-400">배치도 이미지가 아직 없어요</p>
        </div>
      )}

      {hasBooths ? (
        <div className="flex flex-col gap-3">
          {roadmap.zones
            .filter((zone) => zone.booths.length > 0)
            .map((zone) => (
              <div key={zone.zoneId} className="flex flex-col gap-1">
                <p className="body-small-bold text-zinc-700">{zone.name}</p>
                <div className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200">
                  {zone.booths.map((booth) => (
                    <div key={booth.publicId} className="px-3 py-2">
                      <p className="body-small text-zinc-950">{booth.name ?? "이름 없는 부스"}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <p className="body-small text-zinc-400">아직 등록된 부스가 없어요.</p>
      )}

      {roadmap.otherNodes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {roadmap.otherNodes.map((node) => (
            <span
              key={node.publicId}
              className="body-caption rounded-full bg-zinc-100 px-2 py-1 text-zinc-700"
            >
              {node.name ?? node.nodeType}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
