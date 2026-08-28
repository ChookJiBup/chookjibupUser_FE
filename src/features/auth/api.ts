import { userApiClient } from "@/lib/api/userApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type {
  EmailLoginRequest,
  EmailSignupRequest,
  EmailVerificationConfirmRequest,
  EmailVerificationRequest,
  KakaoLoginRequest,
  UserLoginResponse,
} from "./types";

export async function kakaoLogin(request: KakaoLoginRequest): Promise<UserLoginResponse> {
  const { data } = await userApiClient.post<ApiResponse<UserLoginResponse>>(
    "/auth/kakao/login",
    request,
  );
  return data.data;
}

export async function requestEmailVerification(request: EmailVerificationRequest): Promise<void> {
  await userApiClient.post("/auth/email/verification-code", request);
}

export async function confirmEmailVerification(
  request: EmailVerificationConfirmRequest,
): Promise<void> {
  await userApiClient.post("/auth/email/verification-code/confirm", request);
}

export async function emailSignup(request: EmailSignupRequest): Promise<UserLoginResponse> {
  const { data } = await userApiClient.post<ApiResponse<UserLoginResponse>>(
    "/auth/email/signup",
    request,
  );
  return data.data;
}

export async function emailLogin(request: EmailLoginRequest): Promise<UserLoginResponse> {
  const { data } = await userApiClient.post<ApiResponse<UserLoginResponse>>(
    "/auth/email/login",
    request,
  );
  return data.data;
}
