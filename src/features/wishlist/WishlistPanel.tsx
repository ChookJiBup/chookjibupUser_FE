"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeftIcon, Cross1Icon } from "@radix-ui/react-icons";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { FestivalCard, STATUS_LABEL } from "@/features/festivals/FestivalCard";
import type { FestivalProgressStatus, UserFestivalResponse } from "@/features/festivals/types";
import { deleteWishlists, getMyWishlist } from "./api";
import type { MyWishlistFestivalResponse } from "./types";

type FilterTab = "ALL" | Exclude<FestivalProgressStatus, "COMPLETED">;

const FILTER_LABEL: Record<FilterTab, string> = {
  ALL: "전체",
  ONGOING: "진행중",
  UPCOMING: "진행예정",
};

const FILTERS: FilterTab[] = ["ALL", "ONGOING", "UPCOMING"];

type SortOption = "LATEST" | "NAME";

const SORT_LABEL: Record<SortOption, string> = {
  LATEST: "등록순",
  NAME: "이름순",
};

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
    wishlistCount: item.wishlistCount,
    reviewCount: item.reviewCount,
  };
}

/**
 * WISH01. Figma 설계서 기준으로 정렬(등록순/이름순) + 필터(전체/진행중/진행예정) +
 * 편집 모드(체크박스 다중 선택 → 일괄 삭제)를 갖춘 화면이다.
 *
 * 헤더도 이 컴포넌트가 관리한다 — 편집 모드 여부에 따라 "← 내가 저장한 축제 · 수정하기"
 * 와 "✕ 내가 저장한 축제 · 삭제하기"가 서로 바뀌어야 해서, 정적인 페이지 헤더로는
 * 표현이 안 된다.
 */
export function WishlistPanel() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [sort, setSort] = useState<SortOption>("LATEST");
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const query = useQuery({
    queryKey: ["my-wishlist"],
    queryFn: () => getMyWishlist(0, 100),
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => deleteWishlists(ids),
    onSuccess: () => {
      setSelectedIds(new Set());
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ["my-wishlist"] });
      queryClient.invalidateQueries({ queryKey: ["festivals"] });
      queryClient.invalidateQueries({ queryKey: ["festivals-map"] });
    },
  });

  const allItems = query.data?.items ?? [];

  const items = useMemo(() => {
    const allItems = query.data?.items ?? [];
    const filtered =
      filter === "ALL" ? allItems : allItems.filter((item) => item.progressStatus === filter);
    const sorted = [...filtered];
    if (sort === "NAME") {
      sorted.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    }
    // "등록순"은 백엔드가 이미 최신 찜한 순으로 내려주므로 별도 정렬이 필요 없다.
    return sorted;
  }, [query.data, filter, sort]);

  function toggleEditMode() {
    setEditMode((current) => !current);
    setSelectedIds(new Set());
  }

  function toggleSelect(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((current) =>
      current.size === items.length ? new Set() : new Set(items.map((i) => i.id)),
    );
  }

  function handleDeleteClick() {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`저장한 축제 ${selectedIds.size}개를 삭제하시겠습니까?`)) return;
    deleteMutation.mutate(Array.from(selectedIds));
  }

  return (
    <div className="flex flex-col pb-24">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
        <div className="flex items-center gap-2">
          {editMode ? (
            <button type="button" onClick={toggleEditMode} aria-label="편집 취소">
              <Cross1Icon className="size-5 text-zinc-700" />
            </button>
          ) : (
            <Link href="/" aria-label="뒤로가기">
              <ChevronLeftIcon className="size-5 text-zinc-700" />
            </Link>
          )}
          <h1 className="body-large-bold text-zinc-950">내가 저장한 축제</h1>
        </div>

        {editMode ? (
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={selectedIds.size === 0 || deleteMutation.isPending}
            className="body-small-bold text-error disabled:text-zinc-300"
          >
            삭제하기
          </button>
        ) : (
          <button type="button" onClick={toggleEditMode} className="body-small-bold text-zinc-700">
            수정하기
          </button>
        )}
      </div>

      {deleteMutation.isError ? (
        <p className="body-caption px-4 py-2 text-error">
          {getApiErrorMessage(deleteMutation.error, "삭제하지 못했습니다.")}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as SortOption)}
          className="body-small rounded-full bg-zinc-100 px-3 py-1.5 text-zinc-700"
        >
          {(Object.keys(SORT_LABEL) as SortOption[]).map((value) => (
            <option key={value} value={value}>
              {SORT_LABEL[value]}
            </option>
          ))}
        </select>

        <div className="flex gap-2 overflow-x-auto">
          {FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={
                filter === value
                  ? "body-small-bold shrink-0 rounded-full bg-point-600 px-3 py-1.5 text-white"
                  : "body-small shrink-0 rounded-full bg-zinc-100 px-3 py-1.5 text-zinc-700"
              }
            >
              {value === "ALL" ? FILTER_LABEL[value] : STATUS_LABEL[value]}
            </button>
          ))}
        </div>
      </div>

      {editMode ? (
        <button
          type="button"
          onClick={toggleSelectAll}
          className="body-small border-b border-zinc-100 px-4 py-2 text-left text-zinc-500"
        >
          {selectedIds.size === items.length && items.length > 0 ? "전체 선택 해제" : "전체 선택"}
        </button>
      ) : null}

      {query.isLoading ? <p className="body-regular p-4 text-zinc-500">불러오는 중...</p> : null}
      {query.fetchStatus === "paused" ? (
        <p className="body-small p-4 text-error">네트워크 연결을 확인해 주세요.</p>
      ) : null}
      {query.isError ? (
        <p className="body-small p-4 text-error">{getApiErrorMessage(query.error)}</p>
      ) : null}

      {query.data && allItems.length === 0 ? (
        <p className="body-regular p-4 text-zinc-500">찜한 축제가 없습니다.</p>
      ) : null}
      {query.data && allItems.length > 0 && items.length === 0 ? (
        <p className="body-regular p-4 text-zinc-500">해당하는 축제가 없습니다.</p>
      ) : null}

      <div className="flex flex-col">
        {items.map((item) =>
          editMode ? (
            <label
              key={item.id}
              className="flex items-center gap-3 border-b border-zinc-100 px-4 py-2"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(item.id)}
                onChange={() => toggleSelect(item.id)}
                className="size-5 shrink-0 accent-point-600"
              />
              <div className="pointer-events-none flex-1">
                <FestivalCard festival={toFestivalResponse(item)} />
              </div>
            </label>
          ) : (
            <FestivalCard key={item.id} festival={toFestivalResponse(item)} />
          ),
        )}
      </div>
    </div>
  );
}
