"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  loadKakaoMapsSdk,
  type KakaoCustomOverlayInstance,
  type KakaoMapInstance,
} from "@/lib/map/kakaoMaps";
import { createPamphletOverlay } from "./PamphletOverlay";
import { createPinIcon } from "./pinIcons";
import {
  collectRoadmapAreas,
  collectRoadmapPins,
  readBoundary,
  readOverlay,
  type LatLngPoint,
  type RoadmapPin,
} from "./mapPresentation";
import type { BoothCongestionLevel, RoadmapResponse } from "./types";

/** 경계/팜플렛이 화면에 들어오도록 setBounds를 부르므로 초기 레벨은 크게 중요하지 않다. */
const INITIAL_LEVEL = 3;
const FIT_PADDING = 16;
/** 카카오맵 레벨은 작을수록 확대. 부스가 겹쳐 보이지 않는 선까지만 허용한다. */
const MIN_LEVEL = 1;
const MAX_LEVEL = 8;

/** 부스별 혼잡도. 배치도 노드와 혼잡도 API는 id 체계가 달라 부스 이름으로 잇는다. */
export interface BoothCongestionHint {
  level: BoothCongestionLevel | null;
  waitMinutes: number | null;
}

/*
  혼잡도 색은 목록·랭킹 배지(bg-secondary-600 / bg-point-600 / bg-error)와 같은 값이어야
  한다 — 여기 hex를 따로 적어 두었더니 같은 화면에서 "여유"가 지도에선 초록, 목록에선
  파랑으로 보였다. 카카오맵 핀은 리액트 밖에서 만드는 DOM이라 Tailwind 클래스를 붙일 수
  없으므로, 토큰의 실제 색값이 있는 globals.css :root 변수를 인라인 스타일에서 그대로
  읽는다. 색값을 이 파일에 다시 적지 않는 것이 요점이다 — 그래야 토큰이 바뀌어도 지도와
  목록이 다시 어긋나지 않는다.
*/
const CONGESTION_COLOR: Record<BoothCongestionLevel, string> = {
  LOW: "var(--secondary-600)",
  MEDIUM: "var(--point-600)",
  HIGH: "var(--red-500)",
};

/** 혼잡도와 무관하게 "부스"임을 나타내는 색. 시설(화장실·입구 등)은 회색으로 둔다. */
const BOOTH_COLOR = "var(--point-600)";
const FACILITY_COLOR = "#52525b";

const CONGESTION_LABEL: Record<BoothCongestionLevel, string> = {
  LOW: "여유",
  MEDIUM: "보통",
  HIGH: "혼잡",
};

function buildPinElement(pin: RoadmapPin, congestion?: BoothCongestionHint): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.title = pin.name;
  button.setAttribute("aria-label", pin.name);
  button.style.cssText = "display:block;padding:0;border:0;background:transparent;cursor:pointer;";

  /*
    전부 같은 동그라미로 찍었더니 부스와 화장실·입구가 지도에서 구분되지 않았다.
    관리자 부스맵과 같은 유형 아이콘을 넣고, 부스는 포인트 색·시설은 회색으로 둔다.
  */
  /*
    혼잡도가 들어온 부스는 그 색으로 채운다 — 대기시간을 보려고 목록으로 내려갔다
    다시 지도로 올라오지 않아도 되게.

    혼잡도가 아직 없는 부스는 채우지 않고 부스 색 테두리만 남긴다("채움 = 등급 있음,
    비움 = 아직 없음"). 예전에는 기본색이 MEDIUM과 같은 주황이라, 혼잡도 데이터가 아예
    없는 축제가 지도에서는 "모든 부스가 보통"으로 읽혔다. 색을 하나 더 만들지 않은 것은
    남는 색(회색)이 시설 핀과 겹치는 데다, 등급이 없더라도 부스라는 사실은 계속 보여야
    하기 때문이다.
  */
  const marker = document.createElement("span");
  const shape =
    "display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:9999px;box-shadow:0 1px 3px rgba(0,0,0,0.3);";
  if (!pin.isBooth) {
    marker.style.cssText = `${shape}background:${FACILITY_COLOR};border:2px solid white;color:white;`;
  } else if (congestion?.level) {
    marker.style.cssText = `${shape}background:${CONGESTION_COLOR[congestion.level]};border:2px solid white;color:white;`;
  } else {
    marker.style.cssText = `${shape}background:white;border:2px solid ${BOOTH_COLOR};color:${BOOTH_COLOR};`;
  }
  marker.appendChild(createPinIcon(pin.nodeType, 12));
  button.appendChild(marker);

  return button;
}

function buildLabelElement(pin: RoadmapPin, congestion?: BoothCongestionHint): HTMLDivElement {
  const label = document.createElement("div");
  label.style.cssText =
    "margin-bottom:8px;max-width:200px;border-radius:8px;background:white;padding:6px 10px;box-shadow:0 2px 8px rgba(0,0,0,0.18);font-size:12px;line-height:1.4;color:#09090b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
  const title = document.createElement("span");
  title.textContent = pin.zoneName ? `${pin.zoneName} · ${pin.name}` : pin.name;
  label.appendChild(title);

  if (congestion?.level) {
    const detail = document.createElement("span");
    detail.style.cssText = `display:block;margin-top:2px;color:${CONGESTION_COLOR[congestion.level]};`;
    detail.textContent =
      congestion.waitMinutes === null
        ? CONGESTION_LABEL[congestion.level]
        : `${CONGESTION_LABEL[congestion.level]} · 약 ${congestion.waitMinutes}분`;
    label.appendChild(detail);
  } else if (pin.isBooth) {
    // 비어 있는 핀을 눌렀을 때 "왜 색이 없는지"를 말로도 알려 준다.
    const detail = document.createElement("span");
    detail.style.cssText = "display:block;margin-top:2px;color:#71717b;";
    detail.textContent = "혼잡도 정보 없음";
    label.appendChild(detail);
  }
  return label;
}

/**
 * 부스지도 탭의 카카오맵. 관리자가 맞춰 둔 부지 경계와 팜플렛을 **읽기 전용**으로 얹고,
 * 좌표가 있는 부스·시설을 점으로 찍는다.
 *
 * 경계나 팜플렛이 없거나 이미지가 안 열려도 지도와 부스 점은 그대로 뜬다 —
 * 표시 정보 하나가 없다고 배치도 화면 전체가 죽으면 안 된다.
 */
export function RoadmapMapView({
  roadmap,
  height = 320,
  congestionByBoothName,
  selectedNodeId = null,
  onSelectNode,
}: {
  roadmap: RoadmapResponse;
  height?: number;
  /** 부스 이름 → 혼잡도. 없으면 예전처럼 이름만 보여준다. */
  congestionByBoothName?: Map<string, BoothCongestionHint>;
  /*
    지금 고른 부스. 지도와 아래 목록이 같은 값을 보게 바깥에서 들고 있는다 —
    지도가 따로 상태를 쥐면 목록에서 고른 부스로 지도가 따라가지 못한다.
  */
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const [map, setMap] = useState<KakaoMapInstance | null>(null);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  const boundary = useMemo(() => readBoundary(roadmap.presentation), [roadmap.presentation]);
  const overlay = useMemo(() => readOverlay(roadmap.presentation), [roadmap.presentation]);
  const pins = useMemo(() => collectRoadmapPins(roadmap), [roadmap]);
  const areas = useMemo(() => collectRoadmapAreas(roadmap), [roadmap]);
  const [level, setLevel] = useState(INITIAL_LEVEL);
  const selected = useMemo(
    () => pins.find((pin) => pin.id === selectedNodeId) ?? null,
    [pins, selectedNodeId],
  );

  // 처음 화면에 담을 범위. 경계 > 팜플렛 귀퉁이 > 부스 점 순으로 우선한다.
  const fitPoints = useMemo<LatLngPoint[]>(() => {
    if (boundary) return boundary;
    if (overlay)
      return [overlay.topLeft, overlay.topRight, overlay.bottomRight, overlay.bottomLeft];
    return [...areas.flatMap((area) => area.points), ...pins.map((pin) => pin.point)];
  }, [boundary, overlay, pins, areas]);

  const center = useMemo<LatLngPoint | null>(() => {
    if (fitPoints.length === 0) return null;
    const sum = fitPoints.reduce(
      (acc, point) => ({ lat: acc.lat + point.lat, lng: acc.lng + point.lng }),
      { lat: 0, lng: 0 },
    );
    return { lat: sum.lat / fitPoints.length, lng: sum.lng / fitPoints.length };
  }, [fitPoints]);

  // 지도는 최초 1회만 만든다 — 다시 만들면 방문객이 맞춰 둔 확대/이동이 초기화된다.
  useEffect(() => {
    if (!center) return;
    let cancelled = false;

    loadKakaoMapsSdk()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const created = new window.kakao.maps.Map(containerRef.current, {
          center: new window.kakao.maps.LatLng(center.lat, center.lng),
          level: INITIAL_LEVEL,
        });
        created.setMinLevel(MIN_LEVEL);
        created.setMaxLevel(MAX_LEVEL);
        mapRef.current = created;
        setMap(created);
      })
      .catch((error: Error) => {
        if (!cancelled) setSdkError(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, [center]);

  useEffect(() => {
    if (!map || fitPoints.length < 2) return;
    const bounds = new window.kakao.maps.LatLngBounds();
    fitPoints.forEach((point) => {
      bounds.extend(new window.kakao.maps.LatLng(point.lat, point.lng));
    });
    if (!bounds.isEmpty()) {
      map.setBounds(bounds, FIT_PADDING, FIT_PADDING, FIT_PADDING, FIT_PADDING);
    }
  }, [map, fitPoints]);

  // 부지 경계 폴리곤.
  useEffect(() => {
    if (!map || !boundary) return;
    const polygon = new window.kakao.maps.Polygon({
      path: boundary.map((point) => new window.kakao.maps.LatLng(point.lat, point.lng)),
      strokeWeight: 3,
      strokeColor: "#18181b",
      strokeOpacity: 0.9,
      fillColor: "#18181b",
      fillOpacity: 0.04,
    });
    polygon.setMap(map);
    return () => polygon.setMap(null);
  }, [map, boundary]);

  /*
    구역 도형. 관리자가 묶어 둔 구역을 방문객도 볼 수 있어야 «로스터리 마켓존이 어디»가
    성립한다. 예전에는 이 도형이 시설 칩 줄에 이름만 흘러 들어가 있었다.
  */
  useEffect(() => {
    if (!map || areas.length === 0) return;
    const drawn = areas.map((area) => {
      const polygon = new window.kakao.maps.Polygon({
        path: area.points.map((point) => new window.kakao.maps.LatLng(point.lat, point.lng)),
        strokeWeight: 2,
        strokeColor: "#fd7e14",
        strokeOpacity: 0.7,
        strokeStyle: "shortdash",
        fillColor: "#fd7e14",
        fillOpacity: 0.08,
      });
      polygon.setMap(map);
      return polygon;
    });
    return () => drawn.forEach((polygon) => polygon.setMap(null));
  }, [map, areas]);

  // 구역 이름표. 도형만 칠해 두면 어느 구역인지 알 수 없다.
  useEffect(() => {
    if (!map || areas.length === 0) return;
    const overlays: KakaoCustomOverlayInstance[] = [];
    areas.forEach((area) => {
      if (!area.name) return;
      const center = centerOf(area.points);
      const label = document.createElement("span");
      label.style.cssText =
        "display:block;border-radius:9999px;background:rgba(253,126,20,0.9);padding:2px 8px;font-size:11px;line-height:1.4;color:white;white-space:nowrap;";
      label.textContent = area.name;
      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(center.lat, center.lng),
        content: label,
        zIndex: 5,
      });
      overlay.setMap(map);
      overlays.push(overlay);
    });
    return () => overlays.forEach((item) => item.setMap(null));
  }, [map, areas]);

  // 팜플렛 이미지.
  useEffect(() => {
    if (!map || !overlay || imageFailed) return;
    const handle = createPamphletOverlay({
      map,
      imageUrl: overlay.imageUrl,
      corners: overlay,
      boundary,
      clipToBoundary: overlay.clipToBoundary && boundary !== null,
      opacity: overlay.opacity,
      onImageError: () => setImageFailed(true),
    });
    return () => handle?.destroy();
  }, [map, overlay, boundary, imageFailed]);

  // 부스·시설 점. 선택 상태는 따로 그리므로 여기서 다시 만들지 않는다.
  useEffect(() => {
    if (!map) return;
    const overlays: KakaoCustomOverlayInstance[] = [];

    pins.forEach((pin) => {
      const element = buildPinElement(pin, congestionByBoothName?.get(pin.name));
      element.addEventListener("click", () => {
        onSelectNode?.(pin.id === selectedNodeId ? null : pin.id);
      });
      const pinOverlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(pin.point.lat, pin.point.lng),
        content: element,
        yAnchor: 0.5,
        zIndex: 10,
        clickable: true,
      });
      pinOverlay.setMap(map);
      overlays.push(pinOverlay);
    });

    return () => overlays.forEach((item) => item.setMap(null));
  }, [map, pins, congestionByBoothName, selectedNodeId, onSelectNode]);

  // 선택한 점 위에 뜨는 이름표.
  useEffect(() => {
    if (!map || !selected) return;
    const labelOverlay = new window.kakao.maps.CustomOverlay({
      position: new window.kakao.maps.LatLng(selected.point.lat, selected.point.lng),
      content: buildLabelElement(selected, congestionByBoothName?.get(selected.name)),
      yAnchor: 1,
      zIndex: 20,
    });
    labelOverlay.setMap(map);
    return () => labelOverlay.setMap(null);
  }, [map, selected, congestionByBoothName]);

  /*
    고른 부스로 지도를 옮긴다. 아래 목록에서 골랐을 때 «그 부스가 어디인지» 보이지 않던
    것을 잇는 부분이다.
  */
  useEffect(() => {
    if (!map || !selected) return;
    map.panTo(new window.kakao.maps.LatLng(selected.point.lat, selected.point.lng));
  }, [map, selected]);

  if (sdkError) {
    return (
      <div
        className="flex w-full items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50"
        style={{ height }}
      >
        <p className="body-caption px-4 text-center text-zinc-400">{sdkError}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div
        className="relative w-full overflow-hidden rounded-lg border border-zinc-200"
        style={{ height }}
      >
        <div ref={containerRef} className="size-full" />
        {/* 손으로 벌리기 어려운 상황(마우스 휠은 페이지가 스크롤된다)을 위한 확대/축소. */}
        {map ? (
          <div className="absolute top-2 right-2 z-10 flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <button
              type="button"
              aria-label="지도 확대"
              disabled={level <= MIN_LEVEL}
              className="body-small size-8 text-zinc-700 disabled:text-zinc-300"
              onClick={() => {
                const next = Math.max(MIN_LEVEL, map.getLevel() - 1);
                map.setLevel(next);
                setLevel(next);
              }}
            >
              +
            </button>
            <span className="h-px bg-zinc-200" />
            <button
              type="button"
              aria-label="지도 축소"
              disabled={level >= MAX_LEVEL}
              className="body-small size-8 text-zinc-700 disabled:text-zinc-300"
              onClick={() => {
                const next = Math.min(MAX_LEVEL, map.getLevel() + 1);
                map.setLevel(next);
                setLevel(next);
              }}
            >
              −
            </button>
          </div>
        ) : null}
      </div>
      {imageFailed ? (
        <p className="body-caption text-zinc-400">
          팜플렛 이미지를 불러오지 못해 지도만 보여주고 있어요.
        </p>
      ) : null}
    </div>
  );
}

function centerOf(points: LatLngPoint[]): LatLngPoint {
  const sum = points.reduce(
    (acc, point) => ({ lat: acc.lat + point.lat, lng: acc.lng + point.lng }),
    { lat: 0, lng: 0 },
  );
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}
