"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getApiErrorMessage, isAuthExpiredError } from "@/lib/api/httpError";
import { useUserAuthStore } from "@/store/userAuthStore";
import { createReview, getReviews } from "./api";

export function ReviewsPanel({ festivalId }: { festivalId: string }) {
  const queryClient = useQueryClient();
  const session = useUserAuthStore((state) => state.session);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const reviewsQuery = useQuery({
    queryKey: ["festival-reviews", festivalId],
    queryFn: () => getReviews(festivalId),
  });
  const createMutation = useMutation({
    mutationFn: () => createReview(festivalId, { rating, content: content.trim() }),
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["festival-reviews", festivalId] });
    },
  });

  return (
    <section className="flex flex-col gap-3">
      <h2 className="body-regular-bold text-zinc-950">방문객 리뷰</h2>
      {session ? (
        <form
          className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (content.trim()) createMutation.mutate();
          }}
        >
          <label className="body-small text-zinc-700">
            별점
            <select
              value={rating}
              onChange={(event) => setRating(Number(event.target.value))}
              className="ml-2 rounded-md border border-zinc-300 px-2 py-1"
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value}점
                </option>
              ))}
            </select>
          </label>
          <textarea
            value={content}
            maxLength={500}
            required
            onChange={(event) => setContent(event.target.value)}
            placeholder="축제에 대한 한줄평을 남겨주세요."
            className="body-small min-h-20 resize-none rounded-lg border border-zinc-300 p-3"
          />
          <button
            type="submit"
            disabled={createMutation.isPending || !content.trim()}
            className="body-small-bold self-end rounded-lg bg-primary px-4 py-2 text-white disabled:opacity-50"
          >
            리뷰 등록
          </button>
          {createMutation.isError ? (
            <p className="body-caption text-error">
              {isAuthExpiredError(createMutation.error)
                ? "로그인이 만료됐어요. 다시 로그인해 주세요."
                : getApiErrorMessage(createMutation.error, "리뷰를 등록하지 못했습니다.")}
            </p>
          ) : null}
        </form>
      ) : (
        <p className="body-small rounded-lg bg-zinc-50 p-3 text-zinc-500">
          로그인하면 리뷰를 작성할 수 있어요.
        </p>
      )}

      {reviewsQuery.isLoading ? (
        <p className="body-small text-zinc-500">리뷰를 불러오는 중...</p>
      ) : null}
      {reviewsQuery.isError ? (
        <p className="body-small text-error">
          {getApiErrorMessage(reviewsQuery.error, "리뷰를 불러오지 못했습니다.")}
        </p>
      ) : null}
      {reviewsQuery.data?.items.length === 0 ? (
        <p className="body-small text-zinc-500">아직 등록된 리뷰가 없어요.</p>
      ) : null}
      <ul className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200">
        {reviewsQuery.data?.items.map((review) => (
          <li key={review.reviewId} className="p-3">
            <div className="flex justify-between body-caption text-zinc-500">
              <span>
                {"★".repeat(review.rating)}
                {"☆".repeat(5 - review.rating)}
              </span>
              <time dateTime={review.createdAt}>
                {new Date(review.createdAt).toLocaleDateString("ko-KR")}
              </time>
            </div>
            <p className="body-small mt-2 text-zinc-700">{review.content}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
