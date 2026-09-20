"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MinusIcon, PlusIcon } from "@radix-ui/react-icons";

import {
  loadKakaoMapsSdk,
  type KakaoCustomOverlayInstance,
  type KakaoMapInstance,
} from "@/lib/map/kakaoMaps";
import { createPamphletOverlay } from "./PamphletOverlay";
import {
  collectRoadmapPins,
  readBoundary,
  readOverlay,
  type LatLngPoint,
  type RoadmapPin,
} from "./mapPresentation";
import { CONGESTION_PIN_COLOR } from "./congestionPresentation";
import type { BoothCongestionLevel, RoadmapResponse } from "./types";

const INITIAL_LEVEL = 3;
const FIT_PADDING = 24;
/** 카카오맵 레벨은 작을수록 확대. 부스가 겹쳐 보이지 않는 선까지만 허용한다. */
const MIN_LEVEL = 1;
const MAX_LEVEL = 8;

/** 선택하지 않은 핀을 얼마나 흐리게 둘지. 완전히 숨기면 부스가 몇 개인지 감이 사라진다. */
const DIMMED_OPACITY = "0.35";

function buildBoothPinElement(
  pin: RoadmapPin,
  level: BoothCongestionLevel | null | undefined,
  dimmed: boolean,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.title = pin.name;
  button.setAttribute("aria-label", pin.name);
  button.style.cssText =
    "display:block;padding:6px;border:0;background:transparent;cursor:pointer;";

  /*
    등급이 아직 없는 부스는 채우지 않고 테두리만 남긴다("채움 = 등급 있음, 비움 = 아직
    없음"). 기본색을 MEDIUM과 같은 주황으로 두면 혼잡도 데이터가 하나도 없는 축제가
    지도에서는 「모든 부스가 보통」으로 읽힌다.
  */
  const dot = document.createElement("span");
  const base =
    "display:block;width:12px;height:12px;border-radius:9999px;box-shadow:0 1px 3px rgba(0,0,0,0.3);";
  dot.style.cssText = level
    ? `${base}background:${CONGESTION_PIN_COLOR[level]};border:2px solid white;`
    : `${base}background:white;border:2px solid var(--point-600);`;
  if (dimmed) dot.style.opacity = DIMMED_OPACITY;
  button.appendChild(dot);

  return button;
}

/**
 * 「축제 실시간 현황」의 지도 뷰.
 *
 * <p>부스지도 탭(`RoadmapMapView`)과 겹쳐 보이지만 역할이 다르다. 저기는 배치도를
 * 읽는 화면이라 시설·구역까지 그리고 선택하면 말풍선을 띄우는 반면, 여기는 혼잡도만
 * 보는 화면이라 부스 점만 찍고 선택은 바깥(하단 시트)에서 처리한다. 그래서 같은
 * 컴포넌트에 분기를 넣지 않고 따로 두었다.</p>
 *
 * <p>카카오맵 SDK는 저장소에 하나뿐인 로더(`loadKakaoMapsSdk`)로만 불러온다 — 다른
 * 옵션으로 다시 부르면 이미 떠 있는 지도까지 같이 죽는다.</p>
 */
export function CongestionMapView({
  roadmap,
  levelByBoothName,
  selectedBoothName,
  onSelectBooth,
}: {
  roadmap: RoadmapResponse;
  /** 부스 이름 → 혼잡도 등급. 배치도와 혼잡도 API는 id 체계가 달라 이름으로 잇는다. */
  levelByBoothName: Map<string, BoothCongestionLevel | null>;
  selectedBoothName: string | null;
  onSelectBooth: (boothName: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const [map, setMap] = useState<KakaoMapInstance | null>(null);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(INITIAL_LEVEL);

  const boundary = useMemo(() => readBoundary(roadmap.presentation), [roadmap.presentation]);
  const overlay = useMemo(() => readOverlay(roadmap.presentation), [roadmap.presentation]);
  const boothPins = useMemo(
    () => collectRoadmapPins(roadmap).filter((pin) => pin.isBooth),
    [roadmap],
  );

  // 처음 화면에 담을 범위. 경계 > 팜플렛 귀퉁이 > 부스 점 순으로 우선한다.
  const fitPoints = useMemo<LatLngPoint[]>(() => {
    if (boundary) return boundary;
    if (overlay)
      return [overlay.topLeft, overlay.topRight, overlay.bottomRight, overlay.bottomLeft];
    return boothPins.map((pin) => pin.point);
  }, [boundary, overlay, boothPins]);

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
        setZoomLevel(created.getLevel());
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

  /*
    부지 경계선은 그리지 않는다. 시안의 지도에도 없고, 카카오맵 Polygon은 색을 문자열로
    직접 받아서 CSS 토큰(var(--...))을 넘길 수 없다 — 여기서 색을 하나 더 적는 순간
    토큰 바깥에 색이 생긴다. 경계값 자체는 화면 맞추기와 팜플렛 잘라내기에만 쓴다.
  */

  // 팜플렛 이미지. 이미지가 안 열려도 지도와 부스 점은 그대로 남는다.
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

    boothPins.forEach((pin) => {
      const dimmed = selectedBoothName !== null && selectedBoothName !== pin.name;
      const element = buildBoothPinElement(pin, levelByBoothName.get(pin.name), dimmed);
      element.addEventListener("click", () => {
        onSelectBooth(selectedBoothName === pin.name ? null : pin.name);
      });
      const pinOverlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(pin.point.lat, pin.point.lng),
        content: element,
        yAnchor: 0.5,
        zIndex: dimmed ? 10 : 20,
        clickable: true,
      });
      pinOverlay.setMap(map);
      overlays.push(pinOverlay);
    });

    return () => overlays.forEach((item) => item.setMap(null));
  }, [map, boothPins, levelByBoothName, selectedBoothName, onSelectBooth]);

  if (sdkError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-zinc-100">
        <p className="body-caption px-5 text-center text-zinc-500">{sdkError}</p>
      </div>
    );
  }

  /*
    바깥 칸을 absolute inset-0으로 채운다. 부모는 flex로 남은 높이를 받는 칸이라 높이가
    auto로 계산되는데, 그러면 안쪽 지도의 height:100%가 0으로 접혀 지도가 안 보인다.
  */
  return (
    <div className="absolute inset-0 overflow-hidden bg-zinc-200">
      <div ref={containerRef} className="size-full" />

      {/* 손으로 벌리기 어려운 상황(마우스 휠은 페이지가 스크롤된다)을 위한 확대/축소. */}
      {map ? (
        <div className="absolute top-5 left-5 z-10 flex flex-col gap-1">
          <button
            type="button"
            aria-label="지도 확대"
            disabled={zoomLevel <= MIN_LEVEL}
            className="flex size-9 items-center justify-center rounded-full bg-white text-zinc-950 shadow-md disabled:text-zinc-300"
            onClick={() => {
              const next = Math.max(MIN_LEVEL, map.getLevel() - 1);
              map.setLevel(next);
              setZoomLevel(next);
            }}
          >
            <PlusIcon className="size-5" />
          </button>
          <button
            type="button"
            aria-label="지도 축소"
            disabled={zoomLevel >= MAX_LEVEL}
            className="flex size-9 items-center justify-center rounded-full bg-white text-zinc-950 shadow-md disabled:text-zinc-300"
            onClick={() => {
              const next = Math.min(MAX_LEVEL, map.getLevel() + 1);
              map.setLevel(next);
              setZoomLevel(next);
            }}
          >
            <MinusIcon className="size-5" />
          </button>
        </div>
      ) : null}

      {imageFailed ? (
        <p className="body-caption absolute top-5 right-5 z-10 rounded-md bg-white/90 px-2 py-1 text-zinc-500">
          팜플렛 이미지를 불러오지 못했어요.
        </p>
      ) : null}
    </div>
  );
}
