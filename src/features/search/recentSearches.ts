/**
 * 최근 검색어 보관 규칙.
 *
 * <p>백엔드에 최근 검색어를 저장하는 API가 없어서 브라우저 localStorage에만 둔다 —
 * 기기를 바꾸면 남지 않는다(서버 저장이 생기면 이 파일만 갈아 끼우면 된다).</p>
 *
 * <p>목록을 다루는 계산은 전부 여기 순수 함수로 빼 두고, 화면은 읽기/쓰기 두 함수만
 * 쓴다. 저장소 접근이 막히는 환경(사파리 비공개 모드 등)에서도 검색 자체는 계속
 * 동작해야 하기 때문에 읽기·쓰기 모두 실패를 삼킨다.</p>
 */

const RECENT_SEARCH_KEY = "chookjibup:recent-festival-searches";

/** 칩이 두 줄을 넘지 않는 선. 넘치면 오래된 것부터 버린다. */
export const MAX_RECENT_SEARCHES = 8;

/**
 * localStorage에 들어 있던 값을 믿지 않고 문자열 목록으로 정규화한다.
 * 예전 버전이 남긴 값이나 사용자가 직접 고친 값이 들어와도 화면이 깨지면 안 된다.
 */
export function normalizeRecentSearches(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (trimmed === "") continue;
    if (result.some((kept) => isSameKeyword(kept, trimmed))) continue;
    result.push(trimmed);
    if (result.length >= MAX_RECENT_SEARCHES) break;
  }
  return result;
}

/**
 * 같은 검색어인지 판정한다. 백엔드 축제명 검색이 대소문자를 무시하므로
 * `Seoul`과 `seoul`은 최근 검색어에서도 한 칸만 차지하게 한다.
 */
function isSameKeyword(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * 방금 검색한 말을 맨 앞에 올린다. 같은 말을 다시 검색하면 자리를 옮기기만 하고
 * 개수는 늘지 않으며, 표기는 마지막에 입력한 쪽을 남긴다.
 */
export function addRecentSearch(list: string[], keyword: string): string[] {
  const trimmed = keyword.trim();
  if (trimmed === "") return list;
  return [trimmed, ...list.filter((item) => !isSameKeyword(item, trimmed))].slice(
    0,
    MAX_RECENT_SEARCHES,
  );
}

/** 칩의 ✕로 한 개만 지운다. */
export function removeRecentSearch(list: string[], keyword: string): string[] {
  return list.filter((item) => !isSameKeyword(item, keyword));
}

/**
 * 저장된 최근 검색어를 읽는다. 비공개 모드처럼 localStorage 접근 자체가 예외를
 * 던지는 환경이 있어서 실패하면 빈 목록으로 본다.
 */
export function loadRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCH_KEY);
    if (!raw) return [];
    return normalizeRecentSearches(JSON.parse(raw));
  } catch {
    return [];
  }
}

/**
 * 최근 검색어를 저장한다. 비공개 모드·저장 용량 초과에서는 setItem이 예외를 던지는데,
 * 그것 때문에 검색까지 멈추면 안 되므로 조용히 넘어간다(이번 세션 동안 화면에는 남는다).
 */
export function saveRecentSearches(keywords: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(keywords));
  } catch {
    // 저장 실패는 무시한다 — 최근 검색어는 있으면 편한 값일 뿐 기능의 전제가 아니다.
  }
}
