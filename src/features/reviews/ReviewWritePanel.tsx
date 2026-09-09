"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircledIcon } from "@radix-ui/react-icons";
import { getApiErrorMessage, isAuthExpiredError } from "@/lib/api/httpError";
import { useUserAuthHasHydrated, useUserAuthStore } from "@/store/userAuthStore";
import { StarRating } from "@/components/ui/StarRating";
import { getFestivalDetail } from "@/features/festivals/api";
import { StatusBadge, formatDateRange } from "@/features/festivals/FestivalCard";
import { createReview, getReviews } from "./api";
import type { ReviewResponse } from "./types";

/**
 * REVIEW01. QR코드를 찍고 들어오는 전용 리뷰 작성 화면이다 — 축제 상세 페이지의
 * "리뷰" 탭과는 별개의 페이지다.
 *
 * [현장(QR) 리뷰] URL에 ?source=qr 이 붙어있으면 "축제 현장에서 QR로 들어온 것"으로
 * 보고 로그인 없이도 리뷰를 작성할 수 있게 한다(백엔드도 onsite=true일 때만 익명을
 * 허용한다). 이 쿼리파라미터가 없는 일반 접근(축제 상세 페이지의 "리뷰 남기기" 링크 등)은
 * 예전처럼 로그인이 필요하다.
 *
 * 관리자 백엔드가 축제 등록 시 자동으로 만들어주는 QR코드는 이 형식의 URL을 가리키면 된다:
 *   https://user.chookjibup.store/festivals/{festivalPublicId}/review?source=qr
 */
export function ReviewWritePanel({ festivalId }: { festivalId: string }) {
  return (
    <Suspense fallback={<p className="body-regular p-4 text-zinc-500">불러오는 중...</p>}>
      <ReviewWritePanelInner festivalId={festivalId} />
    </Suspense>
  );
}

function ReviewWritePanelInner({ festivalId }: { festivalId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnsite = searchParams.get("source") === "qr";

  const hasHydrated = useUserAuthHasHydrated();
  const session = useUserAuthStore((state) => state.session);
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");

  useEffect(() => {
    // 현장(QR) 리뷰는 비로그인이어도 계속 작성할 수 있어야 해서 리다이렉트하지 않는다 —
    // 일반 접근일 때만 예전처럼 로그인 화면으로 보낸다.
    if (isOnsite) return;
    if (hasHydrated && !session) {
      router.replace("/login");
    }
  }, [isOnsite, hasHydrated, session, router]);

  const festivalQuery = useQuery({
    queryKey: ["festival", festivalId],
    queryFn: () => getFestivalDetail(festivalId),
  });

  const reviewsQuery = useQuery({
    queryKey: ["festival-reviews", festivalId],
    queryFn: () => getReviews(festivalId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createReview(festivalId, { rating, content: content.trim(), onsite: isOnsite }),
    onSuccess: () => {
      setRating(0);
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["festival-reviews", festivalId] });
    },
  });

  // 일반 접근인데 아직 로그인 여부를 못 정했거나 비로그인이면, 리다이렉트되는 동안
  // 잠깐 이 화면이 보인다. 현장(QR) 리뷰는 이 조건을 아예 안 탄다.
  if (!isOnsite && (!hasHydrated || !session)) {
    return <p className="body-regular p-4 text-zinc-500">로그인 화면으로 이동합니다...</p>;
  }

  const festival = festivalQuery.data;

  return (
    <div className="flex flex-col gap-6 pb-8">
      {festival ? (
        <div className="flex flex-col gap-1 border-b border-zinc-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <p className="body-large-bold text-zinc-950">{festival.name}</p>
            <StatusBadge status={festival.progressStatus} />
          </div>
          <p className="body-small text-zinc-500">
            {festival.address}
            {festival.address && festival.startDate ? " · " : ""}
            {formatDateRange(festival.startDate, festival.endDate)}
          </p>
        </div>
      ) : null}

      {isOnsite ? (
        <div className="mx-5 flex items-center gap-2 rounded-lg bg-secondary-300/30 px-3 py-2">
          <CheckCircledIcon className="size-4 shrink-0 text-secondary-600" />
          <p className="body-caption text-secondary-600">
            축제 현장 QR코드로 접속했어요. 로그인 없이 바로 리뷰를 남길 수 있어요.
          </p>
        </div>
      ) : null}

      <form
        className="flex flex-col gap-4 px-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (rating > 0 && content.trim()) createMutation.mutate();
        }}
      >
        <p className="body-regular-bold text-center text-zinc-950">
          축제는 어떠셨나요? 후기를 남겨주세요!
        </p>
        <div className="flex justify-center">
          <StarRating value={rating} onChange={setRating} size={28} />
        </div>
        <textarea
          value={content}
          maxLength={500}
          onChange={(event) => setContent(event.target.value)}
          placeholder="방문 후기를 작성해주세요"
          className="body-regular min-h-20 resize-none rounded-lg border border-zinc-300 p-3 outline-none focus:border-point-600"
        />
        <button
          type="submit"
          disabled={createMutation.isPending || rating === 0 || !content.trim()}
          className="body-regular-bold rounded-md bg-zinc-950 px-4 py-2.5 text-center text-white disabled:opacity-40"
        >
          리뷰 등록
        </button>
        {createMutation.isSuccess ? (
          <p className="body-caption text-center text-secondary-600">
            리뷰가 등록됐어요. 감사합니다!
          </p>
        ) : null}
        {createMutation.isError ? (
          <p className="body-caption text-center text-error">
            {isAuthExpiredError(createMutation.error)
              ? "로그인이 만료됐어요. 다시 로그인해 주세요."
              : getApiErrorMessage(createMutation.error, "리뷰를 등록하지 못했습니다.")}
          </p>
        ) : null}
      </form>

      <div className="h-2 bg-zinc-100" />

      <ReviewListSection reviewsQuery={reviewsQuery} />
    </div>
  );
}

function ReviewListSection({
  reviewsQuery,
}: {
  reviewsQuery: ReturnType<typeof useQuery<Awaited<ReturnType<typeof getReviews>>>>;
}) {
  const data = reviewsQuery.data;
  const average =
    data && data.items.length > 0
      ? data.items.reduce((sum, review) => sum + review.rating, 0) / data.items.length
      : 0;

  return (
    <div className="flex flex-col gap-3 px-5">
      <div className="flex items-center gap-2">
        <p className="body-regular-bold text-zinc-950">{average.toFixed(1)}</p>
        <StarRating value={Math.round(average)} size={16} />
        <p className="body-small text-zinc-500">리뷰 {data?.totalElements ?? 0}</p>
      </div>

      {reviewsQuery.isLoading ? (
        <p className="body-small text-zinc-500">리뷰를 불러오는 중...</p>
      ) : null}
      {reviewsQuery.isError ? (
        <p className="body-small text-error">
          {getApiErrorMessage(reviewsQuery.error, "리뷰를 불러오지 못했습니다.")}
        </p>
      ) : null}
      {data?.items.length === 0 ? (
        <p className="body-small text-zinc-400">아직 등록된 리뷰가 없어요. 첫 리뷰를 남겨보세요!</p>
      ) : null}

      <ul className="flex flex-col divide-y divide-zinc-100">
        {data?.items.slice(0, 3).map((review) => (
          <ReviewListItem key={review.reviewId} review={review} />
        ))}
      </ul>
    </div>
  );
}

/** 리뷰 하나. ReviewsPanel(상세페이지 탭)과 정확히 같은 표시 규칙(작성자+현장 배지+날짜)을 쓴다. */
export function ReviewListItem({ review }: { review: ReviewResponse }) {
  return (
    <li className="flex flex-col gap-1 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <p className="body-small-bold text-zinc-700">{review.reviewerName}</p>
          {review.onsite ? (
            <span title="축제 현장에서 작성된 리뷰예요" className="inline-flex">
              <CheckCircledIcon className="size-3.5 text-secondary-600" />
            </span>
          ) : null}
        </div>
        <time className="body-caption text-zinc-400" dateTime={review.createdAt}>
          {new Date(review.createdAt).toLocaleDateString("ko-KR")}
        </time>
      </div>
      <StarRating value={review.rating} size={12} />
      <p className="body-small text-zinc-700">{review.content}</p>
    </li>
  );
}
