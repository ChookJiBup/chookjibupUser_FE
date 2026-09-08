"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { StarRating } from "@/components/ui/StarRating";
import { getReviews } from "./api";

/**
 * 축제 상세 페이지의 "리뷰" 탭 내용. 리뷰 작성은 여기서 하지 않는다 —
 * 작성은 QR로 들어오는 전용 페이지(/festivals/[id]/review, REVIEW01)에서만 한다.
 * 여기는 순수하게 목록만 보여주고, 작성 화면으로 가는 링크만 제공한다.
 */
export function ReviewsPanel({ festivalId }: { festivalId: string }) {
  const reviewsQuery = useQuery({
    queryKey: ["festival-reviews", festivalId],
    queryFn: () => getReviews(festivalId),
  });

  const data = reviewsQuery.data;
  const average =
    data && data.items.length > 0
      ? data.items.reduce((sum, review) => sum + review.rating, 0) / data.items.length
      : 0;

  return (
    <section className="flex flex-col gap-3 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="body-regular-bold text-zinc-950">{average.toFixed(1)}</p>
          <StarRating value={Math.round(average)} size={16} />
          <p className="body-small text-zinc-500">리뷰 {data?.totalElements ?? 0}</p>
        </div>
        <Link href={`/festivals/${festivalId}/review`} className="body-small-bold text-primary">
          리뷰 남기기
        </Link>
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
        <p className="body-small text-zinc-400">아직 등록된 리뷰가 없어요.</p>
      ) : null}

      <ul className="flex flex-col divide-y divide-zinc-100">
        {data?.items.map((review) => (
          <li key={review.reviewId} className="flex flex-col gap-1 py-3">
            <div className="flex items-center justify-between">
              <StarRating value={review.rating} size={12} />
              <time className="body-caption text-zinc-400" dateTime={review.createdAt}>
                {new Date(review.createdAt).toLocaleDateString("ko-KR")}
              </time>
            </div>
            <p className="body-small text-zinc-700">{review.content}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
