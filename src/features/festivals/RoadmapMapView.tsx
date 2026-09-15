"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";

import {
  createBaseMap,
  createHtmlMarker,
  ensurePane,
  loadLeaflet,
  type LeafletModule,
} from "@/lib/map/leafletMap";
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

/*
  확대 단계는 카카오맵 시절 레벨을 옮겨 왔다(Leaflet zoom ≈ 20 - 카카오 level).
  경계/팜플렛이 화면에 들어오도록 fitBounds를 부르므로 초기 줌은 크게 중요하지 않다.
*/
const INITIAL_ZOOM = 17; // 카카오 레벨 3
const FIT_PADDING = 16;
/** Leaflet 줌은 클수록 확대. 부스가 겹쳐 보이지 않는 선까지만 허용한다. */
const MIN_ZOOM = 12; // 카카오 레벨 8
const MAX_ZOOM = 19; // 카카오 레벨 1

/*
  그리는 순서. 카카오맵에서 오버레이 zIndex(구역 이름표 5 · 핀 10 · 선택 이름표 20)와
  "팜플렛은 오버레이 맨 아래"로 잡던 순서를 pane으로 옮겼다. 도형(400)은 기본 pane에 둔다.
*/
const PAMPHLET_PANE = "pamphletPane";
const AREA_LABEL_PANE = "areaLabelPane";
const PIN_PANE = "pinPane";
const SELECTED_LABEL_PANE = "selectedLabelPane";

/** 부스별 혼잡도. 배치도 노드와 혼잡도 API는 id 체계가 달라 부스 이름으로 잇는다. */
export interface BoothCongestionHint {
  level: BoothCongestionLevel | null;
  waitMinutes: number | null;
}

/*
  혼잡도 색은 목록·랭킹 배지(bg-secondary-600 / bg-point-600 / bg-error)와 같은 값이어야
  한다 — 여기 hex를 따로 적어 두었더니 같은 화면에서 "여유"가 지도에선 초록, 목록에선
  파랑으로 보였다. 지도 핀은 리액트 밖에서 만드는 DOM이라 Tailwind 클래스를 붙일 수
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
 * 부스지도 탭의 지도(Leaflet). 관리자가 맞춰 둔 부지 경계와 팜플렛을 **읽기 전용**으로 얹고,
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
  const mapRef = useRef<LeafletMap | null>(null);
  // 도형·마커를 만들려면 지도 인스턴스와 함께 불러온 Leaflet 모듈도 필요해서 같이 들고 있는다.
  const [leaflet, setLeaflet] = useState<{ L: LeafletModule; map: LeafletMap } | null>(null);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  const boundary = useMemo(() => readBoundary(roadmap.presentation), [roadmap.presentation]);
  const overlay = useMemo(() => readOverlay(roadmap.presentation), [roadmap.presentation]);
  const pins = useMemo(() => collectRoadmapPins(roadmap), [roadmap]);
  const areas = useMemo(() => collectRoadmapAreas(roadmap), [roadmap]);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
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

    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const created = createBaseMap(L, containerRef.current, {
          center,
          zoom: INITIAL_ZOOM,
          minZoom: MIN_ZOOM,
          maxZoom: MAX_ZOOM,
        });
        ensurePane(created, PAMPHLET_PANE, 450);
        ensurePane(created, AREA_LABEL_PANE, 610);
        ensurePane(created, PIN_PANE, 620);
        ensurePane(created, SELECTED_LABEL_PANE, 630);
        mapRef.current = created;
        setLeaflet({ L, map: created });
      })
      .catch((error: Error) => {
        if (!cancelled) setSdkError(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, [center]);

  // 화면을 떠날 때만 지도를 치운다. 위 effect에서 치우면 배치도가 다시 불려올 때마다 지도가 새로 만들어진다.
  useEffect(
    () => () => {
      mapRef.current?.remove();
      mapRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!leaflet || fitPoints.length < 2) return;
    const { L, map } = leaflet;
    const bounds = L.latLngBounds(fitPoints);
    if (bounds.isValid()) {
      // 카카오 setBounds처럼 애니메이션 없이 바로 맞춘다.
      map.fitBounds(bounds, { padding: [FIT_PADDING, FIT_PADDING], animate: false });
    }
  }, [leaflet, fitPoints]);

  // 부지 경계 폴리곤.
  useEffect(() => {
    if (!leaflet || !boundary) return;
    const { L, map } = leaflet;
    const polygon = L.polygon(boundary, {
      weight: 3,
      color: "#18181b",
      opacity: 0.9,
      fillColor: "#18181b",
      fillOpacity: 0.04,
      // 카카오 폴리곤처럼 탭을 가로채지 않는다.
      interactive: false,
    }).addTo(map);
    return () => {
      polygon.remove();
    };
  }, [leaflet, boundary]);

  /*
    구역 도형. 관리자가 묶어 둔 구역을 방문객도 볼 수 있어야 «로스터리 마켓존이 어디»가
    성립한다. 예전에는 이 도형이 시설 칩 줄에 이름만 흘러 들어가 있었다.
  */
  useEffect(() => {
    if (!leaflet || areas.length === 0) return;
    const { L, map } = leaflet;
    const drawn = areas.map((area) =>
      L.polygon(area.points, {
        weight: 2,
        color: "#fd7e14",
        opacity: 0.7,
        // 카카오 strokeStyle "shortdash"에 해당하는 점선(선 굵기 2 기준 3:1).
        dashArray: "6 2",
        fillColor: "#fd7e14",
        fillOpacity: 0.08,
        interactive: false,
      }).addTo(map),
    );
    return () => drawn.forEach((polygon) => polygon.remove());
  }, [leaflet, areas]);

  // 구역 이름표. 도형만 칠해 두면 어느 구역인지 알 수 없다.
  useEffect(() => {
    if (!leaflet || areas.length === 0) return;
    const { L, map } = leaflet;
    const markers = areas.flatMap((area) => {
      if (!area.name) return [];
      const label = document.createElement("span");
      label.style.cssText =
        "display:block;border-radius:9999px;background:rgba(253,126,20,0.9);padding:2px 8px;font-size:11px;line-height:1.4;color:white;white-space:nowrap;";
      label.textContent = area.name;
      return [
        createHtmlMarker(L, {
          position: centerOf(area.points),
          content: label,
          pane: AREA_LABEL_PANE,
        }).addTo(map),
      ];
    });
    return () => markers.forEach((item) => item.remove());
  }, [leaflet, areas]);

  // 팜플렛 이미지.
  useEffect(() => {
    if (!leaflet || !overlay || imageFailed) return;
    const handle = createPamphletOverlay({
      L: leaflet.L,
      map: leaflet.map,
      pane: PAMPHLET_PANE,
      imageUrl: overlay.imageUrl,
      corners: overlay,
      boundary,
      clipToBoundary: overlay.clipToBoundary && boundary !== null,
      opacity: overlay.opacity,
      onImageError: () => setImageFailed(true),
    });
    return () => handle.destroy();
  }, [leaflet, overlay, boundary, imageFailed]);

  // 부스·시설 점. 선택 상태는 따로 그리므로 여기서 다시 만들지 않는다.
  useEffect(() => {
    if (!leaflet) return;
    const { L, map } = leaflet;

    const markers = pins.map((pin) => {
      const marker = createHtmlMarker(L, {
        position: pin.point,
        content: buildPinElement(pin, congestionByBoothName?.get(pin.name)),
        pane: PIN_PANE,
        interactive: true,
      });
      // DOM click 대신 마커 click을 쓴다 — 핀에서 시작한 드래그가 끝날 때 선택되지 않게 Leaflet이 걸러 준다.
      marker.on("click", () => {
        onSelectNode?.(pin.id === selectedNodeId ? null : pin.id);
      });
      return marker.addTo(map);
    });

    return () => markers.forEach((item) => item.remove());
  }, [leaflet, pins, congestionByBoothName, selectedNodeId, onSelectNode]);

  // 선택한 점 위에 뜨는 이름표.
  useEffect(() => {
    if (!leaflet || !selected) return;
    const { L, map } = leaflet;
    const labelMarker = createHtmlMarker(L, {
      position: selected.point,
      content: buildLabelElement(selected, congestionByBoothName?.get(selected.name)),
      yAnchor: 1,
      pane: SELECTED_LABEL_PANE,
    }).addTo(map);
    return () => {
      labelMarker.remove();
    };
  }, [leaflet, selected, congestionByBoothName]);

  /*
    고른 부스로 지도를 옮긴다. 아래 목록에서 골랐을 때 «그 부스가 어디인지» 보이지 않던
    것을 잇는 부분이다.
  */
  useEffect(() => {
    if (!leaflet || !selected) return;
    leaflet.map.panTo(selected.point);
  }, [leaflet, selected]);

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
        {/* isolate: Leaflet pane의 z-index(200~1000)가 바깥 확대/축소 버튼을 덮지 않게 가둔다. */}
        <div ref={containerRef} className="isolate size-full" />
        {/* 손으로 벌리기 어려운 상황(마우스 휠은 페이지가 스크롤된다)을 위한 확대/축소. */}
        {leaflet ? (
          <div className="absolute top-2 right-2 z-10 flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <button
              type="button"
              aria-label="지도 확대"
              disabled={zoom >= MAX_ZOOM}
              className="body-small size-8 text-zinc-700 disabled:text-zinc-300"
              onClick={() => {
                const next = Math.min(MAX_ZOOM, leaflet.map.getZoom() + 1);
                leaflet.map.setZoom(next);
                setZoom(next);
              }}
            >
              +
            </button>
            <span className="h-px bg-zinc-200" />
            <button
              type="button"
              aria-label="지도 축소"
              disabled={zoom <= MIN_ZOOM}
              className="body-small size-8 text-zinc-700 disabled:text-zinc-300"
              onClick={() => {
                const next = Math.max(MIN_ZOOM, leaflet.map.getZoom() - 1);
                leaflet.map.setZoom(next);
                setZoom(next);
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
