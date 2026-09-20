import type { BoothCongestionLevel, BoothCongestionResponse, RoadmapResponse } from "./types";

export const CONGESTION_LEVELS: BoothCongestionLevel[] = ["LOW", "MEDIUM", "HIGH"];

export const CONGESTION_LABEL: Record<BoothCongestionLevel, string> = {
  LOW: "여유",
  MEDIUM: "보통",
  HIGH: "혼잡",
};

/** 목록 행 오른쪽의 연한 pill. 배경/글자 모두 같은 계열 토큰을 쓴다. */
export const CONGESTION_PILL_CLASS: Record<BoothCongestionLevel, string> = {
  LOW: "bg-secondary-300 text-secondary-600",
  MEDIUM: "bg-point-300 text-point-600",
  HIGH: "bg-red-300 text-red-600",
};

/** 「전체 혼잡도」처럼 글자만 등급 색으로 칠하는 자리. */
export const CONGESTION_TEXT_CLASS: Record<BoothCongestionLevel, string> = {
  LOW: "text-secondary-600",
  MEDIUM: "text-point-600",
  HIGH: "text-error",
};

/*
  지도 핀은 카카오맵 오버레이에 DOM을 직접 만들어 넣어서 Tailwind 클래스를 붙일 수 없다.
  그래서 색값을 여기에 다시 적지 않고, 토큰의 실제 색이 들어 있는 globals.css :root
  변수를 인라인 스타일에서 var()로 읽는다 — 그래야 토큰이 바뀌어도 지도와 목록이
  어긋나지 않는다(부스지도에서 이미 한 번 어긋났던 부분이다).
*/
export const CONGESTION_PIN_COLOR: Record<BoothCongestionLevel, string> = {
  LOW: "var(--secondary-600)",
  MEDIUM: "var(--point-600)",
  HIGH: "var(--red-500)",
};

const LEVEL_RANK: Record<BoothCongestionLevel, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };

/**
 * 「전체 혼잡도」에 대표로 보여줄 등급.
 *
 * <p>백엔드에는 축제 단위 혼잡도 필드가 없어서 부스 등급에서 파생시킨다. 가장 높은
 * 등급을 대표로 삼는 것은 축제 상세 화면의 실시간 요약과 같은 규칙이다 — 두 화면이
 * 다른 규칙을 쓰면 같은 축제가 한쪽에선 「여유」, 다른 쪽에선 「혼잡」이 된다.</p>
 */
export function pickOverallLevel(booths: BoothCongestionResponse[]): BoothCongestionLevel | null {
  const levels = booths
    .map((booth) => booth.congestionLevel)
    .filter((level): level is BoothCongestionLevel => level !== null);
  if (levels.length === 0) return null;
  return levels.reduce((worst, level) => (LEVEL_RANK[level] > LEVEL_RANK[worst] ? level : worst));
}

/**
 * 부스 이름 → 구역 이름.
 *
 * <p>혼잡도 API의 boothId는 숫자, 배치도 노드는 UUID라 둘을 이어 붙일 키가 부스 이름밖에
 * 없다(부스지도 탭이 쓰는 방식과 같다). 그래서 배치도가 아직 발행되지 않았거나 이름이
 * 다르게 등록된 부스는 구역을 알 수 없고, 그런 부스는 구역 필터에서 자연스럽게 빠진다.</p>
 */
export function buildZoneByBoothName(roadmap: RoadmapResponse | null): Map<string, string> {
  const map = new Map<string, string>();
  roadmap?.zones.forEach((zone) => {
    zone.booths.forEach((booth) => {
      if (booth.name) map.set(booth.name, zone.name);
    });
  });
  return map;
}

/** 구역 옵션 시트에 띄울 구역 이름들. 배치도가 없으면 빈 배열이라 필터 자체를 감춘다. */
export function collectZoneNames(roadmap: RoadmapResponse | null): string[] {
  return (roadmap?.zones ?? []).map((zone) => zone.name).filter((name) => name.trim() !== "");
}

/** 구역 칩에 적을 요약 문구. 여러 개를 다 적으면 칩이 화면 밖으로 밀려난다. */
export function formatZoneChipLabel(selected: string[]): string {
  if (selected.length === 0) return "전체 구역";
  if (selected.length === 1) return selected[0];
  return `${selected[0]} 외 ${selected.length - 1}`;
}

/**
 * 지도 범례의 색 점. 지도 핀이 쓰는 색(globals.css의 --secondary-600/--point-600/--red-500)과
 * 같은 토큰이어야 범례와 핀이 어긋나지 않는다.
 */
export const CONGESTION_DOT_CLASS: Record<BoothCongestionLevel, string> = {
  LOW: "bg-secondary-600",
  MEDIUM: "bg-point-600",
  HIGH: "bg-red-500",
};
