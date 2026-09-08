import type {
  RoadmapNodeResponse,
  RoadmapNodeType,
  RoadmapPresentationResponse,
  RoadmapResponse,
} from "./types";

export interface LatLngPoint {
  lat: number;
  lng: number;
}

/** 팜플렛 이미지의 네 귀퉁이. 서버가 앵커에서 계산해 준 값이라 프론트는 변환하지 않는다. */
export interface PamphletCorners {
  topLeft: LatLngPoint;
  topRight: LatLngPoint;
  bottomRight: LatLngPoint;
  bottomLeft: LatLngPoint;
}

export interface PamphletOverlayData extends PamphletCorners {
  imageUrl: string;
  /** 0~1로 잘라 둔 값. 서버 값이 이상하면 기본값(0.7)을 쓴다. */
  opacity: number;
  clipToBoundary: boolean;
}

const DEFAULT_OPACITY = 0.7;

function isWgs84(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * 값이 실제로 WGS84 좌표일 때만 통과시킨다.
 *
 * 부스 geometryData는 구버전(schema 1.0)이면 이미지 대비 0~1 정규화 x/y가 들어 있는데,
 * 그건 lat/lng 키가 아예 없으므로 여기서 자연스럽게 걸러진다.
 */
function readPoint(value: unknown): LatLngPoint | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const { lat, lng } = record;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!isWgs84(lat, lng)) return null;
  return { lat, lng };
}

/** 부지 경계 폴리곤. 점이 하나라도 깨졌으면 통째로 버린다(반쯤 그린 경계가 더 헷갈린다). */
export function readBoundary(
  presentation: RoadmapPresentationResponse | null | undefined,
): LatLngPoint[] | null {
  const raw = presentation?.boundary;
  if (!Array.isArray(raw) || raw.length < 3) return null;
  const points: LatLngPoint[] = [];
  for (const item of raw) {
    const point = readPoint(item);
    if (!point) return null;
    points.push(point);
  }
  return points;
}

/** 팜플렛 오버레이. 이미지 URL이나 귀퉁이가 하나라도 없으면 그리지 않는다. */
export function readOverlay(
  presentation: RoadmapPresentationResponse | null | undefined,
): PamphletOverlayData | null {
  const overlay = presentation?.overlay;
  if (!overlay) return null;
  if (typeof overlay.imageUrl !== "string" || overlay.imageUrl.trim() === "") return null;

  const topLeft = readPoint(overlay.topLeft);
  const topRight = readPoint(overlay.topRight);
  const bottomRight = readPoint(overlay.bottomRight);
  const bottomLeft = readPoint(overlay.bottomLeft);
  if (!topLeft || !topRight || !bottomRight || !bottomLeft) return null;

  const opacity =
    typeof overlay.opacity === "number" && Number.isFinite(overlay.opacity)
      ? Math.min(1, Math.max(0, overlay.opacity))
      : DEFAULT_OPACITY;

  return {
    imageUrl: overlay.imageUrl,
    topLeft,
    topRight,
    bottomRight,
    bottomLeft,
    opacity,
    clipToBoundary: overlay.clipToBoundary === true,
  };
}

/** 이름이 없는 노드에 대신 보여줄 라벨. */
const NODE_TYPE_LABEL: Record<RoadmapNodeType, string> = {
  BOOTH: "부스",
  STAGE: "무대",
  RESTROOM: "화장실",
  ENTRANCE: "입구",
  EXIT: "출구",
  PATH: "통로",
  BUILDING: "건물",
  OPEN_SPACE: "빈 공간",
  PARKING: "주차장",
  INFORMATION: "안내소",
  QUEUE: "대기줄",
  OTHER: "기타",
};

/** 지도 위에 찍는 점 하나. */
export interface RoadmapPin {
  id: string;
  name: string;
  nodeType: RoadmapNodeType;
  isBooth: boolean;
  /** 부스가 속한 구역 이름. 부스가 아니면 null. */
  zoneName: string | null;
  point: LatLngPoint;
}

function readNodePoint(node: RoadmapNodeResponse): LatLngPoint | null {
  if (!node.geometryData) return null;
  try {
    return readPoint(JSON.parse(node.geometryData));
  } catch {
    // 깨진 geometry 하나 때문에 지도 전체를 막지 않는다.
    return null;
  }
}

/** 좌표(POINT)를 가진 노드만 지도에 찍는다. 사각형/폴리곤 노드는 목록에서만 보여준다. */
export function collectRoadmapPins(roadmap: RoadmapResponse): RoadmapPin[] {
  const pins: RoadmapPin[] = [];

  roadmap.zones.forEach((zone) => {
    zone.booths.forEach((booth) => {
      const point = readNodePoint(booth);
      if (!point) return;
      pins.push({
        id: booth.publicId,
        name: booth.name ?? "이름 없는 부스",
        nodeType: booth.nodeType,
        isBooth: true,
        zoneName: zone.name,
        point,
      });
    });
  });

  roadmap.otherNodes.forEach((node) => {
    const point = readNodePoint(node);
    if (!point) return;
    pins.push({
      id: node.publicId,
      name: node.name ?? NODE_TYPE_LABEL[node.nodeType],
      nodeType: node.nodeType,
      isBooth: false,
      zoneName: null,
      point,
    });
  });

  return pins;
}
