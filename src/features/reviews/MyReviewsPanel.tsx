"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  CheckCircledIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  Pencil2Icon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { parseServerDateTime } from "@/lib/serverTime";
import { StarRating } from "@/components/ui/StarRating";
import { useSuccessToast } from "@/components/ui/SuccessToast";
import { SubpageHeader } from "@/components/layout/SubpageHeader";
import { FestivalThumbnail, StatusBadge, formatDateRange } from "@/features/festivals/FestivalCard";
import { deleteReview, getMyReviews, updateReview } from "./api";
import type { MyReviewResponse } from "./types";
import { FestivalStatusFilterBar } from "@/features/festivals/FestivalStatusFilterBar";
import type { FestivalProgressStatus } from "@/features/festivals/types";

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

/**
 * 마이페이지 "내가 쓴 리뷰" 화면. WishlistPanel(WISH01)과 헤더/로딩/에러/빈 상태 패턴을
 * 그대로 맞췄다. 각 항목에 수정(연필)/삭제(휴지통) 버튼이 있고, 수정은 같은 자리에서
 * 인라인 폼으로 바뀌는 방식이다(별도 페이지로 이동하지 않는다).
 *
 * 한 번에 하나의 항목만 수정 모드로 들어갈 수 있다 — editingReviewId로 관리한다.
 */
export function MyReviewsPanel() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast, showToast } = useSuccessToast();
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [sort, setSort] = useState<SortOption>("LATEST");
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteReview, setPendingDeleteReview] = useState<MyReviewResponse | null>(null);

  const query = useQuery({
    queryKey: ["my-reviews"],
    queryFn: () => getMyReviews(0, 100),
  });

  const deleteMutation = useMutation({
    mutationFn: (review: MyReviewResponse) => deleteReview(review.reviewId),
    onSuccess: (_data, review) => {
      setDeleteDialogOpen(false);
      setPendingDeleteReview(null);
      showToast("리뷰가 삭제됐어요.");
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["festival-reviews", review.festivalId] });
      queryClient.invalidateQueries({ queryKey: ["festival", review.festivalId] });
      queryClient.invalidateQueries({ queryKey: ["festivals"] });
      queryClient.invalidateQueries({ queryKey: ["festivals-map"] });
    },
  });

  const allItems = query.data?.items ?? [];

  const items = useMemo(() => {
    const source = query.data?.items ?? [];
    const filtered =
      filter === "ALL" ? source : source.filter((item) => item.festivalProgressStatus === filter);
    const sorted = [...filtered];
    if (sort === "NAME") {
      sorted.sort((a, b) => a.festivalName.localeCompare(b.festivalName, "ko"));
    }
    // "등록순"은 백엔드가 이미 최신 작성순으로 내려주므로 별도 정렬이 필요 없다.
    return sorted;
  }, [query.data, filter, sort]);

  return (
    <div className="-mx-5 -my-4 flex flex-col pb-24">
      <SubpageHeader
        title="내가 쓴 리뷰"
        leading={
          <button type="button" onClick={() => router.back()} aria-label="뒤로가기">
            <ChevronLeftIcon className="size-5 text-zinc-950" />
          </button>
        }
      />

      <FestivalStatusFilterBar
        value={filter}
        onChange={(value) => setFilter(value as FilterTab)}
        className="sticky top-[var(--app-header-height)] z-10"
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

      <div className="p-5">
        {query.isLoading ? <p className="body-regular text-zinc-500">불러오는 중...</p> : null}
        {query.fetchStatus === "paused" ? (
          <p className="body-small text-error">네트워크 연결을 확인해 주세요.</p>
        ) : null}
        {query.isError ? (
          <p className="body-small text-error">{getApiErrorMessage(query.error)}</p>
        ) : null}

        {query.data && allItems.length === 0 ? (
          <p className="body-regular text-zinc-500">작성한 리뷰가 없습니다.</p>
        ) : null}
        {query.data && allItems.length > 0 && items.length === 0 ? (
          <p className="body-regular text-zinc-500">해당하는 리뷰가 없습니다.</p>
        ) : null}

        <div className="flex flex-col">
          {items.map((review) => (
            <MyReviewListItem
              key={review.reviewId}
              review={review}
              isEditing={editingReviewId === review.reviewId}
              onStartEdit={() => setEditingReviewId(review.reviewId)}
              onCancelEdit={() => setEditingReviewId(null)}
              onSaved={() => {
                setEditingReviewId(null);
                showToast("리뷰가 수정됐어요.");
              }}
              onDelete={() => {
                setPendingDeleteReview(review);
                setDeleteDialogOpen(true);
              }}
            />
          ))}
        </div>
      </div>

      {deleteDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-5">
          <button
            type="button"
            aria-label="삭제 확인 닫기"
            className="absolute inset-0"
            onClick={() => {
              setDeleteDialogOpen(false);
              setPendingDeleteReview(null);
            }}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="review-delete-title"
            aria-describedby="review-delete-description"
            className="relative z-10 w-full max-w-[320px] rounded-2xl bg-white p-5 text-center shadow-xl"
          >
            <h2 id="review-delete-title" className="body-large-bold text-zinc-950">
              리뷰를 삭제할까요?
            </h2>
            <p id="review-delete-description" className="body-small mt-2 text-zinc-500">
              삭제한 리뷰는 복구할 수 없습니다.
            </p>
            {deleteMutation.isError ? (
              <p className="body-caption mt-2 text-error">
                {getApiErrorMessage(deleteMutation.error, "삭제하지 못했습니다.")}
              </p>
            ) : null}
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setPendingDeleteReview(null);
                }}
                disabled={deleteMutation.isPending}
                className="body-regular-bold h-11 flex-1 rounded-lg border border-zinc-300 text-zinc-700 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!pendingDeleteReview) return;
                  deleteMutation.mutate(pendingDeleteReview);
                }}
                disabled={deleteMutation.isPending || !pendingDeleteReview}
                className="body-regular-bold h-11 flex-1 rounded-lg bg-error text-white disabled:opacity-50"
              >
                {deleteMutation.isPending ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast}
    </div>
  );
}

function MyReviewListItem({
  review,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSaved,
  onDelete,
}: {
  review: MyReviewResponse;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaved: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-zinc-200 py-4">
      <Link href={`/festivals/${review.festivalId}`} className="flex items-start gap-3">
        <FestivalThumbnail imageUrl={review.festivalImageUrl} festivalId={review.festivalId} />
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-start gap-2">
            <p className="body-regular-bold min-w-0 flex-1 text-zinc-950">{review.festivalName}</p>
            <StatusBadge status={review.festivalProgressStatus} />
          </div>
          <p className="body-caption text-zinc-400">
            {formatDateRange(review.festivalStartDate, review.festivalEndDate)}
          </p>
        </div>
      </Link>

      {isEditing ? (
        <ReviewEditForm review={review} onCancel={onCancelEdit} onSaved={onSaved} />
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <StarRating value={review.rating} size={14} />
            {review.onsite ? (
              <span title="축제 현장에서 작성된 리뷰예요" className="inline-flex">
                <CheckCircledIcon className="size-3.5 text-secondary-600" />
              </span>
            ) : null}
            <time className="body-caption ml-auto text-zinc-400" dateTime={review.createdAt}>
              {(
                parseServerDateTime(review.createdAt) ?? new Date(review.createdAt)
              ).toLocaleDateString("ko-KR")}
            </time>
          </div>
          <p className="body-small text-zinc-700">{review.content}</p>

          <div className="flex items-center justify-end gap-4 pt-1">
            <button
              type="button"
              onClick={onStartEdit}
              className="inline-flex items-center gap-1 text-zinc-500"
            >
              <Pencil2Icon className="size-3.5" aria-hidden />
              <span className="body-caption">수정</span>
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1 text-error"
            >
              <TrashIcon className="size-3.5" aria-hidden />
              <span className="body-caption">삭제</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** 리뷰 인라인 수정 폼. ReviewWritePanel의 작성 폼과 같은 입력 요소(StarRating/textarea)를 쓴다. */
function ReviewEditForm({
  review,
  onCancel,
  onSaved,
}: {
  review: MyReviewResponse;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(review.rating);
  const [content, setContent] = useState(review.content);

  const updateMutation = useMutation({
    mutationFn: () => updateReview(review.reviewId, { rating, content: content.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["festival-reviews", review.festivalId] });
      onSaved();
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <StarRating value={rating} onChange={setRating} size={20} />
      <textarea
        value={content}
        maxLength={500}
        onChange={(event) => setContent(event.target.value)}
        rows={3}
        className="body-small resize-none rounded-lg border border-zinc-300 p-2 outline-none focus:border-point-600"
      />
      {updateMutation.isError ? (
        <p className="body-caption text-error">
          {getApiErrorMessage(updateMutation.error, "수정하지 못했습니다.")}
        </p>
      ) : null}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={updateMutation.isPending}
          className="body-small-bold text-zinc-500"
        >
          취소
        </button>
        <button
          type="button"
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending || rating === 0 || content.trim().length === 0}
          className="body-small-bold text-point-500 disabled:text-zinc-300"
        >
          {updateMutation.isPending ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
