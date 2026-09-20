"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { useUserAuthHasHydrated, useUserAuthStore } from "@/store/userAuthStore";
import { getReviews } from "./api";
import { ReviewAverage, ReviewCountLabel, ReviewListItem, averageRating } from "./ReviewWritePanel";

/**
 * 축제 상세 페이지의 "리뷰" 탭 내용. 리뷰 작성은 여기서 하지 않는다 —
 * 작성은 전용 페이지(/festivals/[id]/review, REVIEW01)에서 한다.
 * 여기는 목록만 보여주고, 작성 화면으로 가는 길만 안내한다.
 */
export function ReviewsPanel({ festivalId }: { festivalId: string }) {
  const hasHydrated = useUserAuthHasHydrated();
  const session = useUserAuthStore((state) => state.session);
  const isLoggedIn = hasHydrated && session !== null;

  const reviewsQuery = useQuery({
    queryKey: ["festival-reviews", festivalId],
    queryFn: () => getReviews(festivalId),
  });

  const data = reviewsQuery.data;
  const items = data?.items ?? [];

  return (
    <section className="flex flex-col gap-3 px-5 py-4">
      <div className="flex items-center justify-between">
        <ReviewCountLabel count={data?.totalElements ?? 0} className="body-regular-bold" />
        {/*
          비로그인은 백엔드가 현장(onsite) 리뷰만 받아 주므로 작성 링크를 걸어 봐야
          로그인 화면으로 튕긴다. 그래서 로그인했을 때만 바로가기를 보여 준다.
        */}
        {isLoggedIn ? (
          <Link href={`/festivals/${festivalId}/review`} className="body-small-bold text-point-600">
            리뷰 남기기
          </Link>
        ) : null}
      </div>

      {!isLoggedIn ? (
        <div className="flex flex-col gap-1 rounded-lg border border-zinc-100 p-3 text-zinc-950">
          <p className="body-small-bold">리뷰는 현장 QR코드를 통해 작성할 수 있어요.</p>
          <p className="body-caption">축제 현장에서 QR코드를 스캔해 주세요!</p>
        </div>
      ) : null}

      <ReviewAverage average={averageRating(items)} />

      {reviewsQuery.isLoading ? (
        <p className="body-small text-zinc-500">리뷰를 불러오는 중...</p>
      ) : null}
      {reviewsQuery.isError ? (
        <p className="body-small text-error">
          {getApiErrorMessage(reviewsQuery.error, "리뷰를 불러오지 못했습니다.")}
        </p>
      ) : null}
      {data && items.length === 0 ? (
        <p className="body-small text-zinc-400">아직 등록된 리뷰가 없어요.</p>
      ) : null}

      <ul className="flex flex-col divide-y divide-zinc-200">
        {items.map((review) => (
          <ReviewListItem key={review.reviewId} review={review} />
        ))}
      </ul>
    </section>
  );
}
