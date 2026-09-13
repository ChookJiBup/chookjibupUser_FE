import { userApiClient } from "@/lib/api/userApiClient";
import type { ApiResponse } from "@/lib/api/types";

export interface FindEmailRequest {
  nickname: string;
  /** "YYYY-MM-DD" 형식 (input type="date" 값 그대로). */
  birthDate: string;
}

export interface FindEmailResponse {
  /** 개인정보 보호를 위해 일부를 가린 이메일 (예: ab***@gmail.com). */
  maskedEmail: string;
}

export async function findEmail(request: FindEmailRequest): Promise<FindEmailResponse> {
  const { data } = await userApiClient.post<ApiResponse<FindEmailResponse>>(
    "/auth/email/find-email",
    request,
  );
  return data.data;
}
