"use client";

import { HeartIcon } from "@/components/icons/HeartIcon";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getApiErrorMessage } from "@/lib/api/httpError";
import { toggleWishlist } from "@/features/wishlist/api";
import { useUserAuthHasHydrated, useUserAuthStore } from "@/store/userAuthStore";
import { FestivalStats, StatusBadge, formatDateRange } from "@/features/festivals/FestivalCard";
import { getFestivalCongestion, getFestivals } from "@/features/festivals/api";
import type { FestivalProgressStatus, UserFestivalResponse } from "@/features/festivals/types";
import { type KakaoMapInstance, loadKakaoMapsSdk } from "@/lib/map/kakaoMaps";

// 대한민국 대략 중심 좌표. 좌표가 있는 축제가 없을 때 기본 화면 위치로 쓴다.
const DEFAULT_CENTER = { lat: 36.5, lng: 127.8 };
const DEFAULT_LEVEL = 13; // 카카오맵은 레벨이 클수록 축소(줌아웃)된다.

type MapFilterTab = "ALL" | Exclude<FestivalProgressStatus, "COMPLETED">;

const TAB_LABEL: Record<MapFilterTab, string> = {
  ALL: "전체",
  ONGOING: "진행중",
  UPCOMING: "진행예정",
};

// 필터링 탭은 HOME01과 동일하게 두되, 지도에는 좌표가 있는 축제만 찍을 수 있어서
// "내가 저장한 축제"(위시리스트) 탭은 뺐다 — /api/wishlists/me 응답엔 좌표가 없다.
const TABS: MapFilterTab[] = ["ALL", "ONGOING", "UPCOMING"];

/** 전체 탭에서 지도에 찍을 상태들. 종료된 축제는 지도에 올리지 않는다. */
const MAP_ACTIVE_STATUSES: Exclude<FestivalProgressStatus, "COMPLETED">[] = ["ONGOING", "UPCOMING"];

function daysUntil(startDate: string | null): number | null {
  if (!startDate) return null;
  const diffMs = new Date(startDate).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

function markerColor(status: FestivalProgressStatus | null) {
  if (status === "ONGOING") return "#fd7e14"; // point-600 — 혼잡도별 색상은 관리자 백엔드에
  // 실시간 데이터 자체가 없어서 지금은 진행중이면 한 가지 색으로만 표시한다.
  if (status === "UPCOMING") return "#007cff"; // secondary-600 — StatusBadge와 동일한 배색
  return "#9f9fa9"; // zinc-400
}

function buildMarkerElement(festival: UserFestivalResponse): HTMLDivElement {
  const color = markerColor(festival.progressStatus);
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:relative;width:16px;height:16px;cursor:pointer;";
  wrapper.innerHTML = `<div style="width:16px;height:16px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`;

  if (festival.progressStatus === "UPCOMING") {
    const badge = document.createElement("span");
    badge.style.cssText = `position:absolute;top:-8px;right:-8px;background:#fff;border:1px solid ${color};border-radius:9999px;font-size:9px;padding:0 4px;color:${color};white-space:nowrap;`;
    badge.textContent = `D-${daysUntil(festival.startDate)}`;
    wrapper.appendChild(badge);
  }

  return wrapper;
}

/**
 * HOME02(축제지도). 카카오맵 JS SDK를 쓴다 — NEXT_PUBLIC_KAKAO_MAP_KEY 환경변수가
 * 필요하다(카카오 개발자 콘솔 > 내 애플리케이션 > 플랫폼 키 > JavaScript 키).
 *
 * [알려진 제약]
 * - 혼잡도에 따른 마커 색상 구분은 없다 — 관리자 백엔드에 실시간 혼잡도 데이터 자체가 없다.
 * - 좌표(latitude/longitude)가 있는 축제만 지도에 찍힌다 — 관리자가 수동 등록한 축제는
 *   대부분 좌표가 없어서 안 찍힐 수 있다.
 */
export function MapPanel() {
  const [tab, setTab] = useState<MapFilterTab>("ALL");
  const [wishlistOnly, setWishlistOnly] = useState(false);
  const [selected, setSelected] = useState<UserFestivalResponse | null>(null);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const overlaysRef = useRef<{ setMap: (map: KakaoMapInstance | null) => void }[]>([]);

  const hasHydrated = useUserAuthHasHydrated();
  const session = useUserAuthStore((state) => state.session);
  const isLoggedIn = hasHydrated && session !== null;

  const query = useQuery({
    queryKey: ["festivals-map", tab],
    // 지도는 페이지네이션 없이 한 번에 다 찍는다 — 백엔드 MAX_SIZE(100)에 맞춰 최대치로 요청한다.
    // status를 안 주면 종료된 축제까지 시작일 오름차순으로 섞여 와서 첫 100개가 전부 옛날
    // 축제가 된다. 백엔드 status는 값을 하나만 받으므로 전체 탭은 두 상태를 따로 부른다.
    queryFn: async () => {
      const statuses = tab === "ALL" ? MAP_ACTIVE_STATUSES : [tab];
      const pages = await Promise.all(
        statuses.map((status) => getFestivals({ page: 0, size: 100, status })),
      );
      return pages.flatMap((page) => page.items);
    },
  });

  // "찜한 것만 보기"는 별도 API를 새로 안 만들고, 이미 받아온 목록(각 항목에 wishlisted
  // 여부가 이미 포함돼 있음)을 그대로 걸러서 쓴다 — 지도에 뜨는 축제 수가 최대 100개라
  // 클라이언트에서 걸러도 무리 없다.
  const festivalsWithCoords = useMemo(
    () =>
      (query.data ?? [])
        .filter((item) => item.latitude !== null && item.longitude !== null)
        .filter((item) => !wishlistOnly || item.wishlisted),
    [query.data, wishlistOnly],
  );

  // 지도는 최초 1회만 만들고, 이후엔 마커(오버레이)만 갈아끼운다 — 매 렌더마다 지도를
  // 새로 만들면 확대/축소 상태가 계속 초기화된다.
  useEffect(() => {
    let cancelled = false;

    loadKakaoMapsSdk()
      .then(() => {
        if (cancelled || !mapContainerRef.current || mapRef.current) return;
        const center = new window.kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
        mapRef.current = new window.kakao.maps.Map(mapContainerRef.current, {
          center,
          level: DEFAULT_LEVEL,
        });
      })
      .catch((err: Error) => {
        if (!cancelled) setSdkError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];

    festivalsWithCoords.forEach((festival) => {
      const position = new window.kakao.maps.LatLng(
        festival.latitude as number,
        festival.longitude as number,
      );
      const element = buildMarkerElement(festival);
      element.addEventListener("click", () => setSelected(festival));

      const overlay = new window.kakao.maps.CustomOverlay({
        position,
        content: element,
        yAnchor: 0.5,
      });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    });
  }, [festivalsWithCoords]);

  return (
    <div className="relative -mx-5 -my-4 flex h-[calc(100dvh-var(--app-header-height))] flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 bg-white px-5 py-3">
        <div className="flex gap-2 overflow-x-auto">
          {TABS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={
                tab === value
                  ? "body-small-bold shrink-0 rounded-full bg-point-600 px-3 py-1.5 text-white"
                  : "body-small shrink-0 rounded-full bg-zinc-100 px-3 py-1.5 text-zinc-700"
              }
            >
              {TAB_LABEL[value]}
            </button>
          ))}
        </div>

        {isLoggedIn ? (
          <button
            type="button"
            onClick={() => setWishlistOnly((current) => !current)}
            aria-pressed={wishlistOnly}
            aria-label={wishlistOnly ? "찜한 축제만 보기 해제" : "찜한 축제만 보기"}
            className={
              wishlistOnly
                ? "flex shrink-0 items-center gap-1 rounded-full bg-point-600 px-3 py-1.5 text-white"
                : "flex shrink-0 items-center gap-1 rounded-full bg-zinc-100 px-3 py-1.5 text-zinc-700"
            }
          >
            <HeartIcon filled={wishlistOnly} className="size-4" />
            <span className="body-small">찜한 축제만</span>
          </button>
        ) : null}
      </div>

      {wishlistOnly && festivalsWithCoords.length === 0 ? (
        <p className="body-small py-2 text-zinc-400">이 조건에 좌표가 있는 찜한 축제가 없어요.</p>
      ) : null}

      {query.isError ? (
        <p className="body-small text-error">{getApiErrorMessage(query.error)}</p>
      ) : null}
      {sdkError ? <p className="body-small text-error">{sdkError}</p> : null}

      <div ref={mapContainerRef} className="min-h-0 flex-1" />

      <Link
        href="/"
        className="body-small-bold absolute left-4 top-16 z-[500] rounded-full bg-white px-4 py-2 shadow-md"
      >
        리스트 보기
      </Link>

      {selected ? (
        <FestivalMarkerCard
          key={selected.id}
          festival={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}

function FestivalMarkerCard({
  festival,
  onClose,
}: {
  festival: UserFestivalResponse;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const hasHydrated = useUserAuthHasHydrated();
  const session = useUserAuthStore((state) => state.session);
  const isLoggedIn = hasHydrated && session !== null;

  // [수정] festival은 지도 마커를 클릭한 시점의 스냅샷이라, 부모(MapPanel)의 목록이
  // 백그라운드에서 다시 불러와져도 이 카드에 표시된 festival 객체 자체는 안 바뀐다.
  // 그래서 하트를 눌러도 요청은 나가는데 화면의 하트 아이콘이 그대로였다 — 카드 안에
  // 로컬 상태를 따로 둬서, 토글 응답이 오면 이 카드가 즉시 반영하게 고쳤다. 다른 마커를
  // 선택하면 호출부에서 key={festival.id}를 주기 때문에 이 컴포넌트가 통째로 새로
  // 만들어지고, useState 초기값이 자동으로 새 festival 기준으로 다시 잡힌다.
  const [wishlisted, setWishlisted] = useState(festival.wishlisted);
  const [wishlistCount, setWishlistCount] = useState(festival.wishlistCount);

  // 지도엔 마커가 여러 개라 전체에 대해 혼잡도를 미리 다 불러오면 요청이 너무 많아진다 —
  // 선택된 축제 하나에 대해서만, 그것도 진행중일 때만 불러온다.
  const congestionQuery = useQuery({
    queryKey: ["festival-congestion", festival.id],
    queryFn: () => getFestivalCongestion(festival.id),
    enabled: festival.progressStatus === "ONGOING",
  });

  const wishlistMutation = useMutation({
    mutationFn: () => toggleWishlist(festival.id),
    onSuccess: (result) => {
      setWishlisted(result.wishlisted);
      setWishlistCount((current) => current + (result.wishlisted ? 1 : -1));
      queryClient.invalidateQueries({ queryKey: ["festivals-map"] });
    },
  });

  const congestion = congestionQuery.data;

  return (
    <div className="absolute inset-x-4 bottom-6 z-[500] rounded-xl border border-zinc-200 bg-white p-4 shadow-lg">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="body-small absolute right-3 top-3 text-zinc-400"
      >
        ✕
      </button>
      <div className="flex items-center gap-2">
        <p className="body-regular-bold text-zinc-950">{festival.name}</p>
        <StatusBadge status={festival.progressStatus} />
      </div>
      <p className="body-caption mt-1 text-zinc-400">
        {formatDateRange(festival.startDate, festival.endDate)}
      </p>
      <div className="mt-1">
        <FestivalStats wishlistCount={wishlistCount} reviewCount={festival.reviewCount} />
      </div>
      {congestion?.averageWaitMinutes !== undefined && congestion?.averageWaitMinutes !== null ? (
        <p className="body-caption mt-1 text-zinc-500">
          지금 평균 대기 {congestion.averageWaitMinutes}분
          {congestion.activeQueueCount ? ` · 혼잡한 부스 ${congestion.activeQueueCount}곳` : ""}
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between">
        <Link href={`/festivals/${festival.id}`} className="body-small-bold text-primary">
          상세정보 보기
        </Link>
        {isLoggedIn ? (
          <button
            type="button"
            onClick={() => wishlistMutation.mutate()}
            disabled={wishlistMutation.isPending}
            aria-label={wishlisted ? "찜 취소" : "찜하기"}
            aria-pressed={wishlisted}
            className={`inline-flex size-8 items-center justify-center ${wishlisted ? "text-red-500" : "text-zinc-950"}`}
          >
            <HeartIcon filled={wishlisted} aria-hidden className="size-4" />
          </button>
        ) : null}
      </div>
      {wishlistMutation.isError ? (
        <p className="body-caption mt-1 text-error">
          {getApiErrorMessage(wishlistMutation.error, "찜 처리에 실패했어요.")}
        </p>
      ) : null}
    </div>
  );
}
