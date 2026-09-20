"use client";

import { HeartIcon } from "@/components/icons/HeartIcon";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DesktopIcon, ExternalLinkIcon, Link2Icon, ReloadIcon } from "@radix-ui/react-icons";
import { CalendarDaysIcon } from "@/components/icons/CalendarDaysIcon";
import { MapIcon } from "@/components/icons/MapIcon";
import { MapPinIcon } from "@/components/icons/MapPinIcon";
import { PhoneIcon } from "@/components/icons/PhoneIcon";
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
import { formatKoreanDate, formatShortRegion, StatusBadge } from "./FestivalCard";
import {
  CONGESTION_DOT_CLASS,
  CONGESTION_LABEL,
  CONGESTION_PILL_CLASS,
  CONGESTION_TEXT_CLASS,
  pickOverallLevel,
} from "./congestionPresentation";
import { formatClockTime, formatServerUpdatedAt } from "@/lib/serverTime";
import { collectRoadmapPins, readAreaPoints, readBoundary, readOverlay } from "./mapPresentation";
import { RoadmapMapView, type BoothCongestionHint } from "./RoadmapMapView";
import type {
  BoothCongestionResponse,
  FestivalCongestionResponse,
  FestivalProgressStatus,
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const hasHydrated = useUserAuthHasHydrated();
  const session = useUserAuthStore((state) => state.session);
  const isLoggedIn = hasHydrated && session !== null;

  /*
    시안 2(스크롤 후)에서는 제목 줄이 탭 위로 접혀 고정된다. 제목 블록이 화면 위로
    완전히 지나갔는지로 판단하는데, 기준선은 0이 아니라 상단 고정 헤더의 높이다 —
    0으로 두면 제목이 헤더 뒤에 가려진 동안에는 접힌 줄도 없어서 "축제명이 사라진 구간"이
    생긴다. 헤더 높이는 --app-header-height(노치 높이 포함)라 CSS에서 계산되는 값이므로,
    실제로 그려진 헤더 엘리먼트에서 재 온다.
  */
  const heroRef = useRef<HTMLElement | null>(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

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

  const hasFestival = query.data !== undefined;

  useEffect(() => {
    if (!hasFestival) return;
    const hero = heroRef.current;
    if (!hero) return;

    const update = () => {
      const headerHeight = document.querySelector("header")?.getBoundingClientRect().height ?? 0;
      setHeaderCollapsed(hero.getBoundingClientRect().bottom <= headerHeight);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [hasFestival]);

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

  const isOngoing = festival.progressStatus === "ONGOING";
  const region = formatShortRegion(festival.address, festival.eventPlace);
  const startDate = formatKoreanDate(festival.startDate);
  const endDate = formatKoreanDate(festival.endDate);

  const actions = (
    <FestivalActionButtons
      wishlisted={festival.wishlisted}
      homepageUrl={festival.homepageUrl}
      pending={wishlistMutation.isPending}
      onToggleWishlist={() => {
        if (!isLoggedIn) {
          router.push("/login");
          return;
        }
        wishlistMutation.mutate();
      }}
    />
  );

  return (
    /* 시안은 축제명부터 화면 끝까지 꽉 찬 폭을 쓰므로 main의 좌우·상하 여백을 걷어내고
       섹션마다 제 여백을 준다. 리뷰 탭도 이미 제 여백을 갖고 있다. */
    <div className="-mx-5 -my-4 flex flex-col">
      <section ref={heroRef} className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="body-large-bold min-w-0 text-zinc-950">{festival.name}</h1>
            <StatusBadge status={festival.progressStatus} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {region ? <p className="body-small text-zinc-600">{region}</p> : null}
            {region && startDate ? (
              <span aria-hidden className="h-3 w-px shrink-0 rounded-full bg-zinc-300" />
            ) : null}
            {startDate ? (
              <p className="body-small text-zinc-600">
                {startDate}
                {endDate ? ` ~ ${endDate}` : ""}
              </p>
            ) : null}
          </div>
        </div>

        {actions}

        {wishlistMutation.isError ? (
          <p className="body-caption text-error">
            {isAuthExpiredError(wishlistMutation.error)
              ? "로그인이 만료됐어요. 다시 로그인해 주세요."
              : getApiErrorMessage(wishlistMutation.error)}
          </p>
        ) : null}

        {isOngoing ? <CongestionSummary festivalId={festivalId} query={congestionQuery} /> : null}
      </section>

      <div className="sticky top-[var(--app-header-height)] z-20 bg-white">
        {headerCollapsed ? (
          <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <p className="body-regular-bold truncate text-zinc-950">{festival.name}</p>
              <StatusBadge status={festival.progressStatus} />
            </div>
            {actions}
          </div>
        ) : null}

        <div className="flex">
          {(Object.keys(TAB_LABEL) as Tab[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              aria-current={tab === value ? "page" : undefined}
              className={
                tab === value
                  ? "body-regular-bold flex-1 border-b-2 border-zinc-950 p-3 text-center text-zinc-950"
                  : "body-regular flex-1 border-b border-zinc-200 p-3 text-center text-zinc-400"
              }
            >
              {TAB_LABEL[value]}
            </button>
          ))}
        </div>
      </div>

      {tab === "INFO" ? <FestivalInfoTab festival={festival} /> : null}
      {tab === "MAP" ? (
        <RoadmapTab
          festivalId={festivalId}
          progressStatus={festival.progressStatus}
          roadmap={festival.roadmap}
          congestion={congestionQuery.data ?? null}
        />
      ) : null}
      {tab === "REVIEW" ? <ReviewsPanel festivalId={festivalId} /> : null}
    </div>
  );
}

/**
 * 찜·홈페이지 바로가기 원형 버튼. 시안에서는 제목 아래와, 스크롤 후 접힌 헤더 양쪽에
 * 같은 모양으로 나온다.
 *
 * <p>비로그인 상태에서도 버튼을 숨기지 않는다 — 목록 카드처럼 눌렀을 때 로그인 화면으로
 * 보내는 편이 "찜이 아예 없는 축제"로 오해하지 않게 한다.</p>
 */
function FestivalActionButtons({
  wishlisted,
  homepageUrl,
  pending,
  onToggleWishlist,
}: {
  wishlisted: boolean;
  homepageUrl: string | null;
  pending: boolean;
  onToggleWishlist: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={onToggleWishlist}
        disabled={pending}
        aria-label={wishlisted ? "찜 취소" : "찜하기"}
        aria-pressed={wishlisted}
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-point-300 p-1 text-point-600"
      >
        <HeartIcon filled={wishlisted} aria-hidden className="size-4" />
      </button>
      {homepageUrl ? (
        <a
          href={homepageUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="축제 홈페이지로 이동"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-point-300 p-1 text-point-600"
        >
          <ExternalLinkIcon aria-hidden className="size-4" />
        </a>
      ) : null}
    </div>
  );
}

function copyToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}

/** 주소 옆의 밑줄 "복사". 시안은 아이콘이 아니라 글자 링크다. */
function CopyTextButton({ value, className = "" }: { value: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => copyToClipboard(value)}
      aria-label="주소 복사"
      className={`shrink-0 text-zinc-500 underline ${className}`}
    >
      복사
    </button>
  );
}

/**
 * "실시간 축제현황". 탭 바깥(헤더 영역)에 붙고, 진행중일 때만 보인다. 부스지도 탭이
 * 아니라 여기 있는 게 맞다 — 처음엔 부스지도 탭 안에 넣었었는데, Figma 원본을 다시
 * 확인해서 위치를 바로잡았다.
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
  const updatedAt = formatServerUpdatedAt(congestion.updatedAt);

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="body-small-bold text-zinc-600">실시간 축제현황</p>
        <button
          type="button"
          onClick={() => query.refetch()}
          aria-label="실시간 축제현황 새로고침"
          className="body-caption flex items-center gap-1 text-zinc-400"
        >
          {updatedAt ? `${updatedAt} 기준` : ""}
          <ReloadIcon aria-hidden className="size-3" />
        </button>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-zinc-100 px-4 py-3">
        <div className="flex items-start justify-between">
          <p className="body-small text-zinc-950">전체 혼잡도</p>
          {overallLevel ? (
            <span className={`body-small-bold ${CONGESTION_TEXT_CLASS[overallLevel]}`}>
              {CONGESTION_LABEL[overallLevel]}
            </span>
          ) : null}
        </div>
        <div className="h-px w-full bg-zinc-100" />
        <div className="flex flex-col gap-2">
          <p className="body-small-bold text-zinc-950">예상 대기시간 랭킹</p>
          <BoothRankingList ranking={congestion.ranking} />
        </div>
      </div>

      <Link
        href={`/festivals/${festivalId}/congestion`}
        className="body-small flex items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-3 text-zinc-950"
      >
        <DesktopIcon aria-hidden className="size-5" />
        축제현황 전체 보기
      </Link>
    </>
  );
}

/** 대기시간 랭킹 상위 3개. 상세 헤더와 부스지도 탭이 같은 모양을 쓴다. */
function BoothRankingList({ ranking }: { ranking: BoothCongestionResponse[] }) {
  if (ranking.length === 0) {
    return <p className="body-small text-zinc-400">아직 혼잡도 정보가 없어요.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {ranking.slice(0, 3).map((booth, index) => (
        <div key={booth.boothId} className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <span className="body-small-bold w-[9px] shrink-0 text-zinc-950">{index + 1}</span>
            <span className="body-small truncate text-zinc-950">{booth.boothName}</span>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {booth.congestionLevel ? (
              <span
                className={`body-caption rounded-md px-2 py-1 ${CONGESTION_PILL_CLASS[booth.congestionLevel]}`}
              >
                {CONGESTION_LABEL[booth.congestionLevel]}
              </span>
            ) : null}
            {booth.waitMinutes !== null ? (
              <span className="body-small w-[35px] text-right text-red-500">
                {booth.waitMinutes}분
              </span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * "축제정보" 탭. 기본 정보 → (위치)지도 → 상세 정보 → 출처 순서다. 여기 "지도"는 부스
 * 배치도가 아니라 축제가 열리는 위치를 보여주는 지도다 — 부스 배치도는 "부스지도" 탭에
 * 따로 있다.
 */
function FestivalInfoTab({ festival }: { festival: UserFestivalDetailResponse }) {
  const address = festival.address;
  const startDate = formatKoreanDate(festival.startDate, { withWeekday: true });
  const endDate = formatKoreanDate(festival.endDate, { withWeekday: true });
  const operationHours =
    festival.operationStartTime && festival.operationEndTime
      ? `${formatClockTime(festival.operationStartTime)}~${formatClockTime(festival.operationEndTime)}`
      : null;

  return (
    <div className="flex flex-col">
      <section className="flex flex-col gap-3 px-5 py-4">
        <p className="body-regular-bold text-zinc-950">기본 정보</p>

        {startDate ? (
          <InfoRow icon={<CalendarDaysIcon className="size-[18px]" />}>
            {startDate}
            {endDate ? ` ~ ${endDate}` : ""}
            {operationHours ? ` (${operationHours})` : ""}
          </InfoRow>
        ) : null}

        {address ? (
          <InfoRow icon={<MapPinIcon className="size-[18px]" />}>
            {address}
            <CopyTextButton value={address} className="body-small ml-1" />
          </InfoRow>
        ) : null}

        {festival.eventPlace ? (
          <InfoRow icon={<MapIcon className="size-[18px]" />}>{festival.eventPlace}</InfoRow>
        ) : null}

        {festival.phoneNumber ? (
          <InfoRow icon={<PhoneIcon className="size-[18px]" />}>{festival.phoneNumber}</InfoRow>
        ) : null}

        {festival.homepageUrl ? (
          <InfoRow icon={<Link2Icon className="size-[18px]" />}>
            <a
              href={festival.homepageUrl}
              target="_blank"
              rel="noreferrer"
              className="body-small text-zinc-500 underline"
            >
              홈페이지 바로가기
            </a>
          </InfoRow>
        ) : null}

        <div className="flex flex-col gap-2 rounded-lg border border-zinc-100 p-3">
          <p className="body-small text-zinc-950">
            본 축제 정보는{" "}
            <span className="body-small-bold text-point-600">
              문화체육관광부의 지역축제정보 API
            </span>
            를 바탕으로 제공되었습니다.{" "}
            <span className="body-small-bold">
              현장 상황에 따라 진행 내용은 변동될 수 있으니, 방문 전 축제 문의처를 통해 반드시 확인
              바랍니다.
            </span>
          </p>
        </div>
      </section>

      {festival.latitude !== null && festival.longitude !== null ? (
        <>
          <div className="h-2 bg-zinc-100" />
          <section className="flex flex-col gap-3 px-5 py-4">
            <p className="body-regular-bold text-zinc-800">지도</p>
            <LocationMiniMap latitude={festival.latitude} longitude={festival.longitude} />
            {address ? (
              <div className="flex items-center gap-2">
                <span className="flex w-[18px] shrink-0 items-center justify-center text-zinc-400">
                  <MapPinIcon className="size-4" />
                </span>
                <p className="body-small min-w-0 flex-1 text-zinc-950">
                  {address}
                  <CopyTextButton value={address} className="body-caption ml-1" />
                </p>
              </div>
            ) : null}
          </section>
        </>
      ) : null}

      {festival.content ? (
        <>
          <div className="h-2 bg-zinc-100" />
          <section className="flex flex-col gap-3 px-5 py-4">
            <p className="body-regular-bold text-zinc-950">상세 정보</p>
            <p className="body-small whitespace-pre-line text-zinc-950">{festival.content}</p>
          </section>
        </>
      ) : null}

      {/* 시안의 맨 아래 출처 줄. "업데이트 yyyy-MM-dd"도 같이 있지만 상세 응답에
          갱신 시각 필드가 없어 지금은 제공처만 적는다. */}
      <div className="flex items-center justify-end gap-4 border-t border-zinc-200 px-5 py-4">
        <p className="body-caption text-zinc-400">
          제공 <span className="underline">문화체육관광부</span>
        </p>
      </div>
    </div>
  );
}

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex w-full items-center gap-2">
      <span className="flex h-6 w-[18px] shrink-0 items-center justify-center text-zinc-400">
        {icon}
      </span>
      <span className="body-regular min-w-0 flex-1 text-zinc-950">{children}</span>
    </div>
  );
}

/**
 * "부스지도" 탭. 진행중이면 혼잡도 색으로 칠한 지도 + 대기시간 랭킹을, 시작 전이면
 * 혼잡도 없이 부스 목록만 보여준다 — 아직 열지도 않은 축제에 "여유/보통"을 적어 두면
 * 실시간 정보인 줄 오해한다.
 *
 * 관리자가 카카오맵 위에 부지 경계나 팜플렛을 맞춰 뒀으면(presentation) 그 지도를
 * 그대로 보여주고, 아직 안 맞췄으면 지금까지처럼 배치도 이미지만 보여준다.
 */
function RoadmapTab({
  festivalId,
  progressStatus,
  roadmap,
  congestion,
}: {
  festivalId: string;
  progressStatus: FestivalProgressStatus | null;
  roadmap: RoadmapResponse | null;
  congestion: FestivalCongestionResponse | null;
}) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const isOngoing = progressStatus === "ONGOING";

  /*
    혼잡도 API의 boothId는 숫자, 배치도 노드는 UUID라 서로 이어 붙일 키가 부스 이름밖에
    없다. 이름이 겹치는 부스가 생기면 먼저 온 쪽을 쓴다.
  */
  const congestionByBoothName = useMemo(() => {
    const map = new Map<string, BoothCongestionHint>();
    // 진행중이 아닌 축제는 지도 핀도 혼잡도 색 없이 그려야 하므로 아예 비워 둔다.
    (isOngoing ? (congestion?.booths ?? []) : []).forEach((booth) => {
      if (map.has(booth.boothName)) return;
      map.set(booth.boothName, {
        level: booth.congestionLevel,
        waitMinutes: booth.waitMinutes,
      });
    });
    return map;
  }, [congestion, isOngoing]);

  /*
    구역 도형은 노드로 저장돼 otherNodes에 섞여 온다. 지도에 그리는 쪽에서 따로 읽으므로
    시설 칩 줄에서는 빼야 «로스터리 마켓존»이 화장실 옆에 붙어 있지 않게 된다.
  */
  const facilityNodes = useMemo(
    () => (roadmap ? roadmap.otherNodes.filter((node) => readAreaPoints(node) === null) : []),
    [roadmap],
  );

  /** 구역 머리글 없이 한 줄씩 늘어놓고 구역명을 행 오른쪽에 붙이는 시안 모양. */
  const boothRows = useMemo(
    () =>
      (roadmap?.zones ?? []).flatMap((zone) =>
        zone.booths.map((booth) => ({
          publicId: booth.publicId,
          name: booth.name ?? "이름 없는 부스",
          zoneName: zone.name,
        })),
      ),
    [roadmap],
  );

  if (!roadmap) {
    return <p className="body-regular px-5 py-4 text-zinc-400">아직 배치도가 공개되지 않았어요.</p>;
  }

  /*
    부지 경계나 팜플렛이 있어야만 지도를 그렸더니, 관리자가 부스만 찍어 둔 축제는
    «배치도 이미지가 아직 없어요»만 뜨고 위치를 볼 방법이 없었다. 좌표가 있는 핀이
    하나라도 있으면 지도를 그린다 — 경계·팜플렛은 있으면 얹는 부가 정보다.
  */
  const canShowMap =
    readBoundary(roadmap.presentation) !== null ||
    readOverlay(roadmap.presentation) !== null ||
    collectRoadmapPins(roadmap).length > 0;

  const updatedAt = isOngoing ? formatServerUpdatedAt(congestion?.updatedAt) : null;

  return (
    <div className="flex flex-col">
      <section className="flex flex-col gap-3 px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <p className="body-regular-bold text-zinc-950">부스 지도</p>
          {updatedAt ? (
            <p className="body-caption text-zinc-400">최종 업데이트 {updatedAt}</p>
          ) : null}
        </div>

        {canShowMap ? (
          <RoadmapMapView
            roadmap={roadmap}
            congestionByBoothName={congestionByBoothName}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />
        ) : roadmap.mapImageUrl ? (
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

        {isOngoing ? (
          <div className="flex items-center gap-4">
            {(["HIGH", "MEDIUM", "LOW"] as const).map((level) => (
              <span key={level} className="body-caption flex items-center gap-1 text-zinc-500">
                <span
                  aria-hidden
                  className={`size-2 rounded-full ${CONGESTION_DOT_CLASS[level]}`}
                />
                {CONGESTION_LABEL[level]}
              </span>
            ))}
          </div>
        ) : (
          /* 시안은 "시작 전" 상태만 그려 뒀지만, 끝난 축제에 "시작 전"이라고 적으면
             안 되므로 상태에 맞춰 문구를 바꾼다. */
          <p className="body-caption text-zinc-400">
            {progressStatus === "COMPLETED"
              ? "종료된 축제는 부스별 혼잡도 정보가 제공되지 않습니다."
              : "축제 시작 전에는 부스별 혼잡도 정보가 제공되지 않습니다."}
          </p>
        )}

        {facilityNodes.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {facilityNodes.map((node) => (
              <span
                key={node.publicId}
                className="body-caption rounded-full bg-zinc-100 px-2 py-1 text-zinc-700"
              >
                {node.name ?? node.nodeType}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <div className="h-2 bg-zinc-100" />

      <section className="flex flex-col gap-3 px-5 py-4">
        {isOngoing ? (
          <>
            <p className="body-regular-bold text-zinc-950">부스 예상 대기시간 랭킹</p>
            <BoothRankingList ranking={congestion?.ranking ?? []} />
            <Link
              href={`/festivals/${festivalId}/congestion`}
              className="body-small flex items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-3 text-zinc-950"
            >
              <DesktopIcon aria-hidden className="size-5" />
              축제현황 전체 보기
            </Link>
          </>
        ) : (
          <>
            <p className="body-regular-bold text-zinc-950">부스 목록</p>
            {boothRows.length === 0 ? (
              <p className="body-small text-zinc-400">아직 등록된 부스가 없어요.</p>
            ) : (
              <div className="flex flex-col">
                {boothRows.map((booth) => (
                  <button
                    key={booth.publicId}
                    type="button"
                    // 목록에서 고르면 지도가 그 부스로 옮겨 간다.
                    onClick={() =>
                      setSelectedNodeId((current) =>
                        current === booth.publicId ? null : booth.publicId,
                      )
                    }
                    className={`flex w-full items-center justify-between gap-2 border-b border-zinc-100 py-3 text-left ${
                      selectedNodeId === booth.publicId ? "bg-zinc-50" : ""
                    }`}
                  >
                    <span className="body-small truncate text-zinc-950">{booth.name}</span>
                    <span className="body-caption flex shrink-0 items-center gap-1 text-zinc-500">
                      <MapPinIcon aria-hidden className="size-3.5" />
                      {booth.zoneName}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
