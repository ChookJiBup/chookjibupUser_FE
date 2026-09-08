"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getApiErrorMessage, isAuthExpiredError } from "@/lib/api/httpError";
import { useUserAuthHasHydrated, useUserAuthStore } from "@/store/userAuthStore";
import { StarRating } from "@/components/ui/StarRating";
import { getFestivalDetail } from "@/features/festivals/api";
import { StatusBadge, formatDateRange } from "@/features/festivals/FestivalCard";
import { createReview, getReviews } from "./api";

/**
 * REVIEW01. QR코드를 찍고 들어오는 전용 리뷰 작성 화면이다 — 축제 상세 페이지의
 * "리뷰" 탭과는 별개의 페이지다. 비로그인 상태면 로그인 화면으로 리다이렉트한다
 * (Figma 메모: "리뷰 등록 → QR 코드로 넘어옴, 비로그인 상태라면 로그인 화면 리다이렉트").
 */
export function ReviewWritePanel({ festivalId }: { festivalId: string }) {
  const router = useRouter();
  const hasHydrated = useUserAuthHasHydrated();
  const session = useUserAuthStore((state) => state.session);
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");

  useEffect(() => {
    // [제약] 로그인 후 이 페이지로 자동으로 돌아오는 기능은 아직 없다 — 카카오
    // OAuth 왕복 과정에 리다이렉트 대상을 넘기는 구조가 필요한데, 지금은 로그인
    // 성공 시 무조건 홈으로 이동하게 되어있다(kakao/callback/page.tsx). 로그인 후
    // 사용자가 QR을 다시 스캔하거나 직접 돌아와야 한다.
    if (hasHydrated && !session) {
      router.replace("/login");
    }
  }, [hasHydrated, session, router]);

  const festivalQuery = useQuery({
    queryKey: ["festival", festivalId],
    queryFn: () => getFestivalDetail(festivalId),
  });

  const reviewsQuery = useQuery({
    queryKey: ["festival-reviews", festivalId],
    queryFn: () => getReviews(festivalId),
  });

  const createMutation = useMutation({
    mutationFn: () => createReview(festivalId, { rating, content: content.trim() }),
    onSuccess: () => {
      setRating(0);
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["festival-reviews", festivalId] });
    },
  });

  if (!hasHydrated || !session) {
    // 리다이렉트되는 동안 잠깐 보이는 화면.
    return <p className="body-regular text-zinc-500">로그인 화면으로 이동합니다...</p>;
  }

  const festival = festivalQuery.data;

  return (
    <div className="flex flex-col gap-6 pb-8">
      {festival ? (
        <div className="flex flex-col gap-1 border-b border-zinc-100 pb-4">
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

      <form
        className="flex flex-col gap-4"
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

      <ReviewListSection festivalId={festivalId} reviewsQuery={reviewsQuery} />
    </div>
  );
}

function ReviewListSection({
  reviewsQuery,
}: {
  festivalId: string;
  reviewsQuery: ReturnType<typeof useQuery<Awaited<ReturnType<typeof getReviews>>>>;
}) {
  const data = reviewsQuery.data;
  const average =
    data && data.items.length > 0
      ? data.items.reduce((sum, review) => sum + review.rating, 0) / data.items.length
      : 0;

  return (
    <div className="flex flex-col gap-3">
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
          <li key={review.reviewId} className="flex flex-col gap-1 py-4">
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
    </div>
  );
}
