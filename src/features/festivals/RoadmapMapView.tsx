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
  readQueuePath,
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

/**
 * 부스별 혼잡도 + 대기열(줄) 정보. key는 그 부스가 찍힌 배치도 노드의 공개 UUID다
 * (부스 이름은 겹칠 수 있어 매칭 키로 안 쓴다).
 */
export interface BoothCongestionHint {
  level: BoothCongestionLevel | null;
  waitMinutes: number | null;
  /** 줄끝 좌표. 관리자가 아직 줄을 안 그렸으면 null. */
  queueTailLatitude: number | null;
  queueTailLongitude: number | null;
  /** 줄 길이(미터). */
  queueTailMeters: number | null;
  /** 줄이 그려진 경로(위경도 점들)의 원문 JSON. */
  queuePath: string | null;
}

const CONGESTION_COLOR: Record<BoothCongestionLevel, string> = {
  LOW: "var(--secondary-600)",
  MEDIUM: "var(--point-600)",
  HIGH: "var(--red-500)",
};

const BOOTH_COLOR = "var(--point-600)";
const FACILITY_COLOR = "#52525b";
/** 대기줄 선/화살표/길이 라벨 색. 구역(주황)·혼잡도 배지 색과 겹치지 않는 파란 계열. */
const QUEUE_COLOR = "#2563eb";

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
    const detail = document.createElement("span");
    detail.style.cssText = "display:block;margin-top:2px;color:#71717b;";
    detail.textContent = "혼잡도 정보 없음";
    label.appendChild(detail);
  }
  return label;
}

/** 두 점 사이의 화면상 방향(도, 북쪽=0·시계방향). 짧은 거리라 평면 근사로 충분하다. */
function bearingDeg(from: LatLngPoint, to: LatLngPoint): number {
  const dLat = to.lat - from.lat;
  const dLng = to.lng - from.lng;
  return (Math.atan2(dLng, dLat) * 180) / Math.PI;
}

/** 줄끝에 띄우는 방향 화살표 + 길이 라벨. 화살표는 위(북쪽)를 가리키게 만든 뒤 회전시킨다. */
function buildQueueTailElement(meters: number | null, heading: number): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:2px;";

  const arrow = document.createElement("div");
  arrow.style.cssText = `width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:12px solid ${QUEUE_COLOR};transform:rotate(${heading}deg);filter:drop-shadow(0 1px 1px rgba(0,0,0,0.35));`;
  wrapper.appendChild(arrow);

  if (meters !== null) {
    const label = document.createElement("span");
    label.style.cssText = `border-radius:9999px;background:${QUEUE_COLOR};padding:1px 6px;font-size:11px;line-height:1.4;color:white;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.25);`;
    label.textContent = `${meters}m`;
    wrapper.appendChild(label);
  }

  return wrapper;
}

/**
 * 부스지도 탭의 카카오맵. 관리자가 맞춰 둔 부지 경계와 팜플렛을 **읽기 전용**으로 얹고,
 * 좌표가 있는 부스·시설을 점으로 찍는다. 좌측 상단 토글로 부스별 대기줄(방향·길이)도
 * 켜고 끌 수 있다 — 기본은 꺼짐(지금까지처럼 부스 위치만 보이는 화면)이다.
 *
 * 경계나 팜플렛이 없거나 이미지가 안 열려도 지도와 부스 점은 그대로 뜬다 —
 * 표시 정보 하나가 없다고 배치도 화면 전체가 죽으면 안 된다.
 */
export function RoadmapMapView({
  roadmap,
  height = 320,
  congestionByNodeId,
  selectedNodeId = null,
  onSelectNode,
}: {
  roadmap: RoadmapResponse;
  height?: number;
  /** 배치도 노드 publicId → 혼잡도/대기열. 없으면 예전처럼 위치만 보여준다. */
  congestionByNodeId?: Map<string, BoothCongestionHint>;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const [map, setMap] = useState<KakaoMapInstance | null>(null);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [showQueues, setShowQueues] = useState(false);

  const boundary = useMemo(() => readBoundary(roadmap.presentation), [roadmap.presentation]);
  const overlay = useMemo(() => readOverlay(roadmap.presentation), [roadmap.presentation]);
  const pins = useMemo(() => collectRoadmapPins(roadmap), [roadmap]);
  const areas = useMemo(() => collectRoadmapAreas(roadmap), [roadmap]);
  const [level, setLevel] = useState(INITIAL_LEVEL);
  const selected = useMemo(
    () => pins.find((pin) => pin.id === selectedNodeId) ?? null,
    [pins, selectedNodeId],
  );

  /*
    부스별 대기줄 경로. path_geometry가 있으면 그 경로를, 없고 줄끝 좌표만 있으면
    부스 위치 → 줄끝의 직선 2점을 쓴다. 둘 다 없는 부스는 대기줄을 그리지 않는다.
  */
  const queueLines = useMemo(() => {
    if (!congestionByNodeId) return [];
    return pins
      .filter((pin) => pin.isBooth)
      .map((pin) => {
        const hint = congestionByNodeId.get(pin.id);
        if (!hint) return null;
        const parsedPath = readQueuePath(hint.queuePath);
        let path: LatLngPoint[] | null = null;
        if (parsedPath && parsedPath.length >= 2) {
          path = parsedPath;
        } else if (hint.queueTailLatitude !== null && hint.queueTailLongitude !== null) {
          path = [pin.point, { lat: hint.queueTailLatitude, lng: hint.queueTailLongitude }];
        }
        if (!path) return null;
        return { boothId: pin.id, path, meters: hint.queueTailMeters };
      })
      .filter(
        (item): item is { boothId: string; path: LatLngPoint[]; meters: number | null } =>
          item !== null,
      );
  }, [pins, congestionByNodeId]);

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

  useEffect(() => {
    if (!map) return;
    const overlays: KakaoCustomOverlayInstance[] = [];

    pins.forEach((pin) => {
      const element = buildPinElement(pin, congestionByNodeId?.get(pin.id));
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
  }, [map, pins, congestionByNodeId, selectedNodeId, onSelectNode]);

  /*
    대기줄(방향·길이). 토글이 켜져 있을 때만 그린다 — 기본은 꺼진 상태라 지금까지처럼
    부스 위치만 보이는 화면이 유지된다. 줄마다 경로 폴리라인 + 줄끝의 방향 화살표와
    길이 라벨을 같이 그린다.
  */
  useEffect(() => {
    if (!map || !showQueues || queueLines.length === 0) return;
    const drawn: KakaoCustomOverlayInstance[] = [];

    queueLines.forEach(({ path, meters }) => {
      const polyline = new window.kakao.maps.Polyline({
        path: path.map((point) => new window.kakao.maps.LatLng(point.lat, point.lng)),
        strokeWeight: 4,
        strokeColor: QUEUE_COLOR,
        strokeOpacity: 0.85,
        strokeStyle: "solid",
      });
      polyline.setMap(map);
      drawn.push(polyline);

      const tail = path[path.length - 1];
      const before = path[path.length - 2];
      const heading = bearingDeg(before, tail);
      const tailOverlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(tail.lat, tail.lng),
        content: buildQueueTailElement(meters, heading),
        yAnchor: 1,
        zIndex: 8,
      });
      tailOverlay.setMap(map);
      drawn.push(tailOverlay);
    });

    return () => drawn.forEach((item) => item.setMap(null));
  }, [map, showQueues, queueLines]);

  useEffect(() => {
    if (!map || !selected) return;
    const labelOverlay = new window.kakao.maps.CustomOverlay({
      position: new window.kakao.maps.LatLng(selected.point.lat, selected.point.lng),
      content: buildLabelElement(selected, congestionByNodeId?.get(selected.id)),
      yAnchor: 1,
      zIndex: 20,
    });
    labelOverlay.setMap(map);
    return () => labelOverlay.setMap(null);
  }, [map, selected, congestionByNodeId]);

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
        {/* 대기줄(방향·길이) 토글. 그릴 대기줄이 하나도 없으면 아예 안 보여준다. */}
        {map && queueLines.length > 0 ? (
          <div className="absolute top-2 left-2 z-10">
            <button
              type="button"
              onClick={() => setShowQueues((current) => !current)}
              aria-pressed={showQueues}
              className={`body-caption rounded-lg border px-3 py-1.5 shadow-sm ${
                showQueues
                  ? "border-transparent bg-[#2563eb] text-white"
                  : "border-zinc-200 bg-white text-zinc-700"
              }`}
            >
              {showQueues ? "대기줄 숨기기" : "대기줄 보기"}
            </button>
          </div>
        ) : null}
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
