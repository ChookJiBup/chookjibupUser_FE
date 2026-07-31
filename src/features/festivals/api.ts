import { userApiClient } from "@/lib/api/userApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type { UserFestivalDetailResponse, UserFestivalPageResponse } from "./types";

export async function getFestivals(page = 0, size = 20): Promise<UserFestivalPageResponse> {
  const { data } = await userApiClient.get<ApiResponse<UserFestivalPageResponse>>("/festivals", {
    params: { page, size },
  });
  return data.data;
}

export async function getFestivalDetail(festivalId: number): Promise<UserFestivalDetailResponse> {
  const { data } = await userApiClient.get<ApiResponse<UserFestivalDetailResponse>>(
    `/festivals/${festivalId}`,
  );
  return data.data;
}
