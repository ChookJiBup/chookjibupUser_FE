"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  Cross1Icon,
  DotsVerticalIcon,
} from "@radix-ui/react-icons";
import { EditIcon } from "@/components/icons/EditIcon";
import { SubpageHeader } from "@/components/layout/SubpageHeader";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { FestivalImage } from "@/features/festivals/FestivalImage";
import { FestivalStatusFilterBar } from "@/features/festivals/FestivalStatusFilterBar";
import type { FestivalProgressStatus } from "@/features/festivals/types";
import { deleteWishlists, getMyWishlist } from "./api";
import type { MyWishlistFestivalResponse } from "./types";

type FilterTab = "ALL" | FestivalProgressStatus;

const FILTER_LABEL: Record<FilterTab, string> = {
  ALL: "전체",
  ONGOING: "진행중",
  UPCOMING: "진행예정",
  COMPLETED: "진행완료",
};

const FILTERS: FilterTab[] = ["ALL", "ONGOING", "UPCOMING", "COMPLETED"];

type SortOption = "LATEST" | "NAME";

const SORT_LABEL: Record<SortOption, string> = {
  LATEST: "등록순",
  NAME: "이름순",
};

const STATUS_TEXT_CLASS: Record<FestivalProgressStatus, string> = {
  ONGOING: "text-point-600",
  UPCOMING: "text-secondary-600",
  COMPLETED: "text-zinc-500",
};

function WishlistFestivalCard({
  item,
  editing,
  menuOpen,
  onToggleMenu,
  onDelete,
}: {
  item: MyWishlistFestivalResponse;
  editing: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onDelete: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function closeMenu(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) onToggleMenu();
    }

    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, [menuOpen, onToggleMenu]);

  return (
    <div className="relative min-w-0 flex-1 border-b border-zinc-200 py-5">
      <Link href={`/festivals/${item.id}`} className="block min-w-0">
        <div className="flex min-w-0 items-center gap-1 pr-6">
          {item.progressStatus ? (
            <span className={`body-small-bold shrink-0 ${STATUS_TEXT_CLASS[item.progressStatus]}`}>
              {FILTER_LABEL[item.progressStatus]}
            </span>
          ) : null}
          <p className="body-small-bold min-w-0 flex-1 truncate text-zinc-950">{item.name}</p>
        </div>
        <p className="body-caption mt-2 truncate text-zinc-600">
          {item.address ?? item.eventPlace ?? ""}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((index) => (
            <FestivalImage
              key={index}
              imageUrl={item.imageUrl}
              className="aspect-[112.67/74.7] min-w-0 rounded-lg"
            />
          ))}
        </div>
      </Link>
      {!editing ? (
        <div ref={menuRef}>
          <button
            type="button"
            aria-label={`${item.name} 메뉴`}
            aria-expanded={menuOpen}
            onClick={onToggleMenu}
            className="absolute right-0 top-5 inline-flex size-5 items-center justify-center text-zinc-950"
          >
            <DotsVerticalIcon aria-hidden className="size-4" />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-12 z-20 w-[108px] max-w-[calc(100vw-40px)] rounded-xl border border-zinc-100 bg-white p-1.5 shadow-lg">
              <button
                type="button"
                onClick={onDelete}
                className="body-small w-full whitespace-nowrap rounded-lg px-2 py-1.5 text-center text-zinc-800 hover:bg-zinc-50"
              >
                삭제하기
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [sort, setSort] = useState<SortOption>("LATEST");
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["my-wishlist"],
    queryFn: () => getMyWishlist(0, 100),
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => deleteWishlists(ids),
    onSuccess: () => {
      setSelectedIds(new Set());
      setEditMode(false);
      setDeleteDialogOpen(false);
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
    setDeleteDialogOpen(true);
  }

  const allVisibleSelected = items.length > 0 && items.every((item) => selectedIds.has(item.id));

  return (
    <div className="-mx-5 -my-4 flex flex-col pb-24">
      <SubpageHeader
        title="내가 저장한 축제"
        leading={
          editMode ? (
            <button type="button" onClick={toggleEditMode} aria-label="편집 취소">
              <Cross1Icon className="size-5 text-zinc-950" />
            </button>
          ) : (
            <button type="button" onClick={() => router.back()} aria-label="뒤로가기">
              <ChevronLeftIcon className="size-5 text-zinc-950" />
            </button>
          )
        }
        trailing={
          editMode ? (
            <button
              type="button"
              onClick={handleDeleteClick}
              disabled={selectedIds.size === 0 || deleteMutation.isPending}
              className="body-small-bold text-error disabled:text-zinc-300"
            >
              삭제
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleEditMode}
              aria-label="저장한 축제 편집"
              className="inline-flex size-6 items-center justify-center text-zinc-950"
            >
              <EditIcon className="size-4" />
            </button>
          )
        }
      />

      {deleteMutation.isError ? (
        <p className="body-caption py-2 text-error">
          {getApiErrorMessage(deleteMutation.error, "삭제하지 못했습니다.")}
        </p>
      ) : null}

      {!editMode ? (
        <FestivalStatusFilterBar
          value={filter}
          onChange={(value) => setFilter(value as FilterTab)}
          className={"sticky top-[var(--app-header-height)] z-10"}
          leading={
            <label className="relative flex items-center body-small text-zinc-700">
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortOption)}
                aria-label="정렬 기준"
                className="appearance-none bg-transparent pr-5 outline-none"
              >
                {(Object.keys(SORT_LABEL) as SortOption[]).map((value) => (
                  <option key={value} value={value}>
                    {SORT_LABEL[value]}
                  </option>
                ))}
              </select>
              <ChevronDownIcon
                aria-hidden
                className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2"
              />
            </label>
          }
          options={FILTERS.map((value) => ({ value, label: FILTER_LABEL[value] }))}
        />
      ) : null}

      {editMode ? (
        <button
          type="button"
          onClick={toggleSelectAll}
          className="body-regular flex h-14 items-center gap-2 border-b border-zinc-100 px-5 text-left text-zinc-950"
        >
          <span
            className={`inline-flex size-4 items-center justify-center rounded border ${
              allVisibleSelected
                ? "border-point-600 bg-point-600 text-white"
                : "border-zinc-300 text-transparent"
            }`}
          >
            <CheckIcon className="size-3" />
          </span>
          전체 선택
        </button>
      ) : null}

      {query.isLoading ? <p className="body-regular text-zinc-500">불러오는 중...</p> : null}
      {query.fetchStatus === "paused" ? (
        <p className="body-small text-error">네트워크 연결을 확인해 주세요.</p>
      ) : null}
      {query.isError ? (
        <p className="body-small text-error">{getApiErrorMessage(query.error)}</p>
      ) : null}

      {query.data && allItems.length === 0 ? (
        <p className="body-regular text-zinc-500">찜한 축제가 없습니다.</p>
      ) : null}
      {query.data && allItems.length > 0 && items.length === 0 ? (
        <p className="body-regular text-zinc-500 p-5">해당하는 축제가 없습니다.</p>
      ) : null}

      <div className="flex flex-col px-5">
        {items.map((item) =>
          editMode ? (
            <label key={item.id} className="flex items-start gap-2 border-b border-zinc-100">
              <input
                type="checkbox"
                checked={selectedIds.has(item.id)}
                onChange={() => toggleSelect(item.id)}
                className="peer sr-only"
              />
              <span className="mt-5 inline-flex size-4 shrink-0 items-center justify-center rounded border border-zinc-300 text-transparent peer-checked:border-point-600 peer-checked:bg-point-600 peer-checked:text-white">
                <CheckIcon className="size-3" />
              </span>
              <div className="pointer-events-none flex-1">
                <WishlistFestivalCard
                  item={item}
                  editing
                  menuOpen={false}
                  onToggleMenu={() => undefined}
                  onDelete={() => undefined}
                />
              </div>
            </label>
          ) : (
            <WishlistFestivalCard
              key={item.id}
              item={item}
              editing={false}
              menuOpen={openMenuId === item.id}
              onToggleMenu={() =>
                setOpenMenuId((current) => (current === item.id ? null : item.id))
              }
              onDelete={() => {
                setOpenMenuId(null);
                setSelectedIds(new Set([item.id]));
                setDeleteDialogOpen(true);
              }}
            />
          ),
        )}
      </div>

      {deleteDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-5">
          <button
            type="button"
            aria-label="삭제 확인 닫기"
            className="absolute inset-0"
            onClick={() => setDeleteDialogOpen(false)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="wishlist-delete-title"
            aria-describedby="wishlist-delete-description"
            className="relative z-10 w-full max-w-[320px] rounded-2xl bg-white p-5 text-center shadow-xl"
          >
            <h2 id="wishlist-delete-title" className="body-large-bold text-zinc-950">
              저장한 축제를 삭제할까요?
            </h2>
            <p id="wishlist-delete-description" className="body-small mt-2 text-zinc-500">
              선택한 축제 {selectedIds.size}개가 저장 목록에서 삭제됩니다.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleteMutation.isPending}
                className="body-regular-bold h-11 flex-1 rounded-lg border border-zinc-300 text-zinc-700 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(Array.from(selectedIds))}
                disabled={deleteMutation.isPending}
                className="body-regular-bold h-11 flex-1 rounded-lg bg-error text-white disabled:opacity-50"
              >
                {deleteMutation.isPending ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
