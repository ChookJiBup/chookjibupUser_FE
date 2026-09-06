"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronLeftIcon } from "@radix-ui/react-icons";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { getFestivalCongestion } from "@/features/festivals/api";
import type { BoothCongestionResponse } from "@/features/festivals/types";

const CONGESTION_LABEL: Record<string, string> = {
  LOW: "여유",
  MEDIUM: "보통",
  HIGH: "혼잡",
};

const CONGESTION_BADGE_CLASS: Record<string, string> = {
  LOW: "bg-secondary-600 text-white",
  MEDIUM: "bg-point-600 text-white",
  HIGH: "bg-error text-white",
};

/** "축제현황 전체 보기" 대상 페이지. 상세 페이지 헤더의 요약(상위 3개)과 달리 전체 부스를 보여준다. */
export function FestivalCongestionPanel({ festivalId }: { festivalId: string }) {
  const query = useQuery({
    queryKey: ["festival-congestion", festivalId],
    queryFn: () => getFestivalCongestion(festivalId),
  });

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
        <Link href={`/festivals/${festivalId}`} aria-label="뒤로가기">
          <ChevronLeftIcon className="size-5 text-zinc-700" />
        </Link>
        <p className="body-regular-bold text-zinc-950">축제 현황</p>
      </div>

      {query.isLoading ? <p className="body-regular p-4 text-zinc-500">불러오는 중...</p> : null}
      {query.fetchStatus === "paused" ? (
        <p className="body-small p-4 text-error">네트워크 연결을 확인해 주세요.</p>
      ) : null}
      {query.isError ? (
        <p className="body-small p-4 text-error">{getApiErrorMessage(query.error)}</p>
      ) : null}

      {query.data ? (
        <div className="flex flex-col gap-3 p-4">
          {query.data.averageWaitMinutes !== null ? (
            <p className="body-small text-zinc-500">
              평균 대기 {query.data.averageWaitMinutes}분 · 혼잡한 부스{" "}
              {query.data.activeQueueCount ?? 0}곳
            </p>
          ) : null}

          {query.data.booths.length === 0 ? (
            <p className="body-regular text-zinc-400">아직 등록된 부스가 없어요.</p>
          ) : (
            <div className="flex flex-col divide-y divide-zinc-100 rounded-lg border border-zinc-200">
              {query.data.booths.map((booth) => (
                <BoothRow key={booth.boothId} booth={booth} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function BoothRow({ booth }: { booth: BoothCongestionResponse }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <p className="body-small text-zinc-950">{booth.boothName}</p>
      <div className="flex items-center gap-2">
        {booth.waitMinutes !== null ? (
          <span className="body-small text-zinc-500">{booth.waitMinutes}분</span>
        ) : (
          <span className="body-caption text-zinc-400">정보 없음</span>
        )}
        {booth.congestionLevel ? (
          <span
            className={`body-caption rounded-full px-2 py-0.5 ${CONGESTION_BADGE_CLASS[booth.congestionLevel]}`}
          >
            {CONGESTION_LABEL[booth.congestionLevel]}
          </span>
        ) : null}
      </div>
    </div>
  );
}
