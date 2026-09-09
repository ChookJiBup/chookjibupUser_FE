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
  collectRoadmapPins,
  readBoundary,
  readOverlay,
  type LatLngPoint,
  type RoadmapPin,
} from "./mapPresentation";
import type { RoadmapResponse } from "./types";

/** 경계/팜플렛이 화면에 들어오도록 setBounds를 부르므로 초기 레벨은 크게 중요하지 않다. */
const INITIAL_LEVEL = 3;
const FIT_PADDING = 16;

function buildPinElement(pin: RoadmapPin): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.title = pin.name;
  button.setAttribute("aria-label", pin.name);
  button.style.cssText = "display:block;padding:0;border:0;background:transparent;cursor:pointer;";

  /*
    전부 같은 동그라미로 찍었더니 부스와 화장실·입구가 지도에서 구분되지 않았다.
    관리자 부스맵과 같은 유형 아이콘을 넣고, 부스는 포인트 색·시설은 회색으로 둔다.
  */
  const color = pin.isBooth ? "#fd7e14" : "#52525b";
  const marker = document.createElement("span");
  marker.style.cssText = `display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);color:white;`;
  marker.appendChild(createPinIcon(pin.nodeType, 12));
  button.appendChild(marker);

  return button;
}

function buildLabelElement(pin: RoadmapPin): HTMLDivElement {
  const label = document.createElement("div");
  label.style.cssText =
    "margin-bottom:8px;max-width:200px;border-radius:8px;background:white;padding:6px 10px;box-shadow:0 2px 8px rgba(0,0,0,0.18);font-size:12px;line-height:1.4;color:#09090b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
  label.textContent = pin.zoneName ? `${pin.zoneName} · ${pin.name}` : pin.name;
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
}: {
  roadmap: RoadmapResponse;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const [map, setMap] = useState<KakaoMapInstance | null>(null);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [selected, setSelected] = useState<RoadmapPin | null>(null);

  const boundary = useMemo(() => readBoundary(roadmap.presentation), [roadmap.presentation]);
  const overlay = useMemo(() => readOverlay(roadmap.presentation), [roadmap.presentation]);
  const pins = useMemo(() => collectRoadmapPins(roadmap), [roadmap]);

  // 처음 화면에 담을 범위. 경계 > 팜플렛 귀퉁이 > 부스 점 순으로 우선한다.
  const fitPoints = useMemo<LatLngPoint[]>(() => {
    if (boundary) return boundary;
    if (overlay)
      return [overlay.topLeft, overlay.topRight, overlay.bottomRight, overlay.bottomLeft];
    return pins.map((pin) => pin.point);
  }, [boundary, overlay, pins]);

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
      const element = buildPinElement(pin);
      element.addEventListener("click", () => {
        setSelected((current) => (current?.id === pin.id ? null : pin));
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
  }, [map, pins]);

  // 선택한 점 위에 뜨는 이름표.
  useEffect(() => {
    if (!map || !selected) return;
    const labelOverlay = new window.kakao.maps.CustomOverlay({
      position: new window.kakao.maps.LatLng(selected.point.lat, selected.point.lng),
      content: buildLabelElement(selected),
      yAnchor: 1,
      zIndex: 20,
    });
    labelOverlay.setMap(map);
    return () => labelOverlay.setMap(null);
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
      </div>
      {imageFailed ? (
        <p className="body-caption text-zinc-400">
          팜플렛 이미지를 불러오지 못해 지도만 보여주고 있어요.
        </p>
      ) : null}
    </div>
  );
}
