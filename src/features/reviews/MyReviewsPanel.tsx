"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircledIcon, ChevronLeftIcon, Pencil2Icon, TrashIcon } from "@radix-ui/react-icons";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { parseServerDateTime } from "@/lib/serverTime";
import { StarRating } from "@/components/ui/StarRating";
import { FestivalThumbnail, StatusBadge, formatDateRange } from "@/features/festivals/FestivalCard";
import { deleteReview, getMyReviews, updateReview } from "./api";
import type { MyReviewResponse } from "./types";

/**
 * 마이페이지 "내가 쓴 리뷰" 화면. WishlistPanel(WISH01)과 헤더/로딩/에러/빈 상태 패턴을
 * 그대로 맞췄다. 각 항목에 수정(연필)/삭제(휴지통) 버튼이 있고, 수정은 같은 자리에서
 * 인라인 폼으로 바뀌는 방식이다(별도 페이지로 이동하지 않는다).
 *
 * 한 번에 하나의 항목만 수정 모드로 들어갈 수 있다 — editingReviewId로 관리한다.
 */
export function MyReviewsPanel() {
  const query = useQuery({
    queryKey: ["my-reviews"],
    queryFn: () => getMyReviews(0, 100),
  });
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);

  const items = query.data?.items ?? [];

  return (
    <div className="flex flex-col pb-24">
      <div className="flex items-center gap-2 border-b border-zinc-100 py-3">
        <Link href="/mypage" aria-label="뒤로가기">
          <ChevronLeftIcon className="size-5 text-zinc-700" />
        </Link>
        <h1 className="body-large-bold text-zinc-950">내가 쓴 리뷰</h1>
      </div>

      {query.isLoading ? <p className="body-regular text-zinc-500">불러오는 중...</p> : null}
      {query.fetchStatus === "paused" ? (
        <p className="body-small text-error">네트워크 연결을 확인해 주세요.</p>
      ) : null}
      {query.isError ? (
        <p className="body-small text-error">{getApiErrorMessage(query.error)}</p>
      ) : null}

      {query.data && items.length === 0 ? (
        <p className="body-regular text-zinc-500">작성한 리뷰가 없습니다.</p>
      ) : null}

      <div className="flex flex-col">
        {items.map((review) => (
          <MyReviewListItem
            key={review.reviewId}
            review={review}
            isEditing={editingReviewId === review.reviewId}
            onStartEdit={() => setEditingReviewId(review.reviewId)}
            onCancelEdit={() => setEditingReviewId(null)}
            onSaved={() => setEditingReviewId(null)}
          />
        ))}
      </div>
    </div>
  );
}

function MyReviewListItem({
  review,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSaved,
}: {
  review: MyReviewResponse;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteReview(review.reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["festival-reviews", review.festivalId] });
      queryClient.invalidateQueries({ queryKey: ["festival", review.festivalId] });
      queryClient.invalidateQueries({ queryKey: ["festivals"] });
      queryClient.invalidateQueries({ queryKey: ["festivals-map"] });
    },
  });

  function handleDeleteClick() {
    if (deleteMutation.isPending) return;
    if (!window.confirm("이 리뷰를 삭제하시겠습니까?")) return;
    deleteMutation.mutate();
  }

  return (
    <div className="flex flex-col gap-2 border-b border-zinc-200 py-4">
      <Link href={`/festivals/${review.festivalId}`} className="flex items-start gap-3">
        <FestivalThumbnail imageUrl={review.festivalImageUrl} />
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

          {deleteMutation.isError ? (
            <p className="body-caption text-error">
              {getApiErrorMessage(deleteMutation.error, "삭제하지 못했습니다.")}
            </p>
          ) : null}

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
              onClick={handleDeleteClick}
              disabled={deleteMutation.isPending}
              className="inline-flex items-center gap-1 text-error disabled:text-zinc-300"
            >
              <TrashIcon className="size-3.5" aria-hidden />
              <span className="body-caption">
                {deleteMutation.isPending ? "삭제 중..." : "삭제"}
              </span>
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
          className="body-small-bold text-primary disabled:text-zinc-300"
        >
          {updateMutation.isPending ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
