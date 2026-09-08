"use client";

import type { KakaoMapInstance } from "@/lib/map/kakaoMaps";
import type { LatLngPoint, PamphletCorners } from "./mapPresentation";

const SVG_NS = "http://www.w3.org/2000/svg";

let overlaySequence = 0;

export interface PamphletOverlayOptions {
  map: KakaoMapInstance;
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
 * 카카오 `AbstractOverlay`로 팜플렛 이미지를 네 귀퉁이에 맞춰 그린다.
 *
 * 남서/북동 bounds(GroundOverlay 방식)로 그리면 회전이 사라지므로 쓰지 않는다.
 * 사각형을 대각선으로 나눠 삼각형 두 개를 각각 아핀 변환하는 방식이라,
 * 관리자가 회전·기울여 맞춘 모양이 그대로 재현된다.
 *
 * 방문객은 팜플렛을 만질 수 없어야 하므로 pointer-events를 끈다 —
 * 켜면 그 아래에 있는 부스 마커 클릭이 전부 막힌다.
 *
 * @returns SDK가 준비되지 않았으면 null.
 */
export function createPamphletOverlay(
  options: PamphletOverlayOptions,
): PamphletOverlayHandle | null {
  const { map, imageUrl, corners, boundary, clipToBoundary, opacity, onImageError } = options;

  const AbstractOverlay = window.kakao?.maps?.AbstractOverlay;
  if (typeof AbstractOverlay !== "function") return null;

  overlaySequence += 1;
  const clipId = `pamphlet-clip-${overlaySequence}`;
  let disposed = false;

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

  // 이미지 변환 바깥 그룹에 삼각형 클립을 걸어야 지도 투영 좌표를 그대로 쓸 수 있다.
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

  class PamphletImageOverlay extends AbstractOverlay {
    onAdd() {
      // 부스 마커보다 아래에 깔리도록 맨 앞에 넣는다.
      this.getPanels().overlayLayer.prepend(root);
    }

    onRemove() {
      root.remove();
    }

    draw() {
      if (disposed) return;
      const projection = this.getProjection();
      const toPoint = (point: LatLngPoint) =>
        projection.pointFromCoords(new window.kakao.maps.LatLng(point.lat, point.lng));

      const topLeft = toPoint(corners.topLeft);
      const topRight = toPoint(corners.topRight);
      const bottomRight = toPoint(corners.bottomRight);
      const bottomLeft = toPoint(corners.bottomLeft);

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

      if (clipToBoundary && boundary && boundary.length >= 3) {
        boundaryPolygon.setAttribute(
          "points",
          boundary
            .map((point) => {
              const projected = toPoint(point);
              return `${projected.x},${projected.y}`;
            })
            .join(" "),
        );
        group.setAttribute("clip-path", `url(#${clipId})`);
      } else {
        group.removeAttribute("clip-path");
      }
    }
  }

  const overlay = new PamphletImageOverlay();
  overlay.setMap(map);

  // 탭 전환 등으로 지도 컨테이너 크기가 바뀌면 다시 그린다.
  const resizeObserver = new ResizeObserver(() => {
    if (disposed) return;
    map.relayout();
    overlay.draw();
  });
  resizeObserver.observe(map.getNode());

  return {
    destroy: () => {
      disposed = true;
      resizeObserver.disconnect();
      firstImage.removeEventListener("error", handleImageError);
      overlay.setMap(null);
    },
  };
}
