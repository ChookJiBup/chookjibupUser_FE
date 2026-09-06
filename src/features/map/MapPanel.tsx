"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { toggleWishlist } from "@/features/wishlist/api";
import { useUserAuthHasHydrated, useUserAuthStore } from "@/store/userAuthStore";
import { StatusBadge, formatDateRange } from "@/features/festivals/FestivalCard";
import { getFestivalCongestion, getFestivals } from "@/features/festivals/api";
import type { FestivalProgressStatus, UserFestivalResponse } from "@/features/festivals/types";

// 대한민국 대략 중심 좌표. 좌표가 있는 축제가 없을 때 기본 화면 위치로 쓴다.
const DEFAULT_CENTER: [number, number] = [36.5, 127.8];
const DEFAULT_ZOOM = 7;

type MapFilterTab = "ALL" | Exclude<FestivalProgressStatus, "COMPLETED">;

const TAB_LABEL: Record<MapFilterTab, string> = {
  ALL: "전체",
  ONGOING: "진행중",
  UPCOMING: "진행예정",
};

// 필터링 탭은 HOME01과 동일하게 두되, 지도에는 좌표가 있는 축제만 찍을 수 있어서
// "내가 저장한 축제"(위시리스트) 탭은 뺐다 — /api/wishlists/me 응답엔 좌표가 없다.
const TABS: MapFilterTab[] = ["ALL", "ONGOING", "UPCOMING"];

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

function buildDivIcon(festival: UserFestivalResponse) {
  const color = markerColor(festival.progressStatus);
  const badge =
    festival.progressStatus === "UPCOMING"
      ? `<span style="position:absolute;top:-8px;right:-8px;background:#fff;border:1px solid ${color};border-radius:9999px;font-size:9px;padding:0 4px;color:${color};">D-${daysUntil(
          festival.startDate,
        )}</span>`
      : "";
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:16px;height:16px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);">${badge}</div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

/**
 * HOME02(축제지도). Kakao Maps 대신 API 키가 필요 없는 Leaflet+OpenStreetMap을 썼다 —
 * 나중에 카카오 지도로 바꾸고 싶으면 이 컴포넌트만 교체하면 된다(다른 곳에서 안 씀).
 *
 * [알려진 제약]
 * - 혼잡도에 따른 마커 색상 구분은 없다 — 관리자 백엔드에 실시간 혼잡도 데이터 자체가 없다.
 * - 좌표(latitude/longitude)가 있는 축제만 지도에 찍힌다 — 관리자가 수동 등록한 축제는
 *   대부분 좌표가 없어서 안 찍힐 수 있다.
 */
export function MapPanel() {
  const [tab, setTab] = useState<MapFilterTab>("ALL");
  const [selected, setSelected] = useState<UserFestivalResponse | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const query = useQuery({
    queryKey: ["festivals-map", tab],
    // 지도는 페이지네이션 없이 한 번에 다 찍는다 — size를 넉넉히 잡는다.
    queryFn: () => getFestivals({ page: 0, size: 100, status: tab === "ALL" ? undefined : tab }),
  });

  const festivalsWithCoords = useMemo(
    () =>
      (query.data?.items ?? []).filter((item) => item.latitude !== null && item.longitude !== null),
    [query.data],
  );

  // 지도는 최초 1회만 만들고, 이후엔 마커만 갈아끼운다 (매 렌더마다 지도를 새로 만들면
  // 확대/축소 상태가 계속 초기화된다).
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    festivalsWithCoords.forEach((festival) => {
      const marker = L.marker([festival.latitude as number, festival.longitude as number], {
        icon: buildDivIcon(festival),
      });
      marker.on("click", () => setSelected(festival));
      marker.addTo(layer);
    });
  }, [festivalsWithCoords]);

  return (
    <div className="relative flex h-[calc(100dvh-48px)] flex-col">
      <div className="flex gap-2 overflow-x-auto border-b border-zinc-100 bg-white px-4 py-3">
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

      {query.isError ? (
        <p className="body-small p-4 text-error">{getApiErrorMessage(query.error)}</p>
      ) : null}

      <div ref={mapContainerRef} className="min-h-0 flex-1" />

      <Link
        href="/"
        className="body-small-bold absolute left-4 top-16 z-[500] rounded-full bg-white px-4 py-2 shadow-md"
      >
        리스트 보기
      </Link>

      {selected ? (
        <FestivalMarkerCard festival={selected} onClose={() => setSelected(null)} />
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

  // 지도엔 마커가 여러 개라 전체에 대해 혼잡도를 미리 다 불러오면 요청이 너무 많아진다 —
  // 선택된 축제 하나에 대해서만, 그것도 진행중일 때만 불러온다.
  const congestionQuery = useQuery({
    queryKey: ["festival-congestion", festival.id],
    queryFn: () => getFestivalCongestion(festival.id),
    enabled: festival.progressStatus === "ONGOING",
  });

  const wishlistMutation = useMutation({
    mutationFn: () => toggleWishlist(festival.id),
    onSuccess: () => {
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
            aria-label={festival.wishlisted ? "찜 취소" : "찜하기"}
            className="body-large"
          >
            {festival.wishlisted ? "♥" : "♡"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
