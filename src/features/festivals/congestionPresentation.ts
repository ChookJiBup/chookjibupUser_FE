import type {
  BoothCongestionLevel,
  BoothCongestionResponse,
  FestivalCongestionResponse,
} from "./types";

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
 * 「전체 혼잡도」에 보여줄 등급.
 *
 * <p>이 값은 서버가 `congestionLevel`로 내려준다(부스 등급 중 가장 높은 값). 프론트가
 * 직접 파생시키지 않는 이유는 같은 값을 두 화면(축제 상세의 실시간 요약, 실시간 현황)이
 * 쓰는데 규칙이 양쪽에 흩어져 있으면 언젠가 한쪽만 바뀌기 때문이다.</p>
 *
 * <p>필드가 아예 없는 응답(= 이 필드를 내려주기 전 서버)일 때만 예전과 똑같은 규칙으로
 * 대신 계산한다. 규칙이 서버와 글자 그대로 같으므로 값이 어긋날 일이 없고, 배포가
 * 엇갈린 잠깐 동안 화면이 「정보 없음」으로 비지 않는다.</p>
 */
export function resolveOverallLevel(
  congestion: FestivalCongestionResponse | null | undefined,
): BoothCongestionLevel | null {
  if (!congestion) return null;
  if (congestion.congestionLevel !== undefined) return congestion.congestionLevel;
  return deriveOverallLevel(congestion.booths);
}

/** 구버전 서버 대비용 대체 계산. 서버의 규칙(부스 등급 중 최고값)과 같아야 한다. */
function deriveOverallLevel(booths: BoothCongestionResponse[]): BoothCongestionLevel | null {
  const levels = booths
    .map((booth) => booth.congestionLevel)
    .filter((level): level is BoothCongestionLevel => level !== null);
  if (levels.length === 0) return null;
  return levels.reduce((worst, level) => (LEVEL_RANK[level] > LEVEL_RANK[worst] ? level : worst));
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
