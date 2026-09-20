"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDownIcon,
  Cross2Icon,
  ListBulletIcon,
  MinusIcon,
  PlusIcon,
  UpdateIcon,
} from "@radix-ui/react-icons";

import { HeartIcon } from "@/components/icons/HeartIcon";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { formatTimeAgo } from "@/lib/relativeTime";
import { useUserAuthHasHydrated, useUserAuthStore } from "@/store/userAuthStore";
import { StatusBadge, WishlistHeart, formatDateRange } from "@/features/festivals/FestivalCard";
import { getFestivalCongestion, getFestivals } from "@/features/festivals/api";
import { REGIONS } from "@/features/festivals/regions";
import {
  CONGESTION_DOT_CLASS,
  CONGESTION_LABEL,
  CONGESTION_LEVELS,
  CONGESTION_PILL_CLASS,
  CONGESTION_TEXT_CLASS,
  resolveOverallLevel,
} from "@/features/festivals/congestionPresentation";
import type {
  BoothCongestionLevel,
  FestivalCongestionResponse,
  FestivalProgressStatus,
  UserFestivalResponse,
} from "@/features/festivals/types";
import { type KakaoMapInstance, loadKakaoMapsSdk } from "@/lib/map/kakaoMaps";
import { createCalendarIcon, createSunIcon } from "./markerIcons";

// 대한민국 대략 중심 좌표. 좌표가 있는 축제가 없을 때 기본 화면 위치로 쓴다.
const DEFAULT_CENTER = { lat: 36.5, lng: 127.8 };
const DEFAULT_LEVEL = 13; // 카카오맵은 레벨이 클수록 축소(줌아웃)된다.
/** 확대/축소 버튼이 오갈 수 있는 범위. 카카오맵이 허용하는 전 구간을 그대로 쓴다. */
const MIN_LEVEL = 1;
const MAX_LEVEL = 14;

type MapFilterTab = "ALL" | FestivalProgressStatus | "WISHLIST";

/**
 * 상단 필터 줄. 홈(`FestivalListPanel`)과 같은 탭을 같은 순서로 둔다 — 두 화면은
 * 「목록 보기 ↔ 지도 보기」로 오가는 한 쌍이라 필터가 다르면 오간 뒤 결과가 달라진다.
 */
const TABS: { value: MapFilterTab; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "ONGOING", label: "진행중" },
  { value: "UPCOMING", label: "진행예정" },
  { value: "COMPLETED", label: "진행완료" },
  { value: "WISHLIST", label: "내가 저장한 축제" },
];

/**
 * 「전체」 탭에 올릴 축제 상태. 홈과 같은 규칙이다.
 *
 * 끝난 축제는 「진행완료」 탭에서 따로 본다. 전체에 섞으면 목록이 시작일 오름차순이라
 * 지난 축제가 앞을 다 차지하고, 지도에서는 지금 갈 수 있는 축제가 옛날 축제 수백 개에
 * 파묻힌다. 백엔드 status 파라미터는 값을 하나만 받으므로 두 상태를 따로 조회해 잇는다.
 */
const ACTIVE_STATUSES: Exclude<FestivalProgressStatus, "COMPLETED">[] = ["ONGOING", "UPCOMING"];
/** 백엔드가 한 번에 내주는 최대치. 이보다 크게 요청하면 400이 난다. */
const MAP_PAGE_SIZE = 100;
/**
 * 한 상태에서 이어 읽을 최대 페이지 수.
 *
 * 지도는 페이지네이션이 없어 한 번에 다 받아야 한다(진행예정만 200건이 넘어 100건에서
 * 끊으면 나머지가 지도에서 통째로 사라진다). 다만 진행완료는 이미 1,000건이 넘고 앞으로
 * 계속 쌓이기만 하므로, 데이터가 늘어도 요청 수가 무한정 늘지 않게 상한을 둔다.
 */
const MAX_PAGES_PER_STATUS = 12;
/**
 * 혼잡도 응답을 다시 쓰는 시간. 지도에 뜬 진행중 축제마다 한 번씩 부르는 값이라
 * 탭을 오갈 때마다 다시 부르면 요청이 금세 수십 건으로 불어난다.
 */
const CONGESTION_STALE_MS = 60 * 1000;

/** 마커 동그라미 공통 모양. 색만 상태에 따라 갈아끼운다. */
const MARKER_CIRCLE_BASE = "flex size-8 items-center justify-center rounded-full";
/** 선택된 마커. 시안에서 선택은 등급색과 무관하게 진한 주황 채움 + 흰 아이콘이다. */
const MARKER_SELECTED_CLASS = `${MARKER_CIRCLE_BASE} bg-point-600 text-white`;
/**
 * 혼잡도가 없는 마커(진행예정·진행완료, 그리고 아직 한 번도 갱신 안 된 진행중 축제).
 * 「채움 = 등급 있음, 비움 = 등급 없음」 규칙은 실시간 현황 지도와 같다 — 등급이 없는데
 * 색을 채우면 지도에서는 「여유」나 「보통」으로 읽힌다.
 */
const MARKER_PLAIN_CLASS = `${MARKER_CIRCLE_BASE} border border-zinc-300 bg-white text-zinc-400`;

const MARKER_ICON_SIZE = 16;

function daysUntil(startDate: string | null): number | null {
  if (!startDate) return null;
  const diffMs = new Date(startDate).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * 마커 아래에 적을 한 줄.
 *
 * <p>시안은 진행중이 아닌 축제에 디데이(`D-3`)를 달아 두었는데, 그건 아직 열리지 않은
 * 축제에만 말이 되는 표기다. 이미 끝난 축제에 「D-0」을 달면 오늘 여는 축제처럼 읽히므로
 * 「종료」라고 적는다. 진행중 축제는 시안대로 아무것도 달지 않는다(혼잡도가 색으로 이미
 * 말해 준다).</p>
 */
function markerCaption(festival: UserFestivalResponse): string | null {
  if (festival.progressStatus === "UPCOMING") {
    const days = daysUntil(festival.startDate);
    return days === null ? null : `D-${days}`;
  }
  if (festival.progressStatus === "COMPLETED") return "종료";
  return null;
}

/** 선택 여부에 따른 동그라미 색. 혼잡도 색은 목록 배지와 같은 토큰 묶음을 그대로 쓴다. */
function markerCircleClass(
  festival: UserFestivalResponse,
  level: BoothCongestionLevel | null,
  selected: boolean,
): string {
  if (selected) return MARKER_SELECTED_CLASS;
  if (festival.progressStatus !== "ONGOING" || !level) return MARKER_PLAIN_CLASS;
  return `${MARKER_CIRCLE_BASE} ${CONGESTION_PILL_CLASS[level]}`;
}

interface MarkerHandle {
  circle: HTMLElement;
  /** 선택이 풀렸을 때 되돌릴 색. 혼잡도가 도착해 바뀌면 마커를 다시 그리므로 여기 값도 같이 새로 잡힌다. */
  restClass: string;
}

function buildMarkerElement(
  festival: UserFestivalResponse,
  level: BoothCongestionLevel | null,
  selected: boolean,
): { root: HTMLButtonElement; handle: MarkerHandle } {
  const root = document.createElement("button");
  root.type = "button";
  root.className = "flex cursor-pointer flex-col items-center gap-0.5";
  root.setAttribute("aria-label", festival.name);
  root.title = festival.name;

  const restClass = markerCircleClass(festival, level, false);
  const circle = document.createElement("span");
  circle.className = selected ? MARKER_SELECTED_CLASS : restClass;
  circle.appendChild(
    festival.progressStatus === "ONGOING"
      ? createSunIcon(MARKER_ICON_SIZE)
      : createCalendarIcon(MARKER_ICON_SIZE),
  );
  root.appendChild(circle);

  const caption = markerCaption(festival);
  if (caption) {
    const label = document.createElement("span");
    label.className = "body-caption whitespace-nowrap text-zinc-500";
    label.textContent = caption;
    root.appendChild(label);
  }

  return { root, handle: { circle, restClass } };
}

/**
 * HOME02(축제지도). 카카오맵 JS SDK를 쓴다 — NEXT_PUBLIC_KAKAO_MAP_KEY 환경변수가
 * 필요하다(카카오 개발자 콘솔 > 내 애플리케이션 > 플랫폼 키 > JavaScript 키).
 *
 * [알려진 제약]
 * - 좌표(latitude/longitude)가 있는 축제만 지도에 찍는다. 관리자 콘솔로 등록한 축제는
 *   아직 좌표가 null로 내려와서(백엔드 수정 PR 대기 중) 지도에서 빠진다 — 좌표 없이
 *   주소만으로 지오코딩해 찍으면 엉뚱한 자리에 축제가 생기고, 그건 「안 보이는 것」보다
 *   나쁘다. 좌표가 채워지면 이 화면은 고칠 것 없이 그대로 늘어난다.
 * - 축제별 혼잡도는 목록 API에 없고 축제당 한 번씩 따로 불러야 한다. 그래서 혼잡도가
 *   의미 있는 진행중 축제에 대해서만 부른다(현재 좌표 있는 진행중 축제는 20여 곳).
 *   진행예정·진행완료까지 부르면 요청이 수백 건이 되는데, 그쪽은 애초에 혼잡도가 없다.
 */
export function MapPanel() {
  const [tab, setTab] = useState<MapFilterTab>("ONGOING");
  const [region, setRegion] = useState("ALL");
  const [mapReady, setMapReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_LEVEL);
  const [sdkError, setSdkError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const overlaysRef = useRef<{ setMap: (map: KakaoMapInstance | null) => void }[]>([]);
  const markersRef = useRef(new Map<string, MarkerHandle>());

  const hasHydrated = useUserAuthHasHydrated();
  const session = useUserAuthStore((state) => state.session);
  const isLoggedIn = hasHydrated && session !== null;

  const regionFilter = region === "ALL" ? undefined : region;
  /*
    「내가 저장한 축제」 탭도 전체 탭과 같은 두 상태를 읽는다. 찜 목록 API(/api/wishlists/me)
    에는 좌표가 아예 없어서 지도에 찍을 수가 없고, 이미 받아 온 목록의 wishlisted 플래그로
    거르는 편이 요청도 적다. 끝난 축제까지 더해 거르려면 1,000건이 넘는 진행완료를 전부
    받아야 해서, 저장한 축제 중 끝난 것은 「진행완료」 탭에서 보게 둔다.
  */
  const statuses =
    tab === "ONGOING" || tab === "UPCOMING" || tab === "COMPLETED" ? [tab] : ACTIVE_STATUSES;

  const query = useQuery({
    queryKey: ["festivals-map", tab, region, isLoggedIn],
    /*
      지도는 페이지네이션 없이 한 번에 다 찍으므로 totalPages만큼 이어서 부른다.
      status를 안 주면 종료된 축제까지 시작일 오름차순으로 섞여 와서 첫 장이 전부 옛날
      축제가 된다.
    */
    queryFn: async () => {
      const perStatus = await Promise.all(
        statuses.map(async (status) => {
          const first = await getFestivals({
            page: 0,
            size: MAP_PAGE_SIZE,
            status,
            region: regionFilter,
          });
          const pageCount = Math.min(first.totalPages, MAX_PAGES_PER_STATUS);
          if (pageCount <= 1) return first.items;
          const rest = await Promise.all(
            Array.from({ length: pageCount - 1 }, (_, index) =>
              getFestivals({
                page: index + 1,
                size: MAP_PAGE_SIZE,
                status,
                region: regionFilter,
              }),
            ),
          );
          return [...first.items, ...rest.flatMap((page) => page.items)];
        }),
      );
      return perStatus.flat();
    },
    /*
      로그인 여부가 키에 들어 있으므로, 세션 복원(hydration)이 끝나기 전에 한 번 부르면
      복원 직후 키가 바뀌며 같은 조회를 통째로 다시 한다. 진행완료 탭은 그 한 번이
      11개 요청이라 두 배가 그대로 체감된다. 복원은 첫 렌더 직후라 기다려도 지도가
      늦어 보이지 않는다(카카오맵 SDK 로딩이 어차피 더 오래 걸린다).
    */
    enabled: hasHydrated,
  });

  const festivalsWithCoords = useMemo(
    () =>
      (query.data ?? [])
        .filter((item) => item.latitude !== null && item.longitude !== null)
        .filter((item) => tab !== "WISHLIST" || item.wishlisted),
    [query.data, tab],
  );

  // 혼잡도는 진행중 축제에만 있다. 진행예정·진행완료까지 부르면 요청만 수백 건 늘고 답은 비어 온다.
  const ongoingFestivals = useMemo(
    () => festivalsWithCoords.filter((item) => item.progressStatus === "ONGOING"),
    [festivalsWithCoords],
  );

  const congestionQueries = useQueries({
    queries: ongoingFestivals.map((festival) => ({
      queryKey: ["festival-congestion", festival.id],
      queryFn: () => getFestivalCongestion(festival.id),
      staleTime: CONGESTION_STALE_MS,
    })),
  });

  const levels = congestionQueries.map((item) =>
    resolveOverallLevel(item.data as FestivalCongestionResponse | undefined),
  );
  /*
    마커를 다시 그릴지 판단할 값. Map과 쿼리 배열은 렌더마다 새 객체라 그대로 의존성에
    넣으면 매 렌더 마커를 전부 지웠다 새로 만든다(지도에 최대 수백 개가 뜬다). 등급이
    실제로 바뀌었을 때만 달라지는 문자열 하나로 줄여서 비교한다.
  */
  const levelSignature = ongoingFestivals
    .map((festival, index) => `${festival.id}:${levels[index] ?? ""}`)
    .join("|");
  const levelByFestivalId = useMemo(() => {
    const map = new Map<string, BoothCongestionLevel | null>();
    ongoingFestivals.forEach((festival, index) => map.set(festival.id, levels[index]));
    return map;
    // 위 문자열이 곧 ongoingFestivals와 levels를 합친 값이라, 그것만 보면 충분하다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelSignature]);

  const selected = useMemo(
    () => festivalsWithCoords.find((item) => item.id === selectedId) ?? null,
    [festivalsWithCoords, selectedId],
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
        setMapReady(true);
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
    if (!map || !mapReady) return;

    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];
    markersRef.current.clear();

    festivalsWithCoords.forEach((festival) => {
      const position = new window.kakao.maps.LatLng(
        festival.latitude as number,
        festival.longitude as number,
      );

      const level = levelByFestivalId.get(festival.id) ?? null;
      const { root, handle } = buildMarkerElement(festival, level, festival.id === selectedId);
      root.addEventListener("click", () => setSelectedId(festival.id));
      markersRef.current.set(festival.id, handle);

      /*
        디데이 글자가 붙은 마커는 내용이 아래로 더 길어서, 가운데(0.5)를 좌표에 맞추면
        동그라미가 실제 위치보다 위로 뜬다. 동그라미 중심이 좌표에 오도록 비율을 따로 준다.
      */
      const overlay = new window.kakao.maps.CustomOverlay({
        position,
        content: root,
        yAnchor: markerCaption(festival) ? 0.32 : 0.5,
      });

      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    });
    // selectedId는 아래 효과에서 색만 갈아끼운다 — 선택할 때마다 마커를 전부 다시 만들면
    // 진행완료 탭처럼 수백 개가 뜬 화면이 눈에 띄게 끊긴다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [festivalsWithCoords, mapReady, levelByFestivalId]);

  // 선택이 바뀌면 이미 만들어 둔 마커의 색만 바꾼다.
  useEffect(() => {
    markersRef.current.forEach((handle, id) => {
      handle.circle.className = id === selectedId ? MARKER_SELECTED_CLASS : handle.restClass;
    });
  }, [selectedId, festivalsWithCoords, levelByFestivalId]);

  function changeZoom(delta: number) {
    const map = mapRef.current;
    if (!map) return;
    const next = Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, map.getLevel() + delta));
    map.setLevel(next);
    setZoomLevel(next);
  }

  return (
    <div className="relative -mx-5 -my-4 flex h-[calc(100dvh-var(--app-header-height))] flex-col">
      <h1 className="sr-only">축제 지도</h1>

      {/* 필터 줄은 홈과 같은 모양이다 — 같은 필터를 두 화면이 나눠 쓰는 것으로 읽혀야 한다. */}
      <div className="flex h-[46px] shrink-0 items-center border-b border-zinc-100 bg-white px-5">
        <div className="relative mr-2 flex h-4 shrink-0 items-center border-r-[1px] border-zinc-200 pr-4">
          <div className="relative">
            <select
              aria-label="축제 지역"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              disabled={tab === "WISHLIST"}
              className="body-small appearance-none bg-white pr-5 text-zinc-800 outline-none focus-visible:ring-2 focus-visible:ring-point-600 disabled:opacity-50"
            >
              <option value="ALL">전국</option>
              {REGIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <ChevronDownIcon
              aria-hidden
              className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-zinc-800"
            />
          </div>
        </div>
        <div className="flex h-full min-w-0 gap-3 overflow-x-auto" aria-label="축제 상태 필터">
          {TABS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={tab === value}
              onClick={() => setTab(value)}
              className={`body-small flex h-full shrink-0 items-center gap-1.5 border-b-2 px-3 ${tab === value ? "border-zinc-900 font-semibold text-zinc-900" : "border-transparent text-zinc-400"}`}
            >
              {value === "WISHLIST" && (
                <HeartIcon filled aria-hidden className="size-4 text-red-500" />
              )}
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div ref={mapContainerRef} className="size-full" />

        {/* 목록으로 돌아가기 + 확대/축소. 휠 확대가 안 되는 모바일에서 유일한 수단이다. */}
        <div className="absolute left-5 top-4 z-10 flex flex-col gap-3">
          <Link
            href="/"
            aria-label="목록으로 보기"
            className="flex size-9 items-center justify-center rounded-full bg-white text-zinc-950 shadow-md"
          >
            <ListBulletIcon aria-hidden className="size-5" />
          </Link>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              aria-label="지도 확대"
              disabled={!mapReady || zoomLevel <= MIN_LEVEL}
              onClick={() => changeZoom(-1)}
              className="flex size-9 items-center justify-center rounded-full bg-white text-zinc-950 shadow-md disabled:text-zinc-300"
            >
              <PlusIcon aria-hidden className="size-5" />
            </button>
            <button
              type="button"
              aria-label="지도 축소"
              disabled={!mapReady || zoomLevel >= MAX_LEVEL}
              onClick={() => changeZoom(1)}
              className="flex size-9 items-center justify-center rounded-full bg-white text-zinc-950 shadow-md disabled:text-zinc-300"
            >
              <MinusIcon aria-hidden className="size-5" />
            </button>
          </div>
        </div>

        {sdkError ? (
          <p className="body-small absolute inset-x-5 top-4 z-10 rounded-lg bg-white px-3 py-2 text-center text-error shadow-md">
            {sdkError}
          </p>
        ) : query.isError ? (
          <p className="body-small absolute inset-x-5 top-4 z-10 rounded-lg bg-white px-3 py-2 text-center text-error shadow-md">
            {getApiErrorMessage(query.error)}
          </p>
        ) : query.fetchStatus === "paused" ? (
          <p className="body-small absolute inset-x-5 top-4 z-10 rounded-lg bg-white px-3 py-2 text-center text-zinc-500 shadow-md">
            네트워크 연결을 확인해 주세요.
          </p>
        ) : query.isSuccess && festivalsWithCoords.length === 0 ? (
          <p className="body-small absolute inset-x-5 top-4 z-10 rounded-lg bg-white px-3 py-2 text-center text-zinc-500 shadow-md">
            이 조건에는 지도에 표시할 축제가 없어요.
          </p>
        ) : null}

        {selected ? (
          <FestivalMarkerCard festival={selected} onClose={() => setSelectedId(null)} />
        ) : null}
      </div>

      <CongestionLegend />
    </div>
  );
}

/** 마커 색이 무엇을 뜻하는지 알려 주는 띠. 지도 핀과 같은 토큰을 써야 색이 어긋나지 않는다. */
function CongestionLegend() {
  return (
    <div className="shrink-0 bg-white">
      <div aria-hidden className="flex h-1">
        {CONGESTION_LEVELS.map((level) => (
          <span key={level} className={`flex-1 ${CONGESTION_DOT_CLASS[level]}`} />
        ))}
      </div>
      <ul className="flex py-1.5">
        {CONGESTION_LEVELS.map((level) => (
          <li
            key={level}
            className={`body-small-bold flex-1 text-center ${CONGESTION_TEXT_CLASS[level]}`}
          >
            {CONGESTION_LABEL[level]}
          </li>
        ))}
      </ul>
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
  const isOngoing = festival.progressStatus === "ONGOING";

  /*
    지도에 뜬 진행중 축제의 혼잡도는 마커를 그릴 때 이미 같은 키로 받아 뒀다. 여기서 같은
    키를 다시 쓰므로 카드를 열어도 요청이 새로 나가지 않고, 새로고침 버튼만 강제로 다시
    부른다.
  */
  const congestionQuery = useQuery({
    queryKey: ["festival-congestion", festival.id],
    queryFn: () => getFestivalCongestion(festival.id),
    enabled: isOngoing,
    staleTime: CONGESTION_STALE_MS,
  });

  const level = resolveOverallLevel(congestionQuery.data);
  const updatedAgo = formatTimeAgo(congestionQuery.data?.updatedAt);

  return (
    <div className="absolute inset-x-5 bottom-5 z-10 rounded-2xl bg-white shadow-lg">
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <p className="body-large-bold truncate text-zinc-950">{festival.name}</p>
          <StatusBadge status={festival.progressStatus} />
        </div>
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="shrink-0 text-zinc-950"
        >
          <Cross2Icon aria-hidden className="size-5" />
        </button>
      </div>

      {isOngoing ? (
        <>
          <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-2">
            <span className="body-small text-zinc-400">마지막 업데이트</span>
            <span className="flex items-center gap-1.5">
              {/* 갱신된 적이 없으면 시각 자체가 없다. "방금 전"으로 채우면 없는 값을 지어내는 셈이다. */}
              <span className="body-small text-zinc-400">{updatedAgo ?? "기록 없음"}</span>
              <button
                type="button"
                aria-label="혼잡도 새로고침"
                disabled={congestionQuery.isFetching}
                onClick={() => {
                  void queryClient.invalidateQueries({
                    queryKey: ["festival-congestion", festival.id],
                  });
                }}
                className="text-zinc-400 disabled:text-zinc-300"
              >
                <UpdateIcon aria-hidden className="size-4" />
              </button>
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3">
            <span className="body-regular text-zinc-950">혼잡도</span>
            <span
              className={`body-regular-bold ${level ? CONGESTION_TEXT_CLASS[level] : "text-zinc-400"}`}
            >
              {level ? CONGESTION_LABEL[level] : "정보 없음"}
            </span>
          </div>
        </>
      ) : (
        /*
          시안에는 진행중 축제 카드만 있다. 진행예정·진행완료는 혼잡도가 아예 없으므로
          그 두 줄을 비워 두는 대신, 마커에 디데이만 보고 눌렀을 방문객이 바로 알고 싶을
          기간을 같은 자리에 적는다.
        */
        <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3">
          <span className="body-regular text-zinc-950">기간</span>
          <span className="body-small text-zinc-500">
            {formatDateRange(festival.startDate, festival.endDate)}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 px-4 pb-4">
        <Link
          href={`/festivals/${festival.id}`}
          className="body-regular flex h-12 flex-1 items-center justify-center rounded-lg border border-zinc-200 text-zinc-950"
        >
          축제 상세정보 보기
        </Link>
        {/* 목록과 같은 하트를 쓴다 — 비로그인으로 누르면 로그인 화면으로 보내는 처리까지 같다. */}
        <WishlistHeart festival={festival} showWhenLoggedOut />
      </div>
    </div>
  );
}
