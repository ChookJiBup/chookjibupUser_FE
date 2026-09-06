"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { FestivalCard } from "@/features/festivals/FestivalCard";
import type { FestivalProgressStatus, UserFestivalResponse } from "@/features/festivals/types";
import { getMyWishlist } from "./api";
import type { MyWishlistFestivalResponse } from "./types";

type FilterTab = "ALL" | FestivalProgressStatus;

const TAB_LABEL: Record<FilterTab, string> = {
  ALL: "전체",
  ONGOING: "진행중",
  UPCOMING: "진행예정",
  COMPLETED: "진행 완료",
};

const TABS: FilterTab[] = ["ALL", "ONGOING", "UPCOMING"];

function toFestivalResponse(item: MyWishlistFestivalResponse): UserFestivalResponse {
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
    progressStatus: item.progressStatus,
    wishlisted: true,
  };
}

/**
 * WISH01. 상태 필터(전체/진행중/진행예정)는 백엔드에 필터 파라미터가 없어서
 * 한 페이지 분량(넉넉하게 100개)을 받아온 뒤 화면에서 걸러낸다 — 찜 목록은
 * 보통 개수가 많지 않아서 이 정도로 충분하다.
 *
 * [알려진 제약] Figma 설계서에는 체크박스로 여러 개 선택해서 한 번에 삭제하는
 * 편집 모드가 있는데, 백엔드에 일괄 삭제 API가 없어서 이번엔 빠졌다. 지금은
 * 카드 눌러서 상세로 들어간 뒤 하트를 다시 눌러 하나씩 찜 취소하는 방식이다.
 */
export function WishlistPanel() {
  const [tab, setTab] = useState<FilterTab>("ALL");

  const query = useQuery({
    queryKey: ["my-wishlist"],
    queryFn: () => getMyWishlist(0, 100),
  });

  if (query.isLoading) {
    return <p className="body-regular p-4 text-zinc-500">불러오는 중...</p>;
  }

  if (query.fetchStatus === "paused") {
    return <p className="body-small p-4 text-error">네트워크 연결을 확인해 주세요.</p>;
  }

  if (query.isError) {
    return <p className="body-small p-4 text-error">{getApiErrorMessage(query.error)}</p>;
  }

  const allItems = query.data?.items ?? [];
  const items = tab === "ALL" ? allItems : allItems.filter((item) => item.progressStatus === tab);

  return (
    <div className="flex flex-col">
      <div className="flex gap-2 overflow-x-auto border-b border-zinc-100 px-4 py-3">
        {TABS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
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

      {allItems.length === 0 ? (
        <p className="body-regular p-4 text-zinc-500">찜한 축제가 없습니다.</p>
      ) : items.length === 0 ? (
        <p className="body-regular p-4 text-zinc-500">해당하는 축제가 없습니다.</p>
      ) : (
        <div className="flex flex-col">
          {items.map((item) => (
            <FestivalCard key={item.id} festival={toFestivalResponse(item)} />
          ))}
        </div>
      )}
    </div>
  );
}
