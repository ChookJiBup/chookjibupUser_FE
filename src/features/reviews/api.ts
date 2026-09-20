import { userApiClient } from "@/lib/api/userApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type {
  MyReviewPageResponse,
  MyReviewResponse,
  ReviewCreateRequest,
  ReviewPageResponse,
  ReviewResponse,
  ReviewUpdateRequest,
} from "./types";

export async function getReviews(
  festivalId: string,
  page = 0,
  size = 20,
): Promise<ReviewPageResponse> {
  const { data } = await userApiClient.get<ApiResponse<ReviewPageResponse>>(
    `/festivals/${festivalId}/reviews`,
    { params: { page, size } },
  );
  return data.data;
}

export async function createReview(
  festivalId: string,
  request: ReviewCreateRequest,
): Promise<ReviewResponse> {
  const { data } = await userApiClient.post<ApiResponse<ReviewResponse>>(
    `/festivals/${festivalId}/reviews`,
    request,
  );
  return data.data;
}

/** 백엔드가 실제로 보내는 JSON 키(festivalPublicId)를 프론트 표준 필드명(festivalId)으로 바꾸기 전 원본 모양. */
type MyReviewWire = Omit<MyReviewResponse, "festivalId"> & { festivalPublicId: string };

function toMyReviewResponse(wire: MyReviewWire): MyReviewResponse {
  const { festivalPublicId, ...rest } = wire;
  return { ...rest, festivalId: festivalPublicId };
}

/** getMyReviews 응답 전체의 wire 모양. 제네릭을 한 줄로 쓰기 위해 따로 뺐다. */
type MyReviewPageWire = Omit<MyReviewPageResponse, "items"> & { items: MyReviewWire[] };

/** 마이페이지 "내가 쓴 리뷰" 목록. 최신순. */
export async function getMyReviews(page = 0, size = 20): Promise<MyReviewPageResponse> {
  const { data } = await userApiClient.get<ApiResponse<MyReviewPageWire>>("/reviews/me", {
    params: { page, size },
  });
  return {
    ...data.data,
    items: data.data.items.map(toMyReviewResponse),
  };
}

/** 본인이 작성한 리뷰의 별점/한줄평을 수정한다. 본인 리뷰가 아니면 403이 온다. */
export async function updateReview(
  reviewId: number,
  request: ReviewUpdateRequest,
): Promise<ReviewResponse> {
  const { data } = await userApiClient.patch<ApiResponse<ReviewResponse>>(
    `/reviews/${reviewId}`,
    request,
  );
  return data.data;
}

/** 본인이 작성한 리뷰를 삭제한다. 본인 리뷰가 아니면 403이 온다. */
export async function deleteReview(reviewId: number): Promise<void> {
  await userApiClient.delete(`/reviews/${reviewId}`);
}
