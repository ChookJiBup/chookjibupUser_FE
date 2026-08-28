import { userApiClient } from "@/lib/api/userApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type { ReviewCreateRequest, ReviewPageResponse, ReviewResponse } from "./types";

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
