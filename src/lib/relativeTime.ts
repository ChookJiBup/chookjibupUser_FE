import { parseServerDateTime, toIsoDateString } from "./serverTime";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * 서버 시각을 «지금으로부터 얼마나 지났는지»로 적는다.
 *
 * <p>실시간 현황 화면은 "몇 시 기준"이 아니라 "몇 분 전"이 정보다 — 방문객이 알고 싶은
 * 건 절대 시각이 아니라 «이 숫자를 믿어도 되는지»라서다. 절대 시각 표기가 필요한
 * 자리에는 {@link import("./serverTime").formatServerUpdatedAt}를 그대로 쓴다.</p>
 *
 * <p>하루가 넘어가면 "1500분 전"처럼 읽을 수 없는 값이 되므로 날짜로 떨어뜨린다.
 * 이때 날짜는 프로젝트 규칙대로 하이픈 표기(`yyyy-MM-dd`)를 쓴다.</p>
 *
 * @returns 표시할 문구. 시각이 없거나 깨졌으면 null(자리를 통째로 비운다).
 */
export function formatTimeAgo(iso: string | null | undefined): string | null {
  const date = parseServerDateTime(iso);
  if (!date) return null;

  // 서버 시계가 조금 앞서 있으면 음수가 나온다. "-1분 전"이 보이느니 "방금 전"이 낫다.
  const elapsed = Math.max(0, Date.now() - date.getTime());

  if (elapsed < MINUTE_MS) return "방금 전";
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)}분 전`;
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)}시간 전`;
  return toIsoDateString(date);
}
