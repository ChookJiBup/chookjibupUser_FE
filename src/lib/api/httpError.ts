import { isAxiosError } from "axios";
import type { ApiErrorBody } from "./types";

/**
 * 백엔드 공통 응답 형식(ApiResponse)에서 사용자에게 보여줄 에러 메시지를 뽑아낸다.
 * 백엔드가 내려주는 메시지가 없으면(네트워크 오류 등) 기본 메시지로 대체한다.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = "요청 처리 중 오류가 발생했습니다.",
): string {
  if (isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.message ?? fallback;
  }
  return fallback;
}

export function getApiErrorCode(error: unknown): number | null {
  if (isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.code ?? null;
  }
  return null;
}

/** chookjibupUser_BE FEATURE_SPEC.md 4절 에러 코드 전체 목록. */
export const API_ERROR_CODE = {
  BAD_REQUEST: 40000,
  INVALID_REQUEST: 40001,
  AUTH_KAKAO_CODE_REQUIRED: 40002,
  UNAUTHORIZED: 40100,
  AUTH_TOKEN_INVALID: 40103,
  AUTH_TOKEN_EXPIRED: 40104,
  AUTH_KAKAO_LOGIN_FAILED: 40105,
  FORBIDDEN: 40300,
  USER_NOT_FOUND: 40401,
  FESTIVAL_NOT_FOUND: 40402,
  INTERNAL_SERVER_ERROR: 50000,
} as const;

const AUTH_EXPIRED_CODES: number[] = [
  API_ERROR_CODE.UNAUTHORIZED,
  API_ERROR_CODE.AUTH_TOKEN_INVALID,
  API_ERROR_CODE.AUTH_TOKEN_EXPIRED,
];

/** 로그인이 풀려서(만료/위조/미인증) 다시 로그인해야 하는 에러인지. */
export function isAuthExpiredError(error: unknown): boolean {
  const code = getApiErrorCode(error);
  return code !== null && AUTH_EXPIRED_CODES.includes(code);
}
