"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { getMyWishlist } from "@/features/wishlist/api";
import { useUserAuthHasHydrated, useUserAuthStore } from "@/store/userAuthStore";
import { FestivalCard } from "./FestivalCard";
import { getFestivals } from "./api";
import type { FestivalProgressStatus, FestivalSort, UserFestivalResponse } from "./types";

type FilterTab = "ALL" | FestivalProgressStatus | "WISHLIST";

const TAB_LABEL: Record<FilterTab, string> = {
  ALL: "전체",
  ONGOING: "진행중",
  UPCOMING: "진행예정",
  COMPLETED: "진행 완료",
  WISHLIST: "내가 저장한 축제",
};

/**
 * HOME01 필터 탭. Figma 설계서 기준으로는 지역별(전국+도 단위) 탭도 있는데,
 * 지금 백엔드엔 지역으로 필터링할 컬럼/API가 없어서 뺐다 — 관리자 백엔드에
 * 지역 정보가 정식으로 들어오면 그때 추가한다.
 */
const TABS: FilterTab[] = ["ALL", "ONGOING", "UPCOMING", "WISHLIST"];

type SortOption = "LATEST" | FestivalSort;

const SORT_LABEL: Record<SortOption, string> = {
  LATEST: "최신순",
  WISHLIST_COUNT: "저장 많은순",
  REVIEW_COUNT: "리뷰 많은순",
};

const SORT_OPTIONS: SortOption[] = ["LATEST", "WISHLIST_COUNT", "REVIEW_COUNT"];

export function FestivalListPanel() {
  const [tab, setTab] = useState<FilterTab>("ALL");
  const [sort, setSort] = useState<SortOption>("LATEST");
  const [page, setPage] = useState(0);
  const hasHydrated = useUserAuthHasHydrated();
  const session = useUserAuthStore((state) => state.session);
  const isLoggedIn = hasHydrated && session !== null;

  function handleTabChange(next: FilterTab) {
    setTab(next);
    setPage(0);
    // 정렬(sort)은 상태 필터가 없는 "전체" 목록에서만 백엔드가 지원한다 —
    // 다른 탭으로 옮기면 정렬을 초기화해서 잘못된 조합으로 요청이 안 나가게 한다.
    if (next !== "ALL") setSort("LATEST");
  }

  function handleSortChange(next: SortOption) {
    setSort(next);
    setPage(0);
  }

  const festivalsQuery = useQuery({
    queryKey: ["festivals", tab, sort, page],
    queryFn: () =>
      getFestivals({
        page,
        size: 20,
        status: tab === "ALL" || tab === "WISHLIST" ? undefined : tab,
        sort: tab === "ALL" && sort !== "LATEST" ? sort : undefined,
      }),
    enabled: tab !== "WISHLIST",
  });

  const wishlistQuery = useQuery({
    queryKey: ["wishlist-tab", page],
    queryFn: () => getMyWishlist(page, 20),
    enabled: tab === "WISHLIST" && isLoggedIn,
  });

  const activeQuery = tab === "WISHLIST" ? wishlistQuery : festivalsQuery;

  return (
    <div className="flex flex-col">
      <div className="flex gap-2 overflow-x-auto border-b border-zinc-100 px-4 py-3">
        {TABS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => handleTabChange(value)}
            className={
              tab === value
                ? "body-small-bold shrink-0 rounded-full bg-point-600 px-3 py-1.5 text-white"
                : "body-small shrink-0 rounded-full bg-zinc-100 px-3 py-1.5 text-zinc-700"
            }
          >
            {TAB_LABEL[value]}
          </button>
        ))}
      </div>

      {tab === "ALL" ? (
        <div className="flex gap-2 px-4 py-2">
          {SORT_OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => handleSortChange(value)}
              className={
                sort === value
                  ? "body-caption rounded-full bg-zinc-950 px-2.5 py-1 text-white"
                  : "body-caption rounded-full bg-white px-2.5 py-1 text-zinc-500 ring-1 ring-inset ring-zinc-200"
              }
            >
              {SORT_LABEL[value]}
            </button>
          ))}
        </div>
      ) : null}

      {tab === "WISHLIST" && !isLoggedIn ? (
        <p className="body-regular p-4 text-zinc-500">로그인하면 찜한 축제를 모아볼 수 있어요.</p>
      ) : (
        <FestivalListBody
          isLoading={activeQuery.isLoading}
          isPaused={activeQuery.fetchStatus === "paused"}
          isError={activeQuery.isError}
          errorMessage={activeQuery.error ? getApiErrorMessage(activeQuery.error) : ""}
          items={
            tab === "WISHLIST"
              ? (wishlistQuery.data?.items ?? []).map(toFestivalResponseFromWishlist)
              : (festivalsQuery.data?.items ?? [])
          }
          hasData={Boolean(activeQuery.data)}
          page={activeQuery.data?.page ?? 0}
          totalPages={activeQuery.data?.totalPages ?? 1}
          onPrev={() => setPage((current) => current - 1)}
          onNext={() => setPage((current) => current + 1)}
        />
      )}

      <Link
        href="/map"
        className="body-small-bold fixed bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-zinc-950 px-5 py-3 text-white shadow-lg"
        style={{ maxWidth: "var(--app-max-width)" }}
      >
        지도보기
      </Link>
    </div>
  );
}

/** 찜 목록 응답엔 progressStatus/좌표/전화번호 등이 없어서, 카드 표시에 필요한 만큼만 채워 넣는다. */
function toFestivalResponseFromWishlist(item: {
  id: string;
  name: string;
  eventPlace: string | null;
  address: string | null;
  startDate: string | null;
  endDate: string | null;
}): UserFestivalResponse {
  return {
    id: item.id,
    name: item.name,
    eventPlace: item.eventPlace,
    address: item.address,
    detailAddress: null,
    startDate: item.startDate,
    endDate: item.endDate,
    operationStartTime: null,
    operationEndTime: null,
    phoneNumber: null,
    homepageUrl: null,
    latitude: null,
    longitude: null,
    progressStatus: null,
    wishlisted: true,
  };
}

function FestivalListBody({
  isLoading,
  isPaused,
  isError,
  errorMessage,
  items,
  hasData,
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  isLoading: boolean;
  isPaused: boolean;
  isError: boolean;
  errorMessage: string;
  items: UserFestivalResponse[];
  hasData: boolean;
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (isLoading) {
    return <p className="body-regular p-4 text-zinc-500">불러오는 중...</p>;
  }
  if (isPaused) {
    return <p className="body-small p-4 text-error">네트워크 연결을 확인해 주세요.</p>;
  }
  if (isError) {
    return <p className="body-small p-4 text-error">{errorMessage}</p>;
  }
  if (!hasData || items.length === 0) {
    return <p className="body-regular p-4 pb-24 text-zinc-500">해당하는 축제가 없습니다.</p>;
  }

  return (
    <div className="flex flex-col pb-24">
      {items.map((festival) => (
        <FestivalCard key={festival.id} festival={festival} />
      ))}
      <div className="flex items-center justify-center gap-4 p-4">
        <button
          type="button"
          disabled={page === 0}
          onClick={onPrev}
          className="body-small text-zinc-700 disabled:text-zinc-300"
        >
          이전
        </button>
        <span className="body-caption text-zinc-400">
          {page + 1} / {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          disabled={page + 1 >= totalPages}
          onClick={onNext}
          className="body-small text-zinc-700 disabled:text-zinc-300"
        >
          다음
        </button>
      </div>
    </div>
  );
}
