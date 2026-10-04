"use client";

import { useEffect, useState } from "react";

/** 실제 API 조회 성공 시각을 새로고침 결과를 확인하기 쉬운 시·분·초로 표시한다. */
export function formatFetchedTime(timestamp: number): string | null {
  if (timestamp <= 0) return null;

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(timestamp);
}

/** 조회 직후에는 성공 피드백을, 잠시 뒤에는 정확한 조회 시각을 표시한다. */
export function useFetchedTimeLabel(timestamp: number): string | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const currentTime = Date.now();
    if (timestamp <= 0) return;

    const recentDuration = 5 * 1000;
    const remaining = recentDuration - (currentTime - timestamp);
    const timer = window.setTimeout(() => setNow(Date.now()), Math.max(0, remaining));
    return () => window.clearTimeout(timer);
  }, [timestamp]);

  const formatted = formatFetchedTime(timestamp);
  if (!formatted) return null;
  return now - timestamp < 5 * 1000 ? "방금 업데이트" : `마지막 업데이트 ${formatted}`;
}
