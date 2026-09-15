"use client";

import type {
  LatLng,
  LeafletEvent,
  LeafletEventHandlerFn,
  Map as LeafletMap,
  Point,
  ZoomAnimEvent,
} from "leaflet";

import type { LeafletModule } from "@/lib/map/leafletMap";
import type { LatLngPoint, PamphletCorners } from "./mapPresentation";

const SVG_NS = "http://www.w3.org/2000/svg";

let overlaySequence = 0;

export interface PamphletOverlayOptions {
  L: LeafletModule;
  map: LeafletMap;
  /** 이미지를 넣을 pane. 부스 핀보다 아래에 깔려야 한다. */
  pane: string;
  imageUrl: string;
  /** 서버가 계산해 준 네 귀퉁이. 프론트에서 다시 투영 계산을 하지 않는다. */
  corners: PamphletCorners;
  boundary: LatLngPoint[] | null;
  clipToBoundary: boolean;
  opacity: number;
  /** 이미지가 안 열릴 때 호출된다. 지도와 부스 표시는 그대로 두고 팜플렛만 걷어낸다. */
  onImageError?: () => void;
}

export interface PamphletOverlayHandle {
  destroy: () => void;
}

/*
  줌 애니메이션 도착 위치를 구하는 Leaflet 내부 멤버. 공개 타입에는 없지만
  L.ImageOverlay·L.Marker가 같은 멤버로 줌 애니메이션을 맞춘다(1.9.4 기준).
*/
interface LeafletMapInternals {
  _zoomAnimated: boolean;
  _latLngToNewLayerPoint: (latlng: LatLng, zoom: number, center: LatLng) => Point;
}

/** 세 점으로 이미지 단위 사각형(1x1)을 화면 좌표에 맞추는 아핀 변환. */
function affineMatrix(
  topLeft: { x: number; y: number },
  topRight: { x: number; y: number },
  bottomLeft: { x: number; y: number },
): string {
  const a = topRight.x - topLeft.x;
  const b = topRight.y - topLeft.y;
  const c = bottomLeft.x - topLeft.x;
  const d = bottomLeft.y - topLeft.y;
  return `matrix(${a} ${b} ${c} ${d} ${topLeft.x} ${topLeft.y})`;
}

/**
 * Leaflet 커스텀 레이어로 팜플렛 이미지를 네 귀퉁이에 맞춰 그린다.
 *
 * 남서/북동 bounds(L.imageOverlay 방식)로 그리면 회전이 사라지므로 쓰지 않는다.
 * 사각형을 대각선으로 나눠 삼각형 두 개를 각각 아핀 변환하는 방식이라,
 * 관리자가 회전·기울여 맞춘 모양이 그대로 재현된다.
 *
 * 위치 동기화는 L.ImageOverlay와 같은 방식이다.
 * - 줌이 바뀌거나(핀치 중 매 프레임 포함) 뷰가 리셋되면 레이어 좌표로 다시 그린다.
 * - 버튼·더블탭 줌 애니메이션 동안에는 그려 둔 SVG를 통째로 CSS 변환해 따라가게 한다.
 *   투영이 줌에 대해 균일 확대라 도착 지점 한 점과 배율만으로 정확히 맞는다.
 * - 드래그 이동은 pane 전체가 함께 움직이므로 다시 그릴 필요가 없다.
 *
 * 방문객은 팜플렛을 만질 수 없어야 하므로 pointer-events를 끈다 —
 * 켜면 그 아래에 있는 부스 마커 클릭이 전부 막힌다.
 */
export function createPamphletOverlay(options: PamphletOverlayOptions): PamphletOverlayHandle {
  const { L, map, pane, imageUrl, corners, boundary, clipToBoundary, opacity, onImageError } =
    options;

  overlaySequence += 1;
  const clipId = `pamphlet-clip-${overlaySequence}`;
  let disposed = false;
  /** 지금 그려 둔 SVG 원점(레이어 좌표 최소점)의 위경도. 줌 애니메이션 기준점이다. */
  let originLatLng: LatLng | null = null;

  const root = document.createElement("div");
  root.style.position = "absolute";
  root.style.left = "0";
  root.style.top = "0";
  root.style.pointerEvents = "none";
  root.style.opacity = String(Math.min(1, Math.max(0, opacity)));

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("overflow", "visible");
  svg.style.position = "absolute";
  svg.style.left = "0";
  svg.style.top = "0";
  svg.style.overflow = "visible";

  const defs = document.createElementNS(SVG_NS, "defs");
  const boundaryClip = document.createElementNS(SVG_NS, "clipPath");
  boundaryClip.setAttribute("id", clipId);
  boundaryClip.setAttribute("clipPathUnits", "userSpaceOnUse");
  const boundaryPolygon = document.createElementNS(SVG_NS, "polygon");
  boundaryClip.appendChild(boundaryPolygon);
  defs.appendChild(boundaryClip);

  const group = document.createElementNS(SVG_NS, "g");

  const firstImage = document.createElementNS(SVG_NS, "image");
  firstImage.setAttribute("preserveAspectRatio", "none");
  firstImage.setAttribute("width", "1");
  firstImage.setAttribute("height", "1");
  firstImage.setAttribute("href", imageUrl);
  const secondImage = firstImage.cloneNode(true) as SVGImageElement;

  const handleImageError = () => {
    if (!disposed) onImageError?.();
  };
  firstImage.addEventListener("error", handleImageError);

  // 이미지 변환 바깥 그룹에 삼각형 클립을 걸어야 지도 좌표를 그대로 쓸 수 있다.
  const triangleClips = [firstImage, secondImage].map((image, index) => {
    const clip = document.createElementNS(SVG_NS, "clipPath");
    clip.setAttribute("id", `${clipId}-${index}`);
    clip.setAttribute("clipPathUnits", "userSpaceOnUse");
    const polygon = document.createElementNS(SVG_NS, "polygon");
    clip.appendChild(polygon);
    defs.appendChild(clip);

    const wrapper = document.createElementNS(SVG_NS, "g");
    wrapper.setAttribute("clip-path", `url(#${clip.id})`);
    wrapper.appendChild(image);
    group.appendChild(wrapper);
    return polygon;
  });

  svg.appendChild(defs);
  svg.appendChild(group);
  root.appendChild(svg);

  const useBoundaryClip = clipToBoundary && boundary !== null && boundary.length >= 3;

  const draw = () => {
    if (disposed) return;
    const toLayerPoint = (point: LatLngPoint) => map.latLngToLayerPoint(point);

    const projectedCorners = [
      toLayerPoint(corners.topLeft),
      toLayerPoint(corners.topRight),
      toLayerPoint(corners.bottomRight),
      toLayerPoint(corners.bottomLeft),
    ];
    const projectedBoundary = useBoundaryClip && boundary ? boundary.map(toLayerPoint) : [];

    /*
      SVG를 레이어 좌표 최소점에 놓고 그 안은 상대 좌표로 그린다. 원점을 (0,0)에 고정해 두면
      줌 애니메이션 때 한 점 기준으로 확대하는 CSS 변환을 걸 수 없다.
    */
    const all = [...projectedCorners, ...projectedBoundary];
    const minX = Math.min(...all.map((point) => point.x));
    const minY = Math.min(...all.map((point) => point.y));
    const maxX = Math.max(...all.map((point) => point.x));
    const maxY = Math.max(...all.map((point) => point.y));
    const origin = L.point(minX, minY);
    originLatLng = map.layerPointToLatLng(origin);
    L.DomUtil.setPosition(root, origin);
    svg.setAttribute("width", String(maxX - minX));
    svg.setAttribute("height", String(maxY - minY));

    const local = (point: Point) => ({ x: point.x - minX, y: point.y - minY });
    const [topLeft, topRight, bottomRight, bottomLeft] = projectedCorners.map(local);

    firstImage.setAttribute("transform", affineMatrix(topLeft, topRight, bottomLeft));
    // 나머지 반쪽은 나머지 세 점으로 만든 평행사변형 기준으로 맞춘다.
    secondImage.setAttribute(
      "transform",
      affineMatrix(
        {
          x: topRight.x + bottomLeft.x - bottomRight.x,
          y: topRight.y + bottomLeft.y - bottomRight.y,
        },
        topRight,
        bottomLeft,
      ),
    );

    [
      [topLeft, topRight, bottomLeft],
      [topRight, bottomRight, bottomLeft],
    ].forEach((triangle, index) => {
      triangleClips[index].setAttribute(
        "points",
        triangle.map((point) => `${point.x},${point.y}`).join(" "),
      );
    });

    if (useBoundaryClip) {
      boundaryPolygon.setAttribute(
        "points",
        projectedBoundary
          .map(local)
          .map((point) => `${point.x},${point.y}`)
          .join(" "),
      );
      group.setAttribute("clip-path", `url(#${clipId})`);
    } else {
      group.removeAttribute("clip-path");
    }
  };

  const animateZoom = (event: LeafletEvent) => {
    if (disposed || !originLatLng) return;
    const { zoom, center } = event as ZoomAnimEvent;
    const internals = map as unknown as LeafletMapInternals;
    L.DomUtil.setTransform(
      root,
      internals._latLngToNewLayerPoint(originLatLng, zoom, center),
      map.getZoomScale(zoom),
    );
  };

  const zoomAnimated = (map as unknown as LeafletMapInternals)._zoomAnimated;

  class PamphletImageLayer extends L.Layer {
    onAdd(target: LeafletMap) {
      // 줌 애니메이션을 지원하면 CSS 전환을 타고, 아니면 줌 도중엔 잠깐 숨긴다(ImageOverlay와 동일).
      L.DomUtil.addClass(root, zoomAnimated ? "leaflet-zoom-animated" : "leaflet-zoom-hide");
      (target.getPane(pane) ?? target.getPanes().overlayPane).appendChild(root);
      draw();
      return this;
    }

    onRemove() {
      root.remove();
      return this;
    }

    getEvents() {
      const events: Record<string, LeafletEventHandlerFn> = { zoom: draw, viewreset: draw };
      if (zoomAnimated) events.zoomanim = animateZoom;
      return events;
    }
  }

  const layer = new PamphletImageLayer();
  layer.addTo(map);

  // 탭 전환 등으로 지도 컨테이너 크기가 바뀌면 지도 크기를 다시 재고 다시 그린다.
  const resizeObserver = new ResizeObserver(() => {
    if (disposed) return;
    map.invalidateSize();
    draw();
  });
  resizeObserver.observe(map.getContainer());

  return {
    destroy: () => {
      disposed = true;
      resizeObserver.disconnect();
      firstImage.removeEventListener("error", handleImageError);
      layer.remove();
    },
  };
}
