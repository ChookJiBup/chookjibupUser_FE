import { userApiClient } from "@/lib/api/userApiClient";
import type { ApiResponse } from "@/lib/api/types";

/**
 * 비밀번호 재설정 관련 API. 기존 features/auth/api.ts(카카오/이메일 로그인)와
 * 목적이 달라서 별도 파일로 뒀다 — 필요하면 auth/api.ts에 그대로 합쳐도 무방하다.
 */

export async function requestPasswordReset(email: string): Promise<void> {
  await userApiClient.post<ApiResponse<null>>("/auth/email/password-reset/request", { email });
}

export async function confirmPasswordReset(params: {
  token: string;
  newPassword: string;
  newPasswordConfirm: string;
}): Promise<void> {
  await userApiClient.post<ApiResponse<null>>("/auth/email/password-reset/confirm", params);
}
