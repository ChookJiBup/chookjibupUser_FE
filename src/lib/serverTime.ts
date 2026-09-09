/**
 * 서버가 내려주는 시각 문자열을 다룬다.
 *
 * <p>백엔드는 `2026-09-09T05:06:37`처럼 **타임존 표기 없이 UTC**로 내려준다. 그대로
 * `new Date()`에 넣으면 브라우저가 로컬시간(한국이면 KST)으로 읽어 정확히 9시간이
 * 어긋난다. 방금 갱신한 값이 「9시간 전」으로 보이고, 사흘 전 값이 미래 시각처럼
 * 보이던 것이 이 때문이다.</p>
 */
export function parseServerDateTime(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  // 이미 타임존이 붙어 있으면(Z 또는 +09:00) 그 값을 믿는다.
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(iso);
  const parsed = new Date(hasZone ? iso : `${iso}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * "언제 기준인지" 표기. 오늘이면 시각만, 그보다 오래됐으면 날짜까지 보여 준다.
 *
 * <p>시각만 적어 두면 사흘 전 값도 「오후 2:31 기준」으로 보여 방금 갱신된 것처럼
 * 읽힌다. 실시간이라고 적힌 자리일수록 날짜가 빠지면 안 된다.</p>
 */
export function formatServerUpdatedAt(iso: string | null | undefined): string | null {
  const date = parseServerDateTime(iso);
  if (!date) return null;

  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const hours = date.getHours();
  const period = hours < 12 ? "오전" : "오후";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const time = `${period} ${displayHour}:${minutes}`;

  return sameDay ? time : `${date.getMonth() + 1}월 ${date.getDate()}일 ${time}`;
}
