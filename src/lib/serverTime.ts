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

/**
 * 로컬 달력 기준 Date를 `yyyy-MM-dd`로 적는다.
 *
 * <p>월·일은 두 자리로 0을 채운다(`2026-9-5`가 아니라 `2026-09-05`). `toISOString()`을
 * 쓰면 UTC로 찍혀 한국 시간 오전 9시 이전이 전날로 밀리므로 쓰지 않는다.</p>
 */
export function toIsoDateString(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 서버가 내려준 시각 문자열에서 «한국에서 본 날짜»만 `yyyy-MM-dd`로 뽑는다.
 *
 * <p>예전에는 `toLocaleDateString("ko-KR")`로 찍어 `2026. 9. 20.`처럼 마침표가 붙고
 * 자릿수도 들쑥날쑥했다. 날짜 표기를 하이픈으로 통일하면서 바꿨다.</p>
 *
 * <p>문자열 앞 10글자를 그냥 자르면 안 된다. 서버 값은 타임존 없는 UTC라
 * (`2026-09-20T16:30:00` = 한국시간 9월 21일 새벽 1시 30분) 저녁에 쓴 리뷰의 날짜가
 * 하루 전으로 보인다. {@link parseServerDateTime}으로 UTC임을 못박아 읽은 뒤
 * 로컬 달력에서 날짜를 꺼낸다.</p>
 */
export function formatServerDate(iso: string | null | undefined): string | null {
  const date = parseServerDateTime(iso);
  return date ? toIsoDateString(date) : null;
}

/**
 * 서버가 내려주는 `09:00:00` 같은 시각에서 초를 떼어 낸다.
 *
 * <p>운영시간은 분 단위로만 정하는데 초까지 그대로 보여 주면 「09:00:00~18:00:00」처럼
 * 읽기 힘든 줄이 된다.</p>
 */
export function formatClockTime(time: string | null | undefined): string | null {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!match) return time;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}
