/**
 * 이미지가 없는(또는 로드에 실패한) 축제에 보여줄 대체 이미지.
 * public/ 아래 데모 이미지 5장을 축제 id 기준으로 고르게 나눠 쓴다.
 */
export const FESTIVAL_FALLBACK_IMAGES = [
  "/2026-chookjibup-test-festival.png",
  "/demo-festival-park.jpg",
  "/demo-festival-craft.jpg",
  "/demo-festival-ginseng.jpg",
  "/demo-festival-dance.jpg",
] as const;

/** 메인 첫 화면 데모용으로 축제별 이미지를 직접 지정해 둔 것. 해시 배분보다 우선한다. */
const PINNED_FALLBACK_IMAGES: Record<string, string> = {
  "deeed71d-6143-4011-933e-009b77eecadc": "/demo-festival-park.jpg",
  "ecb626d8-2ff6-44b0-8b28-a68a3c7f9ea6": "/demo-festival-craft.jpg",
  "6606bd2f-3f3e-4510-95d4-95f59b79fdf1": "/demo-festival-ginseng.jpg",
  "80485084-3cda-4b2e-9d49-7a47860fb926": "/demo-festival-dance.jpg",
  "4b8d03bd-db49-4ffe-8152-9f1f4fb8f494": "/2026-chookjibup-test-festival.png",
};

/** FNV-1a 32bit — 같은 id는 언제나 같은 값이 나와서 목록/찜/리뷰 어디서 봐도 같은 이미지가 뜬다. */
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** 축제 id로 대체 이미지 경로를 고른다. id가 없으면 null(아이콘 플레이스홀더). */
export function getFestivalFallbackImage(festivalId?: string | null): string | null {
  if (!festivalId) return null;
  const pinned = PINNED_FALLBACK_IMAGES[festivalId];
  if (pinned) return pinned;
  return FESTIVAL_FALLBACK_IMAGES[hashString(festivalId) % FESTIVAL_FALLBACK_IMAGES.length];
}
