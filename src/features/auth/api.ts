import { userApiClient } from "@/lib/api/userApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type { KakaoLoginRequest, UserLoginResponse } from "./types";

export async function kakaoLogin(request: KakaoLoginRequest): Promise<UserLoginResponse> {
  const { data } = await userApiClient.post<ApiResponse<UserLoginResponse>>(
    "/auth/kakao/login",
    request,
  );
  return data.data;
}
